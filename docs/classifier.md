# 🏷️ Task Classifier

> Zero-cost, regex/heuristic-based task classification engine.

---

## Overview

The classifier is the **first component** in the routing pipeline. It categorizes each incoming task into one of 8 categories, which determines the solving strategy. The classifier must be **fast** (< 1ms per task) and use **zero tokens** — it runs entirely on regex patterns and keyword matching.

---

## Task Categories

| Category | ID | Description | Primary Solver | Example |
|----------|-----|-------------|---------------|---------|
| **Math** | `math` | Arithmetic, algebra, calculus, equations | Tier-0 (SymPy/code) | "What is 15% of 230?" |
| **Code** | `code` | Code generation, debugging, explanation | Tier-1 (Local LLM) | "Write a Python function to..." |
| **Factual** | `factual` | Knowledge questions, definitions, facts | Tier-1 → Tier-2 | "What is the capital of France?" |
| **Logic** | `logic` | Puzzles, reasoning, deduction | Tier-1 → Tier-3 | "If all A are B, and..." |
| **Parsing** | `parsing` | Data extraction, format conversion | Tier-0 (Regex/code) | "Extract emails from this text" |
| **Classification** | `classification` | Categorize, label, sentiment analysis | Tier-1 (Local LLM) | "Is this review positive or negative?" |
| **Creative** | `creative` | Writing, brainstorming, summarization | Tier-2 (Fireworks) | "Write a haiku about..." |
| **Multi-step** | `multi_step` | Complex, multi-part reasoning | Tier-1 → Tier-3 | "First calculate X, then explain why..." |

---

## Classification Logic

### Rule-Based Classification (Priority Order)

The classifier applies rules in order; first match wins:

```javascript
// classifier.js — pseudocode

function classify(task) {
  const text = task.content.toLowerCase();
  
  // 1. Math detection
  if (containsMathPatterns(text)) return 'math';
  
  // 2. Code detection
  if (containsCodePatterns(text)) return 'code';
  
  // 3. Parsing/extraction detection
  if (containsParsingPatterns(text)) return 'parsing';
  
  // 4. Classification/labeling detection
  if (containsClassificationPatterns(text)) return 'classification';
  
  // 5. Logic/reasoning detection
  if (containsLogicPatterns(text)) return 'logic';
  
  // 6. Creative writing detection
  if (containsCreativePatterns(text)) return 'creative';
  
  // 7. Multi-step detection
  if (containsMultiStepPatterns(text)) return 'multi_step';
  
  // 8. Default: factual
  return 'factual';
}
```

### Pattern Libraries

#### Math Patterns

```javascript
const MATH_PATTERNS = [
  /\b\d+\s*[\+\-\*\/\%\^]\s*\d+/,          // arithmetic expressions
  /\bcalculat[e|ion]\b/i,                     // "calculate"
  /\bsolve\b.*\bequation\b/i,                // "solve equation"
  /\bwhat\s+is\s+\d+/i,                      // "what is 5..."
  /\b(sum|product|difference|quotient)\b/i,   // math operations
  /\b(square root|sqrt|factorial|log)\b/i,    // math functions
  /\b(percentage|percent|%)\b/i,              // percentages
  /\b(area|volume|perimeter|circumference)\b/i, // geometry
  /\b(mean|median|mode|average|std dev)\b/i,  // statistics
  /\b(derivative|integral|limit)\b/i,         // calculus
];
```

#### Code Patterns

```javascript
const CODE_PATTERNS = [
  /\b(write|create|implement|code|program)\b.*\b(function|class|method|script)\b/i,
  /\b(python|javascript|java|c\+\+|typescript|rust|go)\b/i,
  /```[\s\S]*```/,                             // code blocks
  /\b(debug|fix|refactor|optimize)\b.*\b(code|bug|error)\b/i,
  /\b(algorithm|data structure|sort|search)\b/i,
  /\b(API|endpoint|request|response)\b/i,
];
```

#### Parsing Patterns

```javascript
const PARSING_PATTERNS = [
  /\b(extract|parse|find all|list all)\b/i,
  /\b(email|phone|url|date|name)\b.*\b(from|in)\b/i,
  /\b(convert|transform|format)\b.*\b(json|csv|xml|yaml)\b/i,
  /\b(regex|regular expression|pattern)\b/i,
];
```

---

## Fallback: LLM-Based Classification

If the regex classifier returns low confidence (no strong pattern match), use the **local LLM** to classify — this is still free (zero Fireworks tokens):

```javascript
async function classifyWithFallback(task) {
  const { category, confidence } = classifyWithRegex(task);
  
  if (confidence >= 0.7) {
    return category;
  }
  
  // Fallback to local LLM classification (still free)
  const llmCategory = await localModel.classify(task.content, CATEGORIES);
  return llmCategory;
}
```

---

## Configuration

### Category → Solver Strategy Map

```javascript
const SOLVER_STRATEGY = {
  math:           { tiers: [0, 1, 2],    maxFireworksTokens: 100  },
  code:           { tiers: [1, 2, 3],    maxFireworksTokens: 500  },
  factual:        { tiers: [1, 2],       maxFireworksTokens: 200  },
  logic:          { tiers: [1, 2, 3],    maxFireworksTokens: 800  },
  parsing:        { tiers: [0, 1],       maxFireworksTokens: 50   },
  classification: { tiers: [1, 2],       maxFireworksTokens: 50   },
  creative:       { tiers: [1, 2],       maxFireworksTokens: 300  },
  multi_step:     { tiers: [1, 2, 3],    maxFireworksTokens: 1000 },
};
```

---

## Testing the Classifier

```bash
# Run classifier unit tests
npm test -- --grep "classifier"

# Run classifier against the benchmark
npm run eval:classifier
```

---

## Related Documents

- [🏗️ Architecture](architecture.md) — Where the classifier fits in the system
- [⚡ Tier-0 Solvers](tier0-deterministic-solvers.md) — What happens after classification
- [🔒 Confidence Gating](confidence-gating.md) — How classification confidence affects routing
