// In-memory adapter for the rate-limit subsystem.
//
// Token bucket keyed by client IP. Survives within a single Vercel
// Lambda warm window, does NOT survive cold starts or work across
// instances. That's the bug the Upstash adapter (./upstash.ts)
// fixes — but this still ships as the fallback when no Redis is
// configured (dev, ephemeral preview deploys, partial outages).
//
// The package's public entrypoint (./index.ts) picks Upstash if
// configured, falls back to this. Don't import this module
// directly from routes — go through @/lib/rate-limit instead.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000; // true ceiling (see code below)

/**
 * Returns true if the request is allowed; false if rate-limited.
 * Caller should respond with 429 when blocked.
 *
 * @param key  unique client identifier (e.g. ip + ":" + route)
 * @param limit  max requests in the window
 * @param windowMs  window length in ms
 */
export function isAllowedInMemory(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    // Try to garbage-collect expired entries before adding a new one.
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
      // If GC freed nothing (every bucket is still in its window), evict
      // the OLDEST bucket. This is the "true cap", Map preserves
      // insertion order, so .keys().next() returns the oldest key.
      // Without this, the map could grow unboundedly under sustained
      // unique-key spray.
      if (buckets.size >= MAX_KEYS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
    }
    b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

// clientIp lives in ./index.ts (it's adapter-agnostic).
