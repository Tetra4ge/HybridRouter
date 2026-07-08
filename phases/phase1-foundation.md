# Phase 1: Foundation & Classifier

> Project scaffolding, service setup, and the zero-cost task classifier.

---

## Objectives

- [ ] Initialize project structure (monorepo with services/)
- [ ] Set up Node.js orchestrator with Express
- [ ] Set up Python local model server with FastAPI (skeleton)
- [ ] Implement the regex/heuristic task classifier
- [ ] Create basic routing skeleton (router.js)
- [ ] Set up SQLite logging (schema + basic inserts)
- [ ] Create `.env.example` with all environment variables
- [ ] Write basic `main.js` entry point (read tasks.json → process → write results.json)

---

## Deliverables

### 1. Project Scaffolding

```bash
# Initialize orchestrator
mkdir -p services/orchestrator/src/solvers
cd services/orchestrator
npm init -y
npm install express dotenv better-sqlite3 openai

# Initialize local model server
mkdir -p services/local-model-server
cd services/local-model-server
# Create requirements.txt: fastapi, uvicorn, torch, transformers, pydantic

# Initialize dashboard (optional, later)
mkdir -p services/dashboard
```

### 2. Classifier Implementation

Create `services/orchestrator/src/classifier.js` with:

- 8 category constants: `math`, `code`, `factual`, `logic`, `parsing`, `classification`, `creative`, `multi_step`
- Regex pattern libraries for each category (see [Classifier docs](../docs/classifier.md))
- `classify(task)` function that returns `{ category, confidence, method }`
- Fallback to 'factual' for ambiguous tasks

### 3. Router Skeleton

Create `services/orchestrator/src/router.js` with:

- `solveTask(task)` function that:
  1. Calls `classify(task)`
  2. Logs the classification
  3. Returns a placeholder answer (for now)

### 4. Main Entry Point

Create `services/orchestrator/main.js`:

```javascript
// Read /input/tasks.json
// Process each task through router
// Write /output/results.json
```

### 5. SQLite Setup

Create `services/orchestrator/src/logger.js`:

- Initialize SQLite database
- Create `task_logs` table (see [Token Tracking docs](../docs/token-tracking.md))
- Export `logTask()` function

---

## Acceptance Criteria

- [ ] `node main.js` reads tasks.json and writes results.json (even with placeholder answers)
- [ ] Classifier correctly categorizes at least 80% of test cases
- [ ] SQLite logging writes entries for each processed task
- [ ] Project structure matches the spec in README.md

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/orchestrator/package.json` | NEW | Node.js project config |
| `services/orchestrator/main.js` | NEW | Entry point |
| `services/orchestrator/src/classifier.js` | NEW | Task classifier |
| `services/orchestrator/src/router.js` | NEW | Routing skeleton |
| `services/orchestrator/src/logger.js` | NEW | SQLite logger |
| `services/orchestrator/src/server.js` | NEW | Express API server |
| `services/local-model-server/main.py` | NEW | FastAPI skeleton |
| `services/local-model-server/requirements.txt` | NEW | Python deps |
| `.env.example` | NEW | Environment template |

---

## Testing

```bash
# Create a test tasks.json
echo '[{"id":"test_001","content":"What is 5 + 3?"}]' > input/tasks.json

# Run
cd services/orchestrator && node main.js

# Verify output
cat output/results.json
```

---

## Next Phase

→ [Phase 2: Deterministic Solvers](phase2-deterministic-solvers.md) — Implement Tier-0 code solvers
