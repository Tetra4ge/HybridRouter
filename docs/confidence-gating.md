# 🔒 Confidence Gating

> The key differentiator — smart escalation logic that separates leaderboard rank at the margin.

---

## Overview

Confidence gating is the **single most important module** for competition scoring. It decides whether to:

- ✅ **Accept** the local model's answer (zero Fireworks tokens)
- 🔄 **Verify** the local answer via a cheap Fireworks call (~5 tokens)
- ⬆️ **Escalate** to a Fireworks model for full generation (~50-500 tokens)

A naive approach uses a single global threshold. **Our approach uses category-specific, dynamically tuned thresholds** with multiple confidence signals.

---

## Confidence Signals

### Signal 1: Self-Consistency (Primary)

Sample the local model 2-3 times and measure agreement:

```javascript
function selfConsistencyConfidence(samples) {
  const normalized = samples.map(s => normalize(s));
  const groups = groupBy(normalized);
  const largest = Math.max(...Object.values(groups).map(g => g.length));
  return largest / samples.length;  // 1.0 = all agree, 0.33 = no agreement
}
```

| Agreement | Confidence | Action |
|-----------|-----------|--------|
| 3/3 agree | 1.0 | ✅ Accept |
| 2/3 agree | 0.67 | 🔄 Verify |
| 0 agree | 0.33 | ⬆️ Escalate |

### Signal 2: Answer Length Heuristic

Short, specific answers tend to be more reliable than long, hedging ones:

```javascript
function lengthConfidence(answer, category) {
  const expectedLengths = {
    math: { min: 1, max: 20 },
    classification: { min: 1, max: 10 },
    factual: { min: 5, max: 100 },
    code: { min: 20, max: 500 },
  };
  
  const range = expectedLengths[category] || { min: 5, max: 200 };
  const len = answer.length;
  
  if (len < range.min || len > range.max * 2) return 0.3;  // Suspicious
  if (len >= range.min && len <= range.max) return 0.8;     // Expected
  return 0.5;  // Okay
}
```

### Signal 3: Hedging Language Detection

If the model says "I think," "probably," "I'm not sure" — it's not confident:

```javascript
function hedgingConfidence(answer) {
  const HEDGE_PHRASES = [
    /\bI think\b/i, /\bprobably\b/i, /\bmaybe\b/i,
    /\bnot sure\b/i, /\bI believe\b/i, /\bpossibly\b/i,
    /\bmight be\b/i, /\bcould be\b/i, /\bI'm uncertain\b/i,
  ];
  
  const hedgeCount = HEDGE_PHRASES.filter(p => p.test(answer)).length;
  
  if (hedgeCount === 0) return 1.0;   // No hedging — confident
  if (hedgeCount === 1) return 0.6;   // Some hedging
  return 0.3;                          // Heavy hedging — escalate
}
```

### Signal 4: Self-Assessment Score

Ask the model to rate its own confidence:

```javascript
function parseConfidenceFromResponse(response) {
  const match = response.match(/confidence:\s*([\d.]+)/i);
  if (match) return parseFloat(match[1]);
  return 0.5; // Default if model doesn't rate itself
}
```

---

## Combined Confidence Score

Blend all signals with category-specific weights:

```javascript
function computeConfidence(answer, samples, category) {
  const consistency = selfConsistencyConfidence(samples);
  const length = lengthConfidence(answer, category);
  const hedging = hedgingConfidence(answer);
  
  const WEIGHTS = {
    math:           { consistency: 0.6, length: 0.2, hedging: 0.2 },
    code:           { consistency: 0.5, length: 0.2, hedging: 0.3 },
    factual:        { consistency: 0.5, length: 0.2, hedging: 0.3 },
    logic:          { consistency: 0.7, length: 0.1, hedging: 0.2 },
    classification: { consistency: 0.6, length: 0.3, hedging: 0.1 },
    creative:       { consistency: 0.3, length: 0.3, hedging: 0.4 },
    parsing:        { consistency: 0.7, length: 0.2, hedging: 0.1 },
    multi_step:     { consistency: 0.6, length: 0.1, hedging: 0.3 },
  };
  
  const w = WEIGHTS[category] || { consistency: 0.5, length: 0.2, hedging: 0.3 };
  
  return (
    w.consistency * consistency +
    w.length * length +
    w.hedging * hedging
  );
}
```

---

