# 📊 Token Tracking & Logging

> SQLite-based analytics for per-tier token/accuracy tracking and threshold tuning.

---

## Overview

Every task processed by HybridRouter is logged with full metadata: which tier handled it, how many tokens were consumed, the confidence score, and whether the answer was correct. This data is essential for:

1. **Threshold tuning** — adjust confidence thresholds based on real performance
2. **Token budgeting** — identify categories that spend the most tokens
3. **Self-evaluation** — calculate your competition score locally before submitting
4. **Debugging** — trace why specific tasks were escalated

---

## SQLite Schema

```sql
-- Create the main logging table
CREATE TABLE IF NOT EXISTS task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    category TEXT NOT NULL,
    tier_used TEXT NOT NULL,         -- 'tier-0', 'tier-1', 'tier-2', 'tier-3'
    model_used TEXT,                 -- null for tier-0, model name for others
    solver_type TEXT,                -- 'deterministic/math', 'local/gemma-2b', etc.
    
    -- Token tracking (Fireworks only)
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    
    -- Confidence & quality
    confidence REAL,
    was_escalated BOOLEAN DEFAULT 0,
    escalation_reason TEXT,
    
    -- Result
    answer TEXT,
    is_correct BOOLEAN,             -- Filled in during eval
    
    -- Performance
    latency_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_category ON task_logs(category);
CREATE INDEX IF NOT EXISTS idx_tier ON task_logs(tier_used);
CREATE INDEX IF NOT EXISTS idx_created ON task_logs(created_at);
```

---

## Logger Module

```javascript
// logger.js

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.LOG_DB_PATH || path.join(process.cwd(), 'data', 'logs', 'tasks.db');
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
    answer: entry.answer,
    latencyMs: entry.latencyMs || null,
  });
}
```

---

## Analytics Queries

### Token Usage Summary

```sql
-- Total tokens by tier
SELECT tier_used, SUM(total_tokens) as total, COUNT(*) as tasks
FROM task_logs
GROUP BY tier_used;

-- Total tokens by category
SELECT category, SUM(total_tokens) as total, COUNT(*) as tasks
FROM task_logs
GROUP BY category
ORDER BY total DESC;
```

### Tier Distribution

```sql
-- What percentage of tasks go to each tier?
SELECT 
  tier_used,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM task_logs), 1) as pct
FROM task_logs
GROUP BY tier_used;
```

### Escalation Analysis

```sql
-- Which categories escalate the most?
SELECT 
  category,
  SUM(CASE WHEN was_escalated THEN 1 ELSE 0 END) as escalated,
  COUNT(*) as total,
  ROUND(100.0 * SUM(CASE WHEN was_escalated THEN 1 ELSE 0 END) / COUNT(*), 1) as escalation_rate
FROM task_logs
GROUP BY category
ORDER BY escalation_rate DESC;
```

### Accuracy by Tier

```sql
-- How accurate is each tier?
SELECT
  tier_used,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
  COUNT(*) as total,
  ROUND(100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy
FROM task_logs
WHERE is_correct IS NOT NULL
GROUP BY tier_used;
```

### Score Calculation

```sql
-- Calculate approximate competition score
SELECT
  ROUND(100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / COUNT(*), 2) as accuracy_score,
  SUM(total_tokens) as total_fireworks_tokens,
  COUNT(*) as total_tasks
FROM task_logs;
```

---

## Dashboard Integration

The SQLite database is read by the React dashboard to display:

- **Real-time token meter** — bar chart of tokens by tier
- **Category breakdown** — pie chart of task distribution
- **Escalation tracker** — which tasks were escalated and why
- **Score estimator** — running estimate of competition score

### API Endpoints (Orchestrator)

```
GET /api/stats/summary       → Overall stats (tokens, accuracy, tier distribution)
GET /api/stats/by-category   → Stats grouped by task category
GET /api/stats/by-tier       → Stats grouped by solving tier
GET /api/stats/recent        → Most recent 50 task logs
GET /api/stats/score         → Estimated competition score
```

---

## Related Documents

- [🔒 Confidence Gating](confidence-gating.md) — What generates escalation decisions
- [🏆 Scoring Formula](scoring-formula.md) — How tokens affect your score
- [🏗️ Architecture](architecture.md) — Where logging fits in the system
