# AGENTS.md — HybridRouter Project Instructions

> This file defines behavioral rules and conventions for any AI agent working on this codebase.

---

## Project Context

This is the **AMD Developer Hackathon 2026 — Track 1** submission: a **Hybrid Token-Efficient Routing Agent** that maximizes task-solving accuracy while minimizing Fireworks API token consumption.

**Scoring formula**: `Score = Accuracy - Token_Penalty` (only Fireworks tokens count; local model tokens are free).

---

## Architecture Rules

### Service Boundaries

- **Orchestrator** (`services/orchestrator/`) — Node.js + Express. Owns: task classification, routing logic, confidence gating, Fireworks client, caching, validation, output writing.
- **Local Model Server** (`services/local-model-server/`) — Python + FastAPI. Owns: model loading, inference, confidence scoring. Runs on AMD GPU via ROCm.
- **Dashboard** (`services/dashboard/`) — React + Vite. Owns: UI visualization only. **Never on the critical path for scoring.**

### Routing Order (non-negotiable)

Every task MUST flow through tiers in this exact order. Never skip tiers:

1. **Classifier** → categorize the task (zero cost, regex/heuristic)
2. **Tier-0: Deterministic Solver** → attempt code-based solution (zero tokens)
3. **Tier-1: Local LLM** → attempt local model solution with confidence score (zero Fireworks tokens)
4. **Tier-2: Cheap Fireworks Model** → escalate only if local confidence is low
5. **Tier-3: Strong Fireworks Model** → escalate only if cheap model confidence is also low

### Confidence Gating

- The confidence gate is the **most important component** for scoring optimization.
- Local model must return a confidence score (0.0–1.0) with every response.
- Default thresholds: `HIGH_CONFIDENCE = 0.85`, `MEDIUM_CONFIDENCE = 0.60`.
- Thresholds are **per-category** and tunable — never hardcode a single global threshold.

---

## Code Conventions

### Node.js (Orchestrator)

- Use ES Modules (`import/export`), not CommonJS.
- Use `async/await` for all async operations.
- Error handling: wrap every tier call in try/catch; on error, escalate to next tier, don't crash.
- Environment variables via `dotenv` — never hardcode API keys.
- Logging: use structured JSON logs with `{ task_id, tier, tokens_used, confidence, result_status }`.

### Python (Local Model Server)

- Use FastAPI with Pydantic models for request/response validation.
- Type hints everywhere — no untyped function signatures.
- Model loading: lazy-load on first request, not at import time.
- ROCm/GPU: use `torch` with `device="cuda"` (ROCm maps to CUDA API).

### React (Dashboard)

- Functional components with hooks only.
- State management: React Context or Zustand — no Redux.
- Build the dashboard LAST — it's not graded.

---

## Token Optimization Rules

1. **Never call Fireworks for tasks that code can solve.** Math, regex, parsing, structured extraction → deterministic solver, always.
2. **Compress prompts before sending to Fireworks.** Strip unnecessary context, few-shot examples, verbose instructions. Keep system prompts under 100 tokens.
3. **Set `max_tokens` per category.** Classification tasks: 10 tokens. Short-answer: 50. Code generation: 300. Never use default max.
4. **Cache answers by task hash.** If the same or very similar task appears again, return cached result. Use SHA-256 hash of normalized task text.
5. **Prefer verification over generation.** If local model gave an answer, ask Fireworks "Is this correct? Yes/No" (5 tokens) instead of regenerating from scratch (200+ tokens).
6. **Self-consistency is cheaper than escalation.** Sample local model 2-3 times; if answers agree, accept with high confidence. This avoids Fireworks calls entirely.

---

## File & Output Conventions

### Input/Output Contract

```
Input:  /input/tasks.json    (array of task objects)
Output: /output/results.json (array of result objects matching expected schema)
```

- Always validate output schema before writing.
- Never write partial results — write the complete array atomically.
- Log every task's tier, tokens, confidence, and correctness to SQLite.

### Environment Variables

```env
FIREWORKS_API_KEY=<your-key>
FIREWORKS_BASE_URL=https://api.fireworks.ai/inference/v1
LOCAL_MODEL_URL=http://localhost:8000
HIGH_CONFIDENCE_THRESHOLD=0.85
MEDIUM_CONFIDENCE_THRESHOLD=0.60
ENABLE_CACHE=true
ENABLE_DASHBOARD=false
LOG_LEVEL=info
```

---

## Testing Requirements

- Before every commit, run the local eval harness: `npm run evaluate` in `services/orchestrator/`.
- Track two metrics on every change: **accuracy** and **total Fireworks tokens**.
- If accuracy drops below baseline, revert.
- If tokens increase without accuracy gain, revert.

---

## Docker Rules

- All services must run via `docker compose up --build`.
- The scoring container must work **headlessly** — no interactive prompts, no GUI dependency.
- Local model server must detect AMD GPU and fall back to CPU gracefully.
- Container must read `/input/tasks.json` and write `/output/results.json` without any user intervention.

---

## Documentation

- Keep `README.md` links accurate — if you move a file, update all references.
- Every new module must have a JSDoc/docstring header explaining its purpose.
- Phase docs in `phases/` track implementation progress — update them as tasks complete.
- Technical docs in `docs/` are reference material — keep them accurate and detailed.

---

## Priority Order

When making any decision, prioritize in this order:

1. **Accuracy** — must clear the threshold
2. **Token efficiency** — minimize Fireworks tokens
3. **Code quality** — clean, maintainable, well-documented
4. **Performance** — fast execution within the container
5. **UI polish** — nice to have, not graded
