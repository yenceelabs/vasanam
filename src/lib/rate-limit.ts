/**
 * Simple in-memory rate limiter.
 * Works in both Node.js and Edge runtimes.
 * Resets on cold start — acceptable for basic abuse prevention.
 *
 * Shared between /api/search (edge) and /search page (server component).
 */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30; // 30 requests per minute per key

let cleanupCounter = 0;

function maybeCleanup() {
  cleanupCounter++;
  if (cleanupCounter % 100 === 0) {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Check if a request is within rate limits.
 * @param key - Unique key for rate limiting (usually IP address)
 * @param maxRequests - Max requests per window (default: 30)
 * @param windowMs - Window duration in ms (default: 60s)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS
): boolean {
  maybeCleanup();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
