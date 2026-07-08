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
