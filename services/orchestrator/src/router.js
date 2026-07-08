import { classify } from './classifier.js';
import { logTask } from './logger.js';

export async function solveTask(task) {
  const { category, confidence, method } = classify(task);
  
  const startTime = Date.now();

  // TODO: Actual routing to tiers will be implemented in future phases.
  // For Phase 1, we just return a placeholder answer.
  const placeholderAnswer = `Placeholder answer for task in category: ${category}`;

  const latencyMs = Date.now() - startTime;

  logTask({
    taskId: task.id,
    category: category,
    tierUsed: 'tier-0', // Placeholder
    modelUsed: null,
    solverType: `classifier-${method}`,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    confidence: confidence,
    wasEscalated: false,
    escalationReason: null,
    answer: placeholderAnswer,
    latencyMs: latencyMs
  });

  return {
    id: task.id,
    category,
    answer: placeholderAnswer
  };
}