## Threshold Configuration

### Per-Category Thresholds

```javascript
const THRESHOLDS = {
  //                    accept_local   verify_only    escalate_to_strong
  math:           { high: 0.90,    medium: 0.70,    low: 0.40 },
  code:           { high: 0.85,    medium: 0.60,    low: 0.35 },
  factual:        { high: 0.80,    medium: 0.55,    low: 0.30 },
  logic:          { high: 0.90,    medium: 0.70,    low: 0.40 },
  classification: { high: 0.80,    medium: 0.55,    low: 0.30 },
  creative:       { high: 0.70,    medium: 0.50,    low: 0.30 },
  parsing:        { high: 0.90,    medium: 0.70,    low: 0.40 },
  multi_step:     { high: 0.85,    medium: 0.60,    low: 0.35 },
};
```

### Decision Logic

```javascript
function decideAction(confidence, category) {
  const t = THRESHOLDS[category];
  
  if (confidence >= t.high)   return 'ACCEPT_LOCAL';     // 0 Fireworks tokens
  if (confidence >= t.medium) return 'VERIFY_FIREWORKS';  // ~5 tokens
  if (confidence >= t.low)    return 'GENERATE_CHEAP';    // ~50-200 tokens
  return 'GENERATE_STRONG';                               // ~200-800 tokens
}
```

### Decision Flow

```
confidence >= high (e.g., 0.85)
   → ACCEPT_LOCAL (0 tokens)
   
confidence >= medium (e.g., 0.60)
   → VERIFY_FIREWORKS: ask cheap model "Is {local_answer} correct? YES/NO" (~5 tokens)
   → If YES: accept local answer
   → If NO: GENERATE_CHEAP
   
confidence >= low (e.g., 0.35)
   → GENERATE_CHEAP: ask cheap Fireworks model to solve from scratch (~100 tokens)
   
confidence < low
   → GENERATE_STRONG: ask strong Fireworks model (~300 tokens)
```

---

## Threshold Tuning

### How to Tune

1. Build a labeled mini-benchmark (50–100 tasks across all 8 categories)
2. Run the system with different thresholds
3. Log (accuracy, total_tokens) for each configuration
4. Find the Pareto-optimal point: highest accuracy at lowest tokens

### Tuning Script

```javascript
// eval/tune_thresholds.js

const configs = [
  { high: 0.90, medium: 0.70, low: 0.40 },
  { high: 0.85, medium: 0.60, low: 0.35 },
  { high: 0.80, medium: 0.50, low: 0.30 },
  // ... more configs
];

for (const config of configs) {
  const { accuracy, totalTokens } = await runBenchmark(config);
  console.log(`Config: ${JSON.stringify(config)} → Accuracy: ${accuracy}%, Tokens: ${totalTokens}`);
}
```

---

## Advanced: Smart Escalation Patterns

### Pattern 1: Verify Before Generate

```
Local answer (free) → Cheap verify (5 tokens) → If wrong, generate (100 tokens)
```

This is 90% cheaper than always generating, and only costs 5 extra tokens when the local answer is correct.

### Pattern 2: Self-Consistency + Majority Vote

```
3 local samples (free) → Majority vote → If 2/3 agree, accept → If 0/3 agree, escalate
```

This avoids Fireworks entirely when the local model is consistent.

### Pattern 3: Category-Specific Budget Caps

```
Even if confidence is low, never spend more than X tokens per category.
If the budget is exhausted, accept the best available answer.
```

---

## Metrics to Track

| Metric | Purpose | Target |
|--------|---------|--------|
| `local_accept_rate` | % of tasks accepted from local model | > 60% |
| `verify_rate` | % of tasks sent to verification | < 20% |
| `escalation_rate` | % of tasks escalated to full generation | < 20% |
| `strong_escalation_rate` | % of tasks needing Tier-3 | < 5% |
| `avg_tokens_per_task` | Mean Fireworks tokens per task | Minimize |
| `accuracy` | Overall correct answers | > threshold |

---

## Related Documents

- [🧠 Tier-1 Local Model](tier1-local-model.md) — Where confidence scores come from
- [☁️ Tier-2/3 Fireworks](tier2-tier3-fireworks.md) — What happens on escalation
- [📊 Token Tracking](token-tracking.md) — Logging escalation decisions
- [🏆 Scoring Formula](scoring-formula.md) — Why this matters
