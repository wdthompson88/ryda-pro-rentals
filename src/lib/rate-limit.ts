// Lightweight per-IP rate limiter for public POST endpoints.
//
// Implementation: in-memory token bucket keyed by client IP. Survives
// within a single Vercel Lambda warm window, does NOT survive cold
// starts or work across instances. That's intentional: this is a
// "fast-N abuse" speed bump, not a real DoS defense. For real traffic,
// upgrade to Upstash / Redis / Vercel KV.
//
// Why not delete it then? Because the alternative is zero defense —
// and even one warm instance soaking up a burst is better than nothing.
// When a real backend lands, swap the implementation, keep the API.
//
// Spoofing assumption: this trusts Vercel's `x-forwarded-for` rewrite
// behavior (Vercel overwrites client-supplied XFF with the real client
// IP). On any non-Vercel host (self-hosted, custom proxy chain),
// attackers can rotate XFF to bypass per-IP buckets, swap to a real
// limiter before deploying off Vercel.

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
export function isAllowed(key: string, limit: number, windowMs: number): boolean {
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

/**
 * Best-effort client-IP extraction from Next.js Request.
 * Trusts Vercel's `x-forwarded-for` (left-most) and falls back to
 * `x-real-ip`. If neither is set (rare on Vercel), returns "unknown"
 *, all such requests share a bucket, which intentionally fails closed
 * under load.
 *
 * SECURITY: This trusts the platform proxy. On Vercel, XFF is rewritten
 * server-side. On any host that doesn't sanitize XFF, a client can
 * forge it. If you migrate off Vercel, replace this with a header
 * trusted by your specific edge layer (e.g. `cf-connecting-ip` on
 * Cloudflare).
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
