import { classify } from './classifier.js';
import { logTask } from './logger.js';
import { tryDeterministicSolve } from './solvers/deterministic.js';
import { solveWithLocalModel } from './solvers/localLlm.js';
import {
  MODEL_MAP,
  compressPrompt,
  verifyWithFireworks,
  safeFireworksCall
} from './solvers/fireworksClient.js';
import { getCached, setCache } from './cache.js';
import dotenv from 'dotenv';

dotenv.config();

// Per-category thresholds for acceptance and escalation
const THRESHOLDS = {
  math:           { high: 0.90,    medium: 0.70,    low: 0.40 },
  code:           { high: 0.85,    medium: 0.60,    low: 0.35 },
  factual:        { high: 0.80,    medium: 0.55,    low: 0.30 },
  logic:          { high: 0.90,    medium: 0.70,    low: 0.40 },
  classification: { high: 0.80,    medium: 0.55,    low: 0.30 },
  creative:       { high: 0.70,    medium: 0.50,    low: 0.30 },
  parsing:        { high: 0.90,    medium: 0.70,    low: 0.40 },
  multi_step:     { high: 0.85,    medium: 0.60,    low: 0.35 },
};

/**
 * Assesses answer length reasonableness based on the category.
 */
function lengthConfidence(answer, category) {
  const expectedLengths = {
    math: { min: 1, max: 20 },
    classification: { min: 1, max: 10 },
    factual: { min: 5, max: 100 },
    code: { min: 20, max: 500 },
  };
  
  const range = expectedLengths[category] || { min: 5, max: 200 };
  const len = (answer || '').length;
  
  if (len < range.min || len > range.max * 2) return 0.3;  // Suspiciously short/long
  if (len >= range.min && len <= range.max) return 0.8;     // Expected range
  return 0.5;  // Acceptable
}

/**
 * Checks for hedging language in the response.
 */
function hedgingConfidence(answer) {
  const HEDGE_PHRASES = [
    /\bI think\b/i, /\bprobably\b/i, /\bmaybe\b/i,
    /\bnot sure\b/i, /\bI believe\b/i, /\bpossibly\b/i,
    /\bmight be\b/i, /\bcould be\b/i, /\bI'm uncertain\b/i,
  ];
  
  const hedgeCount = HEDGE_PHRASES.filter(p => p.test(answer)).length;
  
  if (hedgeCount === 0) return 1.0;   // No hedging
  if (hedgeCount === 1) return 0.6;   // Minor hedging
  return 0.3;                         // High hedging
}

/**
 * Blends consistency, length, and hedging metrics into a single confidence score.
 */
function computeConfidence(answer, consistency, category) {
  const length = lengthConfidence(answer, category);
  const hedging = hedgingConfidence(answer);
  
  const WEIGHTS = {
    math:           { consistency: 0.6, length: 0.2, hedging: 0.2 },
    code:           { consistency: 0.5, length: 0.2, hedging: 0.3 },
    factual:        { consistency: 0.5, length: 0.2, hedging: 0.3 },
    logic:          { consistency: 0.7, length: 0.1, hedging: 0.2 },
    classification: { consistency: 0.6, length: 0.3, hedging: 0.1 },
    creative:       { consistency: 0.3, length: 0.3, hedging: 0.4 },
    parsing:        { consistency: 0.7, length: 0.2, hedging: 0.1 },
    multi_step:     { consistency: 0.6, length: 0.1, hedging: 0.3 },
  };
  
  const w = WEIGHTS[category] || { consistency: 0.5, length: 0.2, hedging: 0.3 };
  
  return (
    w.consistency * consistency +
    w.length * length +
    w.hedging * hedging
  );
}

