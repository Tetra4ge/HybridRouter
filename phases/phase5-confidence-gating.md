# Phase 5: Confidence Gating

> The key differentiator — multi-signal confidence scoring and smart escalation logic.

---

## Prerequisites

- [x] Phase 3 complete (local model returns answers + confidence)
- [x] Phase 4 complete (Fireworks client works)

---

## Objectives

- [x] Implement multi-signal confidence scoring (consistency + hedging + length)
- [x] Create per-category threshold configuration
- [x] Implement 4-action decision logic (ACCEPT / VERIFY / GENERATE_CHEAP / GENERATE_STRONG)
- [x] Wire confidence gate into router.js between Tier-1 and Tier-2
- [x] Add verification mode (ask Fireworks "Is this correct?" instead of regenerating)
- [x] Create threshold tuning script
- [x] Run eval to find optimal thresholds per category


---

## Deliverables

### 1. Confidence Module

```javascript
// services/orchestrator/src/confidence.js

export function computeConfidence(answer, samples, category) {
  const consistency = selfConsistencyScore(samples);
  const hedging = hedgingScore(answer);
  const length = lengthScore(answer, category);
  
  const weights = CATEGORY_WEIGHTS[category];
  
  return (
    weights.consistency * consistency +
    weights.hedging * hedging +
    weights.length * length
  );
}

export function decideAction(confidence, category) {
  const t = THRESHOLDS[category];
  if (confidence >= t.high)   return 'ACCEPT_LOCAL';
  if (confidence >= t.medium) return 'VERIFY_FIREWORKS';
  if (confidence >= t.low)    return 'GENERATE_CHEAP';
  return 'GENERATE_STRONG';
}
```

See [Confidence Gating docs](../docs/confidence-gating.md) for full implementation.

### 2. Per-Category Thresholds

```javascript
const THRESHOLDS = {
  math:           { high: 0.90, medium: 0.70, low: 0.40 },
  code:           { high: 0.85, medium: 0.60, low: 0.35 },
  factual:        { high: 0.80, medium: 0.55, low: 0.30 },
  logic:          { high: 0.90, medium: 0.70, low: 0.40 },
  classification: { high: 0.80, medium: 0.55, low: 0.30 },
  creative:       { high: 0.70, medium: 0.50, low: 0.30 },
  parsing:        { high: 0.90, medium: 0.70, low: 0.40 },
  multi_step:     { high: 0.85, medium: 0.60, low: 0.35 },
};
```

### 3. Router Integration

```javascript
// router.js — updated solve flow

async function solveTask(task) {
  const category = classify(task);
  
  // Tier 0
  const codeResult = tryDeterministicSolve(task, category);
  if (codeResult) return codeResult;
  
  // Tier 1 + Confidence Gate
  const { answer, samples } = await solveWithLocalModel(task);
  const confidence = computeConfidence(answer, samples, category);
  const action = decideAction(confidence, category);
  
  switch (action) {
    case 'ACCEPT_LOCAL':
      return { answer, confidence, tier: 'tier-1', tokens: 0 };
    
    case 'VERIFY_FIREWORKS':
      const verification = await verifyAnswer(answer, task, category);
      if (verification.verified) {
        return { answer, confidence, tier: 'tier-1-verified', tokens: verification.tokensUsed };
      }
      // Verification failed → generate cheap
      // falls through
    
    case 'GENERATE_CHEAP':
      return await solveWithFireworks(task, category, 'cheap');
    
    case 'GENERATE_STRONG':
      return await solveWithFireworks(task, category, 'strong');
  }
}
```

### 4. Threshold Tuning Script

```javascript
// eval/tune_thresholds.js

const CONFIGS = [
  { high: 0.90, medium: 0.70, low: 0.40 },
  { high: 0.85, medium: 0.65, low: 0.35 },
  { high: 0.80, medium: 0.60, low: 0.30 },
  { high: 0.75, medium: 0.55, low: 0.25 },
];

for (const config of CONFIGS) {
  const result = await runBenchmark(config);
  console.log(`${JSON.stringify(config)} → Accuracy: ${result.accuracy}%, Tokens: ${result.tokens}`);
}
```

---

## Testing

### Confidence Signal Tests

```javascript
// Test: 3 identical samples → high consistency
assert(selfConsistencyScore(['Paris', 'Paris', 'Paris']) === 1.0);

// Test: Mixed samples → low consistency
assert(selfConsistencyScore(['Paris', 'London', 'Berlin']) === 0.33);

// Test: Hedging language → low confidence
assert(hedgingScore('I think maybe the answer is Paris') < 0.5);

// Test: Direct answer → high confidence
assert(hedgingScore('Paris') === 1.0);
```

### Escalation Tests

```javascript
// Test: High confidence → accept local
assert(decideAction(0.92, 'factual') === 'ACCEPT_LOCAL');

// Test: Medium confidence → verify
assert(decideAction(0.65, 'factual') === 'VERIFY_FIREWORKS');

// Test: Low confidence → generate cheap
assert(decideAction(0.40, 'factual') === 'GENERATE_CHEAP');

// Test: Very low confidence → generate strong
assert(decideAction(0.20, 'factual') === 'GENERATE_STRONG');
```

---

## Acceptance Criteria

- [ ] Multi-signal confidence works with 3 signals
- [ ] Per-category thresholds are configurable
- [ ] VERIFY action costs < 10 tokens on average
- [ ] Local accept rate > 50% on eval benchmark
- [ ] Escalation rate < 30% of total tasks
- [ ] Accuracy maintained or improved vs. no confidence gate

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/orchestrator/src/confidence.js` | NEW | Confidence scoring module |
| `services/orchestrator/src/router.js` | MODIFY | Integrate confidence gate |
| `eval/tune_thresholds.js` | NEW | Threshold tuning script |

---

## Metrics Target

| Metric | Target |
|--------|--------|
| Local accept rate | > 50% |
| Verify rate | 15-25% |
| Cheap generate rate | 15-25% |
| Strong generate rate | < 10% |
| Avg Fireworks tokens per task | < 100 |

---

## Next Phase

→ [Phase 6: Token Optimization](phase6-token-optimization.md) — Caching, budgets, compression
