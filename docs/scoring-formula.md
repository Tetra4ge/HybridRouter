# 🏆 Scoring Formula & Strategy

> Understanding the competition scoring and how our architecture optimizes for it.

---

## Competition Scoring

```
Score = Accuracy_Score - Token_Penalty

Where:
  Accuracy_Score = (correct_answers / total_tasks) * 100
  Token_Penalty  = total_fireworks_tokens * cost_multiplier
```

### Key Rules

| Rule | Implication |
|------|------------|
| Only Fireworks tokens count | Local model tokens are FREE — use them aggressively |
| Accuracy must clear a threshold | Optimizing tokens at the cost of accuracy is a losing strategy |
| Token penalty is continuous | Every single token costs you — no "free tier" |
| Scoring runs headlessly | Your container must work without UI or manual intervention |

---

## Our Optimization Strategy

### Priority 1: Accuracy Above Threshold

Before optimizing tokens, ensure accuracy clears the bar. The hierarchy:

```
1. Tier-0 deterministic solvers  → ~99% accuracy (math, parsing)
2. Tier-1 local model            → ~70-80% accuracy (general)
3. Tier-2 cheap Fireworks        → ~85-90% accuracy
4. Tier-3 strong Fireworks       → ~90-95% accuracy
```

### Priority 2: Minimize Fireworks Tokens

Token-saving tactics, ordered by impact:

| Tactic | Expected Token Savings | Difficulty |
|--------|----------------------|------------|
| Tier-0 deterministic solvers | 30-40% of all tokens | Low |
| Local model with confidence gate | 20-30% of remaining | Medium |
| Verify instead of generate | 80-90% per verification | Low |
| Prompt compression | 20-40% per Fireworks call | Low |
| Category-specific max_tokens | 10-30% per call | Low |
| Answer caching | Variable (depends on duplicates) | Low |
| Self-consistency (2-3 local samples) | 10-20% escalation reduction | Medium |

---

## Token Budget Allocation

### Per-Category Budget

```javascript
const TOKEN_BUDGET = {
  math:           { target: 0,    max: 50   },  // Should be solved by code
  parsing:        { target: 0,    max: 30   },  // Should be solved by code
  classification: { target: 5,    max: 50   },  // Short answers
  factual:        { target: 50,   max: 200  },  // Medium answers
  creative:       { target: 100,  max: 300  },  // Longer generation
  code:           { target: 150,  max: 500  },  // Code blocks
  logic:          { target: 100,  max: 500  },  // Step-by-step
  multi_step:     { target: 200,  max: 1000 },  // Complex tasks
};
```

### Expected Distribution

Assuming 100 tasks:

| Category | Tasks | Solved by Code | Solved Locally | Fireworks Calls | Tokens |
|----------|-------|---------------|---------------|----------------|--------|
| Math | 15 | 15 | 0 | 0 | 0 |
| Parsing | 10 | 10 | 0 | 0 | 0 |
| Classification | 10 | 0 | 8 | 2 | 20 |
| Factual | 20 | 0 | 14 | 6 | 600 |
| Creative | 10 | 0 | 5 | 5 | 750 |
| Code | 15 | 0 | 9 | 6 | 1500 |
| Logic | 10 | 0 | 6 | 4 | 1200 |
| Multi-step | 10 | 0 | 4 | 6 | 3000 |
| **TOTAL** | **100** | **25** | **46** | **29** | **~7,070** |

**71% of tasks solved with zero Fireworks tokens.**

---

## Local Eval Harness

### Setup

```bash
# Create a mini-benchmark with labeled answers
# eval/benchmark.json format:
[
  {
    "id": "eval_001",
    "content": "What is 15% of 230?",
    "expected_answer": "34.5",
    "category": "math"
  },
  ...
]
```

### Running

```bash
# Run full evaluation
npm run evaluate

# Output:
# ┌─────────────┬──────────┬────────┬──────────────┐
# │ Category    │ Accuracy │ Tokens │ Avg Tokens   │
# ├─────────────┼──────────┼────────┼──────────────┤
# │ math        │ 100%     │ 0      │ 0            │
# │ factual     │ 85%      │ 1200   │ 60           │
# │ code        │ 80%      │ 3000   │ 200          │
# │ ...         │ ...      │ ...    │ ...          │
# └─────────────┴──────────┴────────┴──────────────┘
# Score: 87.5 - 4.2 = 83.3
```

### Before Every Change

```bash
# 1. Run eval
npm run evaluate > eval/baseline.txt

# 2. Make your change

# 3. Run eval again
npm run evaluate > eval/after.txt

# 4. Compare
diff eval/baseline.txt eval/after.txt

# Rules:
# - If accuracy drops → revert
# - If tokens increase without accuracy gain → revert
# - If both improve → commit
```

---

## Competitive Analysis

### What Most Teams Do

```
Local model → Fireworks fallback (binary, no nuance)
```

### What We Do Differently

```
Classifier → Deterministic Code → Local Model → Confidence Gate →
  → Verify (5 tokens) or Generate Cheap (50 tokens) or Generate Strong (300 tokens)
```

### Our Advantages

1. **Tier-0 solvers** absorb 25-40% of tasks at zero cost (most teams skip this)
2. **Verification mode** costs 90% less than generation
3. **Multi-signal confidence** (consistency + hedging + length) is more reliable than single-score
4. **Per-category thresholds** let us be aggressive for easy categories and conservative for hard ones
5. **Token budgets** prevent runaway spending on any single task

---

## Related Documents

- [🔒 Confidence Gating](confidence-gating.md) — The key differentiator logic
- [📊 Token Tracking](token-tracking.md) — How we measure and tune
- [🏗️ Architecture](architecture.md) — System design
