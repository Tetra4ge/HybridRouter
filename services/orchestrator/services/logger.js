import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.LOG_DB_DIR || path.join(process.cwd(), '..', '..', 'data', 'logs');
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = process.env.LOG_DB_PATH || path.join(DB_DIR, 'tasks.db');
const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    category TEXT NOT NULL,
    tier_used TEXT NOT NULL,
    model_used TEXT,
    solver_type TEXT,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    confidence REAL,
    was_escalated BOOLEAN DEFAULT 0,
    escalation_reason TEXT,
    answer TEXT,
    is_correct BOOLEAN,
    latency_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

const insertStmt = db.prepare(`
  INSERT INTO task_logs (
    task_id, category, tier_used, model_used, solver_type,
    prompt_tokens, completion_tokens, total_tokens,
    confidence, was_escalated, escalation_reason,
    answer, latency_ms
  ) VALUES (
    @taskId, @category, @tierUsed, @modelUsed, @solverType,
    @promptTokens, @completionTokens, @totalTokens,
    @confidence, @wasEscalated, @escalationReason,
    @answer, @latencyMs
  )
`);

export function logTask(entry) {
  insertStmt.run({
    taskId: entry.taskId,
    category: entry.category,
    tierUsed: entry.tierUsed,
    modelUsed: entry.modelUsed || null,
    solverType: entry.solverType || null,
    promptTokens: entry.promptTokens || 0,
    completionTokens: entry.completionTokens || 0,
    totalTokens: entry.totalTokens || 0,
    confidence: entry.confidence || null,
    wasEscalated: entry.wasEscalated ? 1 : 0,
    escalationReason: entry.escalationReason || null,
    answer: entry.answer || null,
    latencyMs: entry.latencyMs || null,
  });
}

export function getLastLogForTask(taskId) {
  try {
    const row = db.prepare('SELECT id, tier_used, model_used, prompt_tokens, completion_tokens, total_tokens, latency_ms FROM task_logs WHERE task_id = ? ORDER BY id DESC LIMIT 1').get(taskId);
    return row || { tier_used: 'unknown', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, latency_ms: 0 };
  } catch (err) {
    return { tier_used: 'unknown', prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, latency_ms: 0 };
  }
}

export function closeDatabase() {
  db.close();
}

export function updateTaskCorrectness(taskId, isCorrect) {
  try {
    const stmt = db.prepare(`
      UPDATE task_logs 
      SET is_correct = ? 
      WHERE id = (SELECT id FROM task_logs WHERE task_id = ? ORDER BY id DESC LIMIT 1)
    `);
    stmt.run(isCorrect ? 1 : 0, taskId);
  } catch (err) {
    console.error(`[Logger] Failed to update correctness for task ${taskId}:`, err.message);
  }
}

export function getRecentLogs(limit = 100) {
  try {
    return db.prepare(`
      SELECT id, task_id, category, tier_used, model_used, solver_type, 
             prompt_tokens, completion_tokens, total_tokens, confidence, 
             was_escalated, escalation_reason, answer, is_correct, latency_ms, created_at 
      FROM task_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(limit);
  } catch (err) {
    console.error('[Logger] Failed to get recent logs:', err.message);
    return [];
  }
}

export function getSystemStats() {
  try {
    const rows = db.prepare(`
      SELECT tier_used, model_used, prompt_tokens, completion_tokens, total_tokens, latency_ms, is_correct 
      FROM task_logs
    `).all();
    return calculateStatsFromRows(rows);
  } catch (err) {
    console.error('[Logger] Failed to get system stats:', err.message);
    return null;
  }
}

function calculateStatsFromRows(rows) {
  const totalRuns = rows.length;
  if (totalRuns === 0) {
    return {
      totalRuns: 0,
      accuracy: 0,
      totalTokens: 0,
      actualCost: 0,
      naiveCost: 0,
      savingsPercent: 0,
      tierCounts: {},
      avgLatency: 0,
      p95Latency: 0
    };
  }

  let correctCount = 0;
  let totalTokens = 0;
  let actualCost = 0;
  let naiveCost = 0;
  const latencies = [];
  const tierCounts = {
    'tier-0': 0,
    'tier-1': 0,
    'tier-1-verified': 0,
    'tier-2': 0,
    'tier-3': 0,
    'fallback': 0
  };

  // Cost factors
  const CHEAP_IN_COST = 0.20e-6;
  const CHEAP_OUT_COST = 0.20e-6;
  const STRONG_IN_COST = 1.74e-6;
  const STRONG_OUT_COST = 3.48e-6;

  rows.forEach(row => {
    if (row.is_correct === 1) correctCount++;
    totalTokens += row.total_tokens || 0;
    if (row.latency_ms) latencies.push(row.latency_ms);

    const tier = row.tier_used || 'unknown';
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;

    // Actual Cost
    let taskCost = 0;
    if (tier === 'tier-1-verified' || tier === 'tier-2') {
      taskCost = (row.prompt_tokens * CHEAP_IN_COST) + (row.completion_tokens * CHEAP_OUT_COST);
    } else if (tier === 'tier-3') {
      taskCost = (row.prompt_tokens * STRONG_IN_COST) + (row.completion_tokens * STRONG_OUT_COST);
    }
    actualCost += taskCost;

    // Naive Cost Estimation (All sent directly to Tier-3 Strong model without compression)
    const naivePrompt = 150;
    const naiveCompletion = row.completion_tokens || 120;
    const taskNaiveCost = (naivePrompt * STRONG_IN_COST) + (naiveCompletion * STRONG_OUT_COST);
    naiveCost += taskNaiveCost;
  });

  const sortedLats = [...latencies].sort((a, b) => a - b);
  const avgLatency = latencies.reduce((s, v) => s + v, 0) / latencies.length || 0;
  const p95Latency = sortedLats[Math.floor(sortedLats.length * 0.95)] || 0;

  return {
    totalRuns,
    accuracy: totalRuns > 0 ? (correctCount / totalRuns) * 100 : 0,
    totalTokens,
    actualCost,
    naiveCost,
    savingsPercent: naiveCost > 0 ? ((naiveCost - actualCost) / naiveCost) * 100 : 0,
    tierCounts,
    avgLatency,
    p95Latency
  };
}


