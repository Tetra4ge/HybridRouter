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
  try {
    // Set max_tokens based on category as per token optimization guidelines
    let maxTokens = 100;
    if (category === 'classification') maxTokens = 10;
    else if (category === 'factual') maxTokens = 50;
    else if (category === 'code') maxTokens = 300;

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
      promptTokens: 0, // Local model tokens are free (0 penalty)
      completionTokens: 0,
      totalTokens: 0,
    };
  } catch (error) {
    console.error('[LocalLLM] Error invoking local model server:', error.message);
    return null;
  }
}
