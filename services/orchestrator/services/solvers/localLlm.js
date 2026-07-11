import dotenv from 'dotenv';

// Load environment variables if they haven't been loaded already
dotenv.config();

const LOCAL_MODEL_URL = process.env.LOCAL_MODEL_URL || 'http://localhost:8000';

/**
 * Solves a task using the local LLM server (Tier-1).
 * Wraps call in try/catch to escalate to the next tier on failure instead of crashing.
 * 
 * @param {Object} task - The task object containing id and content.
 * @param {string} category - The classified category of the task.
 * @returns {Object|null} The response object or null if execution failed.
 */
export async function solveWithLocalModel(task, category) {
  const startTime = Date.now();
  try {
    // Set max_tokens based on category as per token optimization guidelines
    let maxTokens = 100;
    if (category === 'classification') maxTokens = 10;
    else if (category === 'factual') maxTokens = 50;
    else if (category === 'code') maxTokens = 300;

    const useHfServerless = process.env.USE_HF_SERVERLESS === 'true';

    if (useHfServerless) {
      const hfToken = process.env.HF_TOKEN;
      const modelName = process.env.MODEL_NAME || 'google/gemma-3-12b-it';
      const hfUrl = 'https://router.huggingface.co/v1/chat/completions';

      if (!hfToken) {
        console.warn('[LocalLLM] USE_HF_SERVERLESS is true but HF_TOKEN is not defined.');
        return null;
      }

      // Generate 3 samples in parallel for self-consistency voting
      const numSamples = 3;
      const promises = Array.from({ length: numSamples }).map(async (_, idx) => {
        // Add a slight delay for concurrent requests to help avoid rate limits
        if (idx > 0) await new Promise(resolve => setTimeout(resolve, idx * 150));
        
        const response = await fetch(hfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'user', content: task.content }
            ],
            max_tokens: maxTokens,
            temperature: 0.7, // Higher temp for self-consistency diversity
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HF API error ${response.status}: ${errText}`);
        }

        const res = await response.json();
        const sampleText = res.choices?.[0]?.message?.content || '';
        return sampleText.trim();
      });

      const samples = await Promise.all(promises);
      const { answer, confidence } = scoreConsistency(samples);

      return {
        answer: answer,
        confidence: confidence,
        samples: samples,
        solverType: `hf-serverless/${modelName}`,
        promptTokens: 0, // HF Serverless is free for the hackathon (no Fireworks tokens spent)
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: Date.now() - startTime,
      };
    } else {
      const response = await fetch(`${LOCAL_MODEL_URL}/inference/consistency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: task.content,
          max_tokens: maxTokens,
          temperature: 0.7,
          num_samples: 3, // Enable self-consistency voting
        }),
      });

      if (!response.ok) {
        console.warn(`[LocalLLM] Server returned HTTP error status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return {
        answer: data.answer,
        confidence: data.confidence,
        samples: data.samples,
        solverType: `local-llm/${data.model || 'unknown'}`,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: Date.now() - startTime,
      };
    }
  } catch (error) {
    console.error('[LocalLLM] Error invoking local model solver:', error.message);
    return null;
  }
}

/**
 * Calculates confidence (agreement ratio) and best answer from consistency samples.
 * 
 * @param {string[]} samples - Generated answers.
 * @returns {Object} { answer: string, confidence: number }
 */
function scoreConsistency(samples) {
  if (!samples || samples.length === 0) return { answer: '', confidence: 0 };
  const normalized = samples.map(s => s.trim().toLowerCase());
  const counts = {};
  let maxCount = 0;
  let bestAnswer = samples[0];
  
  for (let i = 0; i < samples.length; i++) {
    const norm = normalized[i];
    counts[norm] = (counts[norm] || 0) + 1;
    if (counts[norm] > maxCount) {
      maxCount = counts[norm];
      bestAnswer = samples[i];
    }
  }
  const agreement = maxCount / samples.length;
  return { answer: bestAnswer, confidence: agreement };
}

