# Phase 6: Token Optimization

> Caching, prompt compression, category budgets, and self-consistency — squeeze every token.

---

## Prerequisites

- [x] Phase 5 complete (confidence gating working)

---

## Objectives

- [ ] Implement answer caching (hash-based deduplication)
- [ ] Fine-tune prompt compression (system prompts, user prompts)
- [ ] Enforce category-specific token budget caps
- [ ] Optimize self-consistency: find optimal sample count
- [ ] Run full eval and compare tokens before vs after
- [ ] Tune confidence thresholds based on eval results

---

## Deliverables

### 1. Answer Caching

```javascript
// services/orchestrator/src/cache.js

import crypto from 'crypto';

const cache = new Map();

function hashTask(task) {
  const normalized = task.content.trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function getCached(task) {
  if (!process.env.ENABLE_CACHE) return null;
  const hash = hashTask(task);
  return cache.get(hash) || null;
}

export function setCache(task, result) {
  if (!process.env.ENABLE_CACHE) return;
  const hash = hashTask(task);
  cache.set(hash, {
    ...result,
    cached: true,
    cachedAt: Date.now(),
  });
}

export function getCacheStats() {
  return {
    size: cache.size,
    // Track hits/misses
  };
}
```

### 2. Router Integration (Cache)

```javascript
// In router.js — at the very start

async function solveTask(task) {
  // Check cache first
  const cached = getCached(task);
  if (cached) {
    logTask({ tierUsed: 'cache', tokens: 0 });
    return cached;
  }
  
  // ... normal routing ...
  
  // Cache the result before returning
  setCache(task, result);
  return result;
}
```

### 3. Token Budget Enforcement

```javascript
// In fireworksClient.js

const TOKEN_CAPS = {
  math: 20,
  code: 300,
  factual: 100,
  logic: 200,
  parsing: 50,
  classification: 10,
  creative: 200,
  multi_step: 400,
};

export function getMaxTokens(category) {
  return TOKEN_CAPS[category] || 200;
}
```

### 4. Self-Consistency Optimization

Test different sample counts:

| Samples | Local Latency | Confidence Accuracy | Token Savings |
|---------|--------------|--------------------|-|
| 1 | Fast | Low | None |
| 2 | Medium | Good | Moderate |
| **3** | **Medium** | **Best** | **Best** |
| 5 | Slow | Marginal gain | Same as 3 |

**Recommendation: 3 samples.** The marginal value of 4+ samples is rarely worth the latency.

### 5. Prompt Compression Audit

Review and minimize all prompts sent to Fireworks:

```
Before: "You are a helpful assistant. Please answer the following question carefully: {question}"
After:  "Q: {question}\nA:"

Savings: ~30 tokens per call
```

---

## Acceptance Criteria

- [ ] Caching works and avoids recomputation for identical tasks
- [ ] Token budget caps enforced for all categories
- [ ] Total Fireworks tokens reduced by 20%+ vs Phase 5
- [ ] Accuracy maintained or improved
- [ ] Cache stats available via API

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/orchestrator/src/cache.js` | NEW | Answer caching |
| `services/orchestrator/src/router.js` | MODIFY | Add cache checks |
| `services/orchestrator/src/solvers/fireworksClient.js` | MODIFY | Add token caps |

---

## Metrics Target

| Metric | Before | After |
|--------|--------|-------|
| Total Fireworks tokens (100 tasks) | ~9,000 | < 7,000 |
| Cache hit rate | 0% | 5-15% |
| Avg tokens per Fireworks call | 120 | < 80 |

---

## Next Phase

→ [Phase 7: Containerization](phase7-containerization.md) — Docker packaging & submission
