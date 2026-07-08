# ☁️ Tier-2/3: Fireworks AI Escalation

> Tiered Fireworks API usage — cheapest model first, strongest only as last resort.

---

## Overview

Fireworks tiers are the **last resort**. Every token spent here directly reduces your competition score. The strategy is:

1. **Tier-2**: Use the cheapest Fireworks model that can handle the task category
2. **Tier-3**: Only escalate to a stronger (more expensive) model if Tier-2's confidence is also low
3. **Verify, don't regenerate**: When possible, use Fireworks to verify a local answer rather than generating from scratch

---

## Model Tier Map

### Tier-2: Cheap Models (First Choice)

| Model | Cost/1M tokens | Best For | Max Output Tokens |
|-------|---------------|----------|-------------------|
| `accounts/fireworks/models/mixtral-8x7b-instruct` | Low | General tasks, classification | 200 |
| `accounts/fireworks/models/llama-v3p1-8b-instruct` | Very Low | Simple Q&A, verification | 100 |

### Tier-3: Strong Models (Last Resort)

| Model | Cost/1M tokens | Best For | Max Output Tokens |
|-------|---------------|----------|-------------------|
| `accounts/fireworks/models/llama-v3p1-70b-instruct` | Medium | Complex reasoning, multi-step | 500 |
| `accounts/fireworks/models/qwen2p5-72b-instruct` | Medium | Code, multilingual | 500 |

### Category → Model Map

```javascript
const MODEL_MAP = {
  math:           { cheap: 'llama-v3p1-8b-instruct',    strong: 'llama-v3p1-70b-instruct' },
  code:           { cheap: 'mixtral-8x7b-instruct',      strong: 'qwen2p5-72b-instruct'   },
  factual:        { cheap: 'llama-v3p1-8b-instruct',    strong: 'llama-v3p1-70b-instruct' },
  logic:          { cheap: 'mixtral-8x7b-instruct',      strong: 'llama-v3p1-70b-instruct' },
  parsing:        { cheap: 'llama-v3p1-8b-instruct',    strong: 'mixtral-8x7b-instruct'   },
  classification: { cheap: 'llama-v3p1-8b-instruct',    strong: 'mixtral-8x7b-instruct'   },
  creative:       { cheap: 'mixtral-8x7b-instruct',      strong: 'llama-v3p1-70b-instruct' },
  multi_step:     { cheap: 'mixtral-8x7b-instruct',      strong: 'llama-v3p1-70b-instruct' },
};
```

---

## Fireworks Client Implementation

```javascript
// solvers/fireworksClient.js

import OpenAI from 'openai';

const fireworks = new OpenAI({
  apiKey: process.env.FIREWORKS_API_KEY,
  baseURL: process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1',
});

export async function callFireworks(model, prompt, options = {}) {
  const {
    maxTokens = 200,
    temperature = 0.3,
    systemPrompt = 'Answer concisely.',
  } = options;

  const startTime = Date.now();
  
  const response = await fireworks.chat.completions.create({
    model: `accounts/fireworks/models/${model}`,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: temperature,
  });

  const answer = response.choices[0]?.message?.content || '';
  const tokensUsed = response.usage?.total_tokens || 0;
  
  return {
    answer: answer.trim(),
    tokensUsed,
    model,
    latencyMs: Date.now() - startTime,
  };
}
```

---

## Prompt Compression

**Critical for token savings.** Every token in the prompt costs money. Strip to the absolute minimum.

### Before (Wasteful)

```
You are a helpful AI assistant. Your job is to answer questions accurately and concisely.
Please read the following question carefully and provide a detailed answer.

Question: What is the capital of France?

Please provide your answer below. Make sure to be accurate and include relevant details.
```

**~60 tokens wasted on instructions.**

### After (Compressed)

```
Q: What is the capital of France?
A:
```

**~12 tokens. Same accuracy.**

### Compression Function

```javascript
export function compressPrompt(task, category) {
  const CATEGORY_SYSTEM_PROMPTS = {
    math:           'Solve. Answer with just the number.',
    code:           'Write code. No explanation.',
    factual:        'Answer concisely.',
    logic:          'Reason step by step. Final answer on last line.',
    parsing:        'Extract the requested data. No extra text.',
    classification: 'Classify. One word answer.',
    creative:       'Write concisely.',
    multi_step:     'Solve step by step. Final answer on last line.',
  };

  return {
    systemPrompt: CATEGORY_SYSTEM_PROMPTS[category] || 'Answer concisely.',
    userPrompt: task.content.trim(),
    maxTokens: getMaxTokens(category),
  };
}

function getMaxTokens(category) {
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
  return TOKEN_CAPS[category] || 200;
}
```

---

## Verification Mode (Token Saver)

Instead of asking Fireworks to regenerate an answer, **verify the local model's answer**:

```javascript
export async function verifyWithFireworks(localAnswer, task, category) {
  const model = MODEL_MAP[category].cheap;
  
  const verifyPrompt = `Question: ${task.content}\nProposed answer: ${localAnswer}\nIs this correct? Reply only YES or NO.`;
  
  const result = await callFireworks(model, verifyPrompt, {
    maxTokens: 3,  // Just need YES or NO
    temperature: 0,
  });
  
  const isCorrect = result.answer.trim().toUpperCase().startsWith('YES');
  
  return {
    verified: isCorrect,
    tokensUsed: result.tokensUsed,  // Usually 5-10 tokens total
    answer: isCorrect ? localAnswer : null,
  };
}
```

**Cost comparison:**
- Full Fireworks generation: 50–500 tokens
- Verification call: 5–10 tokens (90% cheaper)

---

## Error Handling

```javascript
export async function safeFireworksCall(model, prompt, options, fallbackModel) {
  try {
    return await callFireworks(model, prompt, options);
  } catch (error) {
    if (error.status === 429) {
      // Rate limited — wait and retry once
      await sleep(1000);
      return await callFireworks(model, prompt, options);
    }
    if (fallbackModel) {
      // Try fallback model
      return await callFireworks(fallbackModel, prompt, options);
    }
    throw error;
  }
}
```

---

## Token Tracking

Every Fireworks call must log token usage:

```javascript
import { logTokenUsage } from '../logger.js';

// After every Fireworks call:
logTokenUsage({
  taskId: task.id,
  tier: 'tier-2',  // or 'tier-3'
  model: result.model,
  promptTokens: response.usage.prompt_tokens,
  completionTokens: response.usage.completion_tokens,
  totalTokens: response.usage.total_tokens,
});
```

---

## Related Documents

- [🧠 Tier-1 Local Model](tier1-local-model.md) — What happens before Fireworks
- [🔒 Confidence Gating](confidence-gating.md) — When to escalate to Fireworks
- [📊 Token Tracking](token-tracking.md) — How token usage is logged
- [🏆 Scoring Formula](scoring-formula.md) — Why minimizing tokens matters
