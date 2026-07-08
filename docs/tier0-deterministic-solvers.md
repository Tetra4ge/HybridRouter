# ⚡ Tier-0: Deterministic Solvers

> Code-based solvers that handle tasks with zero LLM tokens and perfect accuracy.

---

## Overview

Tier-0 solvers are the **single biggest token saver** in the system. Any task that can be solved by code (math calculations, text parsing, structured extraction) should **never** touch an LLM — local or cloud. This tier absorbs an estimated 30–40% of all tasks.

### Why This Matters

| Approach | Tokens Used | Accuracy | Latency |
|----------|------------|----------|---------|
| Fireworks LLM call | 50–500 | ~90% | 500ms+ |
| Local LLM call | 0 (Fireworks) | ~85% | 200ms+ |
| **Code solver** | **0** | **~99%** | **<5ms** |

Code solvers are faster, more accurate, AND free. There is no reason to use an LLM for tasks code can handle.

---

## Solver Registry

### Math Solver

Handles arithmetic, algebra, percentages, statistics, and basic calculus.

```javascript
// solvers/deterministic.js

import { evaluate } from 'mathjs';  // or SymPy via Python subprocess

const mathSolver = {
  canSolve(task, category) {
    return category === 'math';
  },
  
  solve(task) {
    const expression = extractMathExpression(task.content);
    if (!expression) return null;
    
    try {
      const result = evaluate(expression);
      return {
        answer: String(result),
        confidence: 1.0,
        solver: 'deterministic/math',
        tokens: 0
      };
    } catch (e) {
      return null; // Escalate to Tier-1
    }
  }
};
```

#### Supported Operations

| Operation | Example Input | Expected Output |
|-----------|--------------|-----------------|
| Arithmetic | "What is 15 * 23 + 7?" | `352` |
| Percentages | "What is 15% of 230?" | `34.5` |
| Square roots | "Square root of 144" | `12` |
| Factorials | "5 factorial" | `120` |
| Statistics | "Average of 10, 20, 30" | `20` |
| Unit conversion | "Convert 5 km to miles" | `3.107` |
| Equations | "Solve x + 5 = 12" | `x = 7` |

#### Expression Extraction

```javascript
function extractMathExpression(text) {
  // Pattern 1: Direct expression "5 + 3 * 2"
  const directMatch = text.match(/[\d\.\s\+\-\*\/\(\)\^%]+/);
  
  // Pattern 2: Word problems "What is 15 percent of 230"
  const percentMatch = text.match(/(\d+)\s*(?:percent|%)\s*of\s*(\d+)/i);
  if (percentMatch) return `${percentMatch[1]} / 100 * ${percentMatch[2]}`;
  
  // Pattern 3: "Square root of X"
  const sqrtMatch = text.match(/square root of\s*(\d+)/i);
  if (sqrtMatch) return `sqrt(${sqrtMatch[1]})`;
  
  // ... more patterns
  
  return directMatch?.[0] || null;
}
```

---

### Parsing/Extraction Solver

Handles text extraction, pattern matching, and format conversion.

```javascript
const parsingSolver = {
  canSolve(task, category) {
    return category === 'parsing';
  },
  
  solve(task) {
    const text = task.content;
    
    // Email extraction
    if (/extract.*email/i.test(text)) {
      const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
      return { answer: emails.join(', '), confidence: 1.0, solver: 'deterministic/regex', tokens: 0 };
    }
    
    // URL extraction
    if (/extract.*url/i.test(text)) {
      const urls = text.match(/https?:\/\/[^\s]+/g) || [];
      return { answer: urls.join(', '), confidence: 1.0, solver: 'deterministic/regex', tokens: 0 };
    }
    
    // Date extraction
    if (/extract.*date/i.test(text)) {
      const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) || [];
      return { answer: dates.join(', '), confidence: 1.0, solver: 'deterministic/regex', tokens: 0 };
    }
    
    // Phone number extraction
    if (/extract.*phone/i.test(text)) {
      const phones = text.match(/[\+]?[\d\-\(\)\s]{7,15}/g) || [];
      return { answer: phones.join(', '), confidence: 1.0, solver: 'deterministic/regex', tokens: 0 };
    }
    
    return null; // Escalate
  }
};
```

---

### String/Text Solver

Handles counting, sorting, and basic text manipulation.

```javascript
const textSolver = {
  canSolve(task, category) {
    return /\b(count|how many|sort|reverse|uppercase|lowercase|length)\b/i.test(task.content);
  },
  
  solve(task) {
    const text = task.content;
    
    // Word count
    if (/how many words/i.test(text)) {
      const targetText = extractQuotedText(text);
      const count = targetText.split(/\s+/).length;
      return { answer: String(count), confidence: 1.0, solver: 'deterministic/text', tokens: 0 };
    }
    
    // Character count
    if (/how many characters/i.test(text)) {
      const targetText = extractQuotedText(text);
      return { answer: String(targetText.length), confidence: 1.0, solver: 'deterministic/text', tokens: 0 };
    }
    
    // Sorting
    if (/sort.*(?:alphabetically|numerically)/i.test(text)) {
      const items = extractList(text);
      const sorted = items.sort((a, b) => a.localeCompare(b));
      return { answer: sorted.join(', '), confidence: 1.0, solver: 'deterministic/text', tokens: 0 };
    }
    
    return null;
  }
};
```

---

### JSON/Data Solver

Handles structured data queries.

```javascript
const dataSolver = {
  canSolve(task, category) {
    return /\b(json|csv|count.*in|filter|find.*where)\b/i.test(task.content);
  },
  
  solve(task) {
    try {
      const jsonData = extractJSON(task.content);
      if (!jsonData) return null;
      
      // Process data queries
      // ... field extraction, filtering, counting
      
      return { answer: result, confidence: 1.0, solver: 'deterministic/data', tokens: 0 };
    } catch (e) {
      return null;
    }
  }
};
```

---

## Solver Registration

```javascript
// solvers/deterministic.js — export

const DETERMINISTIC_SOLVERS = [
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
  return null; // No deterministic solver succeeded → escalate to Tier-1
}
```

---

## Adding New Solvers

1. Create a solver object with `canSolve(task, category)` and `solve(task)` methods.
2. Add it to the `DETERMINISTIC_SOLVERS` array.
3. Add test cases to `eval/benchmark.json`.
4. Run `npm run eval:tier0` to verify accuracy.

---

## Related Documents

- [🏷️ Classifier](classifier.md) — How tasks reach Tier-0
- [🧠 Tier-1 Local Model](tier1-local-model.md) — What happens when Tier-0 can't solve
- [🏆 Scoring Formula](scoring-formula.md) — Why zero tokens matters
