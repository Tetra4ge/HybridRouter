# 📚 Documentation Index

> Complete technical documentation for the HybridRouter project.

---

## Quick Navigation

| # | Document | What You'll Learn |
|---|----------|-------------------|
| 1 | [🏗️ Architecture](architecture.md) | System architecture, service interactions, data flow |
| 2 | [🏷️ Task Classifier](classifier.md) | How tasks are categorized into 8 types using regex/heuristics |
| 3 | [⚡ Tier-0 Deterministic Solvers](tier0-deterministic-solvers.md) | Code-based solvers for math, parsing, extraction |
| 4 | [🧠 Tier-1 Local Model Server](tier1-local-model.md) | FastAPI + ROCm model serving with confidence scoring |
| 5 | [☁️ Tier-2/3 Fireworks Escalation](tier2-tier3-fireworks.md) | Tiered Fireworks API calls, model selection strategy |
| 6 | [🔒 Confidence Gating](confidence-gating.md) | The key differentiator — smart escalation logic |
| 7 | [📊 Token Tracking & Logging](token-tracking.md) | SQLite analytics, per-tier token/accuracy tracking |
| 8 | [🐳 Containerization](containerization.md) | Docker setup, compose configuration, deployment |
| 9 | [🏆 Scoring Formula](scoring-formula.md) | Competition scoring, optimization strategy, budget planning |
| 10 | [🔌 API Reference](api-reference.md) | REST endpoints for all services |

---

## Reading Order

### For new team members

Start with **Architecture** → **Scoring Formula** → **Confidence Gating** to understand the system and why it's designed this way.

### For implementing a specific tier

Go directly to the relevant tier document (Tier-0, Tier-1, or Tier-2/3).

### For DevOps / Docker

See **Containerization** → **API Reference**.

---

## Architecture Diagram

![Architecture Overview](architecture_overview.png)

---

## Related

- [📅 Implementation Phases](../phases/README.md) — Step-by-step build plan
- [📋 Main README](../README.md) — Project overview and quick start
- [🤖 AGENTS.md](../AGENTS.md) — Agent behavioral rules
