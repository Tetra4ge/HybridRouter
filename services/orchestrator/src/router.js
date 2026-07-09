import { classify } from './classifier.js';
import { logTask } from './logger.js';
import { tryDeterministicSolve } from './solvers/deterministic.js';
import { solveWithLocalModel } from './solvers/localLlm.js';
import dotenv from 'dotenv';

dotenv.config();

const HIGH_CONFIDENCE_THRESHOLD = parseFloat(process.env.HIGH_CONFIDENCE_THRESHOLD) || 0.85;

export async function solveTask(task) {
  const { category, confidence, method } = classify(task);
  
  const startTime = Date.now();

  // Tier 0: try deterministic solver first
  const deterministicResult = tryDeterministicSolve(task, category);
  
  if (deterministicResult) {
    const latencyMs = Date.now() - startTime;
    logTask({
      taskId: task.id,
      category: category,
      tierUsed: 'tier-0',
      modelUsed: null,
      solverType: deterministicResult.solverType,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      confidence: deterministicResult.confidence,
      wasEscalated: false,
      escalationReason: null,
      answer: deterministicResult.answer,
      latencyMs: latencyMs
    });
    return {
      id: task.id,
      category,
      answer: deterministicResult.answer
    };
  }

  // Tier 1: Try Local LLM (Gemma/Qwen running on local-model-server)
  const localLlmResult = await solveWithLocalModel(task, category);
  
  if (localLlmResult) {
    const latencyMs = Date.now() - startTime;
    
    // Check if the confidence score meets or exceeds our threshold
    if (localLlmResult.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
      logTask({
        taskId: task.id,
        category: category,
        tierUsed: 'tier-1',
        modelUsed: localLlmResult.solverType,
        solverType: 'local-llm',
        promptTokens: localLlmResult.promptTokens,
        completionTokens: localLlmResult.completionTokens,
        totalTokens: localLlmResult.totalTokens,
        confidence: localLlmResult.confidence,
        wasEscalated: false,
        escalationReason: null,
        answer: localLlmResult.answer,
        latencyMs: latencyMs
      });
      return {
        id: task.id,
        category,
        answer: localLlmResult.answer
      };
    }
  }

  // TODO: Actual routing to cloud LLM tiers will be implemented in future phases.
  // For Phase 3, we return a placeholder if Tier-0 and Tier-1 (low confidence/failed) couldn't solve it.
  const placeholderAnswer = `Placeholder answer for task in category: ${category}`;

  const latencyMs = Date.now() - startTime;

  logTask({
    taskId: task.id,
    category: category,
    tierUsed: 'tier-2', // Placeholder for next tier
    modelUsed: null,
    solverType: `classifier-${method}-escalated`,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    confidence: confidence,
    wasEscalated: true,
    escalationReason: localLlmResult 
      ? `Tier-1 confidence (${localLlmResult.confidence.toFixed(2)}) below threshold (${HIGH_CONFIDENCE_THRESHOLD})` 
      : "Tier-1 solver failed or unavailable",
    answer: placeholderAnswer,
    latencyMs: latencyMs
  });

  return {
    id: task.id,
    category,
    answer: placeholderAnswer
  };
}
