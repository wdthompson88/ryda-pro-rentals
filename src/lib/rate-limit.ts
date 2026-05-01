// Lightweight per-IP rate limiter for public POST endpoints.
//
// Implementation: in-memory token bucket keyed by client IP. Survives
// within a single Vercel Lambda warm window — does NOT survive cold
// starts or work across instances. That's intentional: this is a
// "fast-N abuse" speed bump, not a real DoS defense. For real traffic,
// upgrade to Upstash / Redis / Vercel KV.
//
// Why not delete it then? Because the alternative is zero defense —
// and even one warm instance soaking up a burst is better than nothing.
// When a real backend lands, swap the implementation, keep the API.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000; // hard cap so the map can't blow up memory

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
    // Garbage-collect lazily so we don't grow forever in a long-running
    // warm instance.
    if (buckets.size > MAX_KEYS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
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
 * — all such requests share a bucket, which intentionally fails closed
 * under load.
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
