# Phase 4: Fireworks Integration (Tier-2/3)

> Implement the tiered Fireworks API client with prompt compression and cost optimization.

---

## Prerequisites

- [x] Phase 1 complete (project structure, environment setup)
- Fireworks AI API key

---

## Objectives
 
- [x] Implement Fireworks client using the OpenAI-compatible SDK
- [x] Create model tier map (category → cheap/strong model)
- [x] Implement prompt compression (strip unnecessary context)
- [x] Implement verification mode (yes/no instead of full generation)
- [x] Set category-specific `max_tokens` caps
- [x] Add error handling with retry logic
- [x] Integrate into router.js as Tier-2 and Tier-3
- [x] Log all Fireworks token usage to SQLite


---

## Deliverables

### 1. Fireworks Client

```bash
cd services/orchestrator && npm install openai
```

```javascript
// services/orchestrator/src/solvers/fireworksClient.js

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.FIREWORKS_API_KEY,
  baseURL: process.env.FIREWORKS_BASE_URL,
});

export async function callFireworks(model, prompt, options = {}) {
  const response = await client.chat.completions.create({
    model: `accounts/fireworks/models/${model}`,
    messages: [
      { role: 'system', content: options.systemPrompt || 'Answer concisely.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: options.maxTokens || 200,
    temperature: options.temperature || 0.3,
  });

  return {
    answer: response.choices[0]?.message?.content?.trim() || '',
    tokensUsed: response.usage?.total_tokens || 0,
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
    model,
  };
}
```

### 2. Model Tier Map

```javascript
export const MODEL_MAP = {
  math:           { cheap: 'llama-v3p1-8b-instruct',  strong: 'llama-v3p1-70b-instruct' },
  code:           { cheap: 'mixtral-8x7b-instruct',    strong: 'qwen2p5-72b-instruct'   },
  factual:        { cheap: 'llama-v3p1-8b-instruct',  strong: 'llama-v3p1-70b-instruct' },
  logic:          { cheap: 'mixtral-8x7b-instruct',    strong: 'llama-v3p1-70b-instruct' },
  parsing:        { cheap: 'llama-v3p1-8b-instruct',  strong: 'mixtral-8x7b-instruct'   },
  classification: { cheap: 'llama-v3p1-8b-instruct',  strong: 'mixtral-8x7b-instruct'   },
  creative:       { cheap: 'mixtral-8x7b-instruct',    strong: 'llama-v3p1-70b-instruct' },
  multi_step:     { cheap: 'mixtral-8x7b-instruct',    strong: 'llama-v3p1-70b-instruct' },
};
```

### 3. Prompt Compression

```javascript
export function compressPrompt(task, category) {
  const SYSTEM_PROMPTS = {
    math:           'Solve. Answer with just the number.',
    code:           'Write code. No explanation.',
    factual:        'Answer concisely.',
    logic:          'Reason step by step. Final answer on last line.',
    parsing:        'Extract the requested data.',
    classification: 'Classify. One word answer.',
    creative:       'Write concisely.',
    multi_step:     'Solve step by step. Final answer on last line.',
  };

  return {
    systemPrompt: SYSTEM_PROMPTS[category] || 'Answer concisely.',
    userPrompt: task.content.trim(),
    maxTokens: TOKEN_CAPS[category] || 200,
  };
}
```

### 4. Verification Mode

```javascript
export async function verifyAnswer(localAnswer, task, category) {
  const model = MODEL_MAP[category].cheap;
  const prompt = `Q: ${task.content}\nA: ${localAnswer}\nCorrect? YES or NO.`;
  
  const result = await callFireworks(model, prompt, {
    maxTokens: 3,
    temperature: 0,
    systemPrompt: 'Reply YES or NO only.',
  });
  
  return {
    verified: result.answer.toUpperCase().includes('YES'),
    tokensUsed: result.tokensUsed,
  };
}
```

### 5. Router Integration

```javascript
// In router.js — after Tier-1 returns low confidence

// Tier 2: Cheap Fireworks
const { systemPrompt, userPrompt, maxTokens } = compressPrompt(task, category);
const cheapResult = await callFireworks(
  MODEL_MAP[category].cheap,
  userPrompt,
  { systemPrompt, maxTokens }
);

logTask({ tierUsed: 'tier-2', totalTokens: cheapResult.tokensUsed, ... });

if (cheapResult.confidence >= THRESHOLDS[category].medium) {
  return cheapResult;
}

// Tier 3: Strong Fireworks (last resort)
const strongResult = await callFireworks(
  MODEL_MAP[category].strong,
  userPrompt,
  { systemPrompt, maxTokens: maxTokens * 2 }
);

logTask({ tierUsed: 'tier-3', totalTokens: strongResult.tokensUsed, ... });
return strongResult;
```

---

## Acceptance Criteria

- [ ] Fireworks client successfully calls API and returns answers
- [ ] Model tier map selects correct models per category
- [ ] Prompt compression reduces token usage by 20%+
- [ ] Verification mode works with ~5 token cost
- [ ] All Fireworks token usage logged to SQLite
- [ ] Error handling: retries on 429, fallback on failure

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/orchestrator/src/solvers/fireworksClient.js` | NEW | Fireworks API client |
| `services/orchestrator/src/router.js` | MODIFY | Add Tier-2/3 |
| `services/orchestrator/src/logger.js` | MODIFY | Log Fireworks tokens |

---

## Metrics Target

| Metric | Target |
|--------|--------|
| Avg tokens per cheap Fireworks call | < 100 |
| Verification call cost | < 10 tokens |
| Fireworks error rate | < 1% |

---

## Next Phase

→ [Phase 5: Confidence Gating](phase5-confidence-gating.md) — Smart escalation logic
