/**
 * @module cache
 * @description Hash-based in-memory answer cache for zero-token deduplication.
 *
 * Scoring impact: Every cache hit = 0 Fireworks tokens consumed.
 * For repeated or near-identical tasks, this is the single biggest token saver.
 *
 * Respects ENABLE_CACHE env flag. Uses SHA-256 of normalized task text as key.
 */

import crypto from 'crypto';

let hits = 0;
let misses = 0;
const cache = new Map();

/**
 * Normalize and hash task content for use as a cache key.
 * Strips leading/trailing whitespace, lowercases, and collapses multiple spaces.
 *
 * @param {Object} task - Task object with `content` field.
 * @returns {string} SHA-256 hex digest of the normalized task content.
 */
function hashTask(task) {
  const normalized = (task.content || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Look up a cached result for a given task.
 *
 * @param {Object} task - Task object with `content` field.
 * @returns {Object|null} Cached result (with `cached: true`) or null on miss.
 */
export function getCached(task) {
  if (process.env.ENABLE_CACHE !== 'true') return null;
  const hash = hashTask(task);
  const entry = cache.get(hash);
  if (entry) {
    hits++;
    console.log(`[Cache] HIT  — hash: ${hash.slice(0, 8)}... (total hits: ${hits})`);
    return entry;
  }
  misses++;
  return null;
}

/**
 * Store a solved result in the cache keyed by the task's content hash.
 * Should be called after every successful solve (tier-0 through tier-3).
 * Do NOT cache fallback/error results.
 *
 * @param {Object} task - Task object with `content` field.
 * @param {Object} result - Result object to cache.
 */
export function setCache(task, result) {
  if (process.env.ENABLE_CACHE !== 'true') return;
  const hash = hashTask(task);
  cache.set(hash, {
    ...result,
    cached: true,
    cachedAt: Date.now(),
  });
  console.log(`[Cache] SET  — hash: ${hash.slice(0, 8)}... (cache size: ${cache.size})`);
}

/**
 * Returns current cache performance statistics.
 *
 * @returns {{ size: number, hits: number, misses: number, hitRate: string }}
 */
export function getCacheStats() {
  const total = hits + misses;
  return {
    size: cache.size,
    hits,
    misses,
    hitRate: total > 0 ? ((hits / total) * 100).toFixed(1) + '%' : '0%',
  };
}

/**
 * Clears all entries from the cache and resets counters.
 * Primarily useful for testing and benchmarking.
 */
export function clearCache() {
  cache.clear();
  hits = 0;
  misses = 0;
  console.log('[Cache] Cleared.');
}