export async function solveTask(task, customThresholds = null) {
  const { category, confidence: classConfidence, method } = classify(task);
  const startTime = Date.now();
  const t = customThresholds?.[category] || THRESHOLDS[category] || { high: 0.85, medium: 0.60, low: 0.35 };

  // --- Cache Check (zero Fireworks tokens) ---
  const cachedResult = getCached(task);
  if (cachedResult) {
    logTask({
      taskId: task.id,
      category,
      tierUsed: 'cache',
      modelUsed: null,
      solverType: 'cache-hit',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      confidence: 1.0,
      wasEscalated: false,
      escalationReason: null,
      answer: cachedResult.answer,
      latencyMs: Date.now() - startTime,
    });
    return cachedResult;
  }

  // --- Tier 0: Deterministic Solver ---
  const deterministicResult = tryDeterministicSolve(task, category);
  if (deterministicResult) {
    const latencyMs = Date.now() - startTime;
    logTask({
      taskId: task.id,
      category,
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
      latencyMs
    });
    const tier0Result = { id: task.id, category, answer: deterministicResult.answer };
    setCache(task, tier0Result);
    return tier0Result;
  }

  // --- Tier 1: Local Model Server ---
  const localLlmResult = await solveWithLocalModel(task, category);
  let localConfidence = 0.0;
  
  if (localLlmResult) {
    localConfidence = computeConfidence(localLlmResult.answer, localLlmResult.confidence, category);

    // Action 1: Accept Local Direct
    if (localConfidence >= t.high) {
      const latencyMs = Date.now() - startTime;
      logTask({
        taskId: task.id,
        category,
        tierUsed: 'tier-1',
        modelUsed: localLlmResult.solverType,
        solverType: 'local-llm-direct',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        confidence: localConfidence,
        wasEscalated: false,
        escalationReason: null,
        answer: localLlmResult.answer,
        latencyMs
      });
      const tier1DirectResult = { id: task.id, category, answer: localLlmResult.answer };
      setCache(task, tier1DirectResult);
      return tier1DirectResult;
    }

    // Action 2: Verify Local Answer via Fireworks
    if (localConfidence >= t.medium) {
      console.log(`[Router] Confidence ${localConfidence.toFixed(2)} in medium range. Calling Fireworks verification...`);
      try {
        const verifyResult = await verifyWithFireworks(localLlmResult.answer, task, category);
        const latencyMs = Date.now() - startTime;
        
        if (verifyResult.verified) {
          logTask({
            taskId: task.id,
            category,
            tierUsed: 'tier-1',
            modelUsed: localLlmResult.solverType,
            solverType: 'local-llm-verified',
            promptTokens: verifyResult.promptTokens,
            completionTokens: verifyResult.completionTokens,
            totalTokens: verifyResult.totalTokens,
            confidence: localConfidence,
            wasEscalated: false,
            escalationReason: null,
            answer: localLlmResult.answer,
            latencyMs
          });
          const tier1VerifiedResult = { id: task.id, category, answer: localLlmResult.answer };
          setCache(task, tier1VerifiedResult);
          return tier1VerifiedResult;
        }
        console.log(`[Router] Verification rejected local answer.`);
      } catch (err) {
        console.error(`[Router] Verification failed:`, err.message);
      }
    }
  }

  // --- Tier 2 / 3: Fireworks Cloud Escalation ---
  const cheapModel = MODEL_MAP[category]?.cheap || 'glm-5p1';
  const strongModel = MODEL_MAP[category]?.strong || 'deepseek-v4-pro';
  
  const { systemPrompt, userPrompt, maxTokens } = compressPrompt(task, category);

  // If local confidence is moderately okay, try the cheap model first (Tier-2)
  if (localLlmResult && localConfidence >= t.low) {
    console.log(`[Router] Escalating to Tier-2 (Cheap Fireworks: ${cheapModel})`);
    try {
      const cheapResult = await safeFireworksCall(
        cheapModel,
        userPrompt,
        { systemPrompt, maxTokens, temperature: 0.3 },
        strongModel // Fallback to strong model if call fails
      );
      
      const latencyMs = Date.now() - startTime;
      logTask({
        taskId: task.id,
        category,
        tierUsed: cheapResult.model === strongModel ? 'tier-3' : 'tier-2',
        modelUsed: cheapResult.model,
        solverType: 'fireworks-cheap',
        promptTokens: cheapResult.promptTokens,
        completionTokens: cheapResult.completionTokens,
        totalTokens: cheapResult.totalTokens,
        confidence: 0.80, // Default confidence for cloud solver
        wasEscalated: true,
        escalationReason: `Local confidence (${localConfidence.toFixed(2)}) failed verification or threshold`,
        answer: cheapResult.answer,
        latencyMs
      });
      const tier2Result = { id: task.id, category, answer: cheapResult.answer };
      setCache(task, tier2Result);
      return tier2Result;
    } catch (err) {
      console.error(`[Router] Tier-2 call failed:`, err.message);
    }
  }

  // Fallback / Direct Tier-3 Escalation (for very low local confidence or errors)
  console.log(`[Router] Escalating to Tier-3 (Strong Fireworks: ${strongModel})`);
  try {
    const strongResult = await safeFireworksCall(
      strongModel,
      userPrompt,
      { systemPrompt, maxTokens, temperature: 0.3 }
    );

    const latencyMs = Date.now() - startTime;
    logTask({
      taskId: task.id,
      category,
      tierUsed: 'tier-3',
      modelUsed: strongResult.model,
      solverType: 'fireworks-strong',
      promptTokens: strongResult.promptTokens,
      completionTokens: strongResult.completionTokens,
      totalTokens: strongResult.totalTokens,
      confidence: 0.95,
      wasEscalated: true,
      escalationReason: localLlmResult
        ? `Local confidence (${localConfidence.toFixed(2)}) below low threshold (${t.low})`
        : "Local model failed or returned null",
      answer: strongResult.answer,
      latencyMs
    });
    const tier3Result = { id: task.id, category, answer: strongResult.answer };
    setCache(task, tier3Result);
    return tier3Result;
  } catch (err) {
    console.error(`[Router] Tier-3 call failed:`, err.message);
    
    // Last-resort fallback so the system never crashes (NOT cached — error result)
    const fallbackAnswer = localLlmResult ? localLlmResult.answer : `Error processing task: ${err.message}`;
    const latencyMs = Date.now() - startTime;
    logTask({
      taskId: task.id,
      category,
      tierUsed: 'fallback',
      modelUsed: null,
      solverType: 'hard-fallback',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      confidence: 0.1,
      wasEscalated: true,
      escalationReason: `Critical error: ${err.message}`,
      answer: fallbackAnswer,
      latencyMs
    });
    return { id: task.id, category, answer: fallbackAnswer };
  }
}

