import { classify } from './classifier.js';
import { logTask } from './logger.js';
import { tryDeterministicSolve } from './solvers/deterministic.js';

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

  // TODO: Actual routing to LLM tiers will be implemented in future phases.
  // For Phase 2, we return a placeholder if Tier-0 couldn't solve it.
  const placeholderAnswer = `Placeholder answer for task in category: ${category}`;

  const latencyMs = Date.now() - startTime;

  logTask({
    taskId: task.id,
    category: category,
    tierUsed: 'tier-1', // Placeholder for next tier
    modelUsed: null,
    solverType: `classifier-${method}-escalated`,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    confidence: confidence,
    wasEscalated: true,
    escalationReason: "Tier-0 solver not applicable or failed",
    answer: placeholderAnswer,
    latencyMs: latencyMs
  });

  return {
    id: task.id,
    category,
    answer: placeholderAnswer
  };
}
