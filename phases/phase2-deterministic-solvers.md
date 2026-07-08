# Phase 2: Deterministic Solvers (Tier-0)

> Implement code-based solvers for math, parsing, and extraction — zero tokens, near-perfect accuracy.

---

## Prerequisites

- [x] Phase 1 complete (classifier, router skeleton, logging)

---

## Objectives

- [ ] Implement math solver (arithmetic, algebra, percentages, statistics)
- [ ] Implement parsing solver (emails, URLs, dates, phone numbers)
- [ ] Implement text solver (counting, sorting, string operations)
- [ ] Implement data solver (JSON queries, basic data manipulation)
- [ ] Register all solvers in the deterministic solver registry
- [ ] Integrate into router.js as the first solving tier
- [ ] Write test cases for each solver
- [ ] Measure Tier-0 coverage on the eval benchmark

---

## Deliverables

### 1. Math Solver

**Dependencies:** `mathjs` (or `math-expression-evaluator`)

```bash
cd services/orchestrator && npm install mathjs
```

**Capabilities:**
- Arithmetic: `5 + 3 * 2`, `15 % of 230`
- Roots: `square root of 144`
- Powers: `2^10`
- Statistics: `average of 10, 20, 30`
- Unit conversion: basic conversions
- Equation solving: `solve x + 5 = 12`

**Implementation:** See [Tier-0 Deterministic Solvers docs](../docs/tier0-deterministic-solvers.md#math-solver)

### 2. Parsing Solver

**No external dependencies** — pure regex.

**Capabilities:**
- Extract emails from text
- Extract URLs from text
- Extract dates from text
- Extract phone numbers from text
- Count occurrences of patterns

### 3. Text Solver

**Capabilities:**
- Word/character counting
- Sorting lists alphabetically or numerically
- String reversal, uppercase, lowercase
- Finding longest/shortest word

### 4. Data Solver

**Capabilities:**
- Parse embedded JSON in task content
- Count items matching criteria
- Extract specific fields
- Simple filtering

### 5. Solver Registry

```javascript
// services/orchestrator/src/solvers/deterministic.js

export const DETERMINISTIC_SOLVERS = [
  mathSolver,
  parsingSolver,
  textSolver,
  dataSolver,
];

export function tryDeterministicSolve(task, category) {
  for (const solver of DETERMINISTIC_SOLVERS) {
    if (solver.canSolve(task, category)) {
      const result = solver.solve(task);
      if (result && result.confidence >= 0.9) {
        return result;
      }
    }
  }
  return null;
}
```

### 6. Router Integration

Update `router.js` to call Tier-0 before any LLM:

```javascript
async function solveTask(task) {
  const category = classify(task);
  
  // Tier 0: try deterministic solver first
  const deterministicResult = tryDeterministicSolve(task, category);
  if (deterministicResult) {
    logTask({ ...deterministicResult, tierUsed: 'tier-0' });
    return deterministicResult;
  }
  
  // ... continue to Tier 1
}
```

---

## Test Cases

### Math

| Input | Expected | Solver |
|-------|----------|--------|
| "What is 5 + 3?" | "8" | math |
| "Calculate 15% of 230" | "34.5" | math |
| "Square root of 144" | "12" | math |
| "What is 2^10?" | "1024" | math |
| "Average of 10, 20, 30, 40" | "25" | math |

### Parsing

| Input | Expected | Solver |
|-------|----------|--------|
| "Extract emails: john@example.com and jane@test.org" | "john@example.com, jane@test.org" | parsing |
| "Find URLs in: Visit https://google.com" | "https://google.com" | parsing |

### Text

| Input | Expected | Solver |
|-------|----------|--------|
| "How many words in 'the quick brown fox'?" | "4" | text |
| "Sort alphabetically: banana, apple, cherry" | "apple, banana, cherry" | text |

---

## Acceptance Criteria

- [ ] Math solver handles 90%+ of arithmetic/algebra tasks
- [ ] Parsing solver correctly extracts emails, URLs, dates
- [ ] Text solver handles counting and sorting
- [ ] Router tries Tier-0 before any LLM call
- [ ] 0 Fireworks tokens used for Tier-0 tasks
- [ ] All test cases pass

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/orchestrator/src/solvers/deterministic.js` | NEW | Solver registry + all solvers |
| `services/orchestrator/src/router.js` | MODIFY | Add Tier-0 before LLM |
| `eval/benchmark.json` | NEW | Test cases for solvers |
| `eval/eval_runner.js` | NEW | Automated test runner |

---

## Metrics Target

| Metric | Target |
|--------|--------|
| Tier-0 coverage (% tasks solved by code) | > 25% |
| Tier-0 accuracy | > 95% |
| Fireworks tokens from Tier-0 tasks | 0 |

---

## Next Phase

→ [Phase 3: Local Model Server](phase3-local-model-server.md) — Set up Gemma/Qwen on AMD GPU
