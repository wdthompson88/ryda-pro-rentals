// Upstash Redis adapter for the rate-limit subsystem.
//
// Why this exists: the in-memory adapter (./in-memory.ts) doesn't
// share state across Vercel cold starts or multi-region instances.
// A determined attacker hitting different cold-start instances
// effectively faces no rate limit. threat-modeling-expert agent
// flagged this as the kind of gap that adds up under real launch
// load.
//
// Algorithm: fixed-window counter via Redis INCR + EXPIRE NX.
//  - First request in a new window → INCR returns 1, EXPIRE NX
//    sets the TTL (NX = only if no existing TTL, prevents window
//    reset on subsequent hits in the same window).
//  - Subsequent requests → INCR returns N. Allowed iff N <= limit.
//  - When window expires, key is deleted, next INCR starts fresh.
//
// Atomicity: we use multi() (transaction), not pipeline(). Codex
// review caught that Upstash pipeline() is documented as
// non-atomic — other commands can interleave between INCR and
// EXPIRE, leading to a "hot key with INCR but no TTL" stuck
// state on partial failure. multi() wraps both in a server-side
// MULTI/EXEC, so they either both succeed or both fail.
// Source: https://upstash.com/docs/redis/sdks/ts/pipelining/pipeline-transaction
//
// Failure mode: if Redis call fails (network glitch, Upstash
// rate-limiting our requests, auth misconfig), we FAIL OPEN and
// let the request through. The alternative — fail closed —
// would take the site down on any Redis hiccup. The in-memory
// fallback at ./index.ts is the redundancy when Upstash is
// unconfigured at boot; this fail-open is for transient errors
// after Redis was reachable.
//
// Observability gap (codex caught): console.error alone is
// insufficient for sustained Upstash failure. When the SIEM
// stack lands (per LAUNCH_PLAN compliance roadmap), add a
// Datadog alert on the "[rate-limit/upstash] error, failing
// open" log pattern with rate threshold so ops sees sustained
// failure before it removes rate-limiting silently.

import "server-only";
import { Redis } from "@upstash/redis";

let cachedClient: Redis | null = null;

/** True iff Upstash env vars are present. */
export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/** Lazy Redis client. Returns null if env vars missing — callers
 *  should check isUpstashConfigured() first. */
function getClient(): Redis | null {
  if (cachedClient) return cachedClient;
  if (!isUpstashConfigured()) return null;
  cachedClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return cachedClient;
}

/**
 * Async because Upstash HTTP calls are network round trips. Routes
 * that use the unified rate-limit interface in ./index.ts get a
 * Promise<boolean> — they `await` it.
 *
 * @param key  unique client identifier (e.g. "waitlist:1.2.3.4")
 * @param limit  max requests in the window
 * @param windowMs  window length in ms
 * @returns true if allowed, false if rate-limited.
 */
export async function isAllowedUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const client = getClient();
  if (!client) {
    // Caller should never reach here — index.ts gates by
    // isUpstashConfigured. Defensive fail-open.
    return true;
  }

  const fullKey = `rl:${key}`;
  const ttlSec = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    // multi() = MULTI/EXEC transaction (atomic). pipeline() is
    // non-atomic (commands can interleave with other clients'
    // commands), which would leave a key in a hot/no-TTL state
    // on partial failure. Codex review caught this.
    const tx = client.multi();
    tx.incr(fullKey);
    tx.expire(fullKey, ttlSec, "NX");
    const results = (await tx.exec()) as [number, number];
    const count = results[0];
    return count <= limit;
  } catch (err) {
    // Fail-open on transient Upstash errors. Log so ops can grep
    // observability — if this fires often, Upstash is overloaded
    // or misconfigured, not that we're under attack. (See module
    // header for the SIEM-alert TODO.)
    console.error("[rate-limit/upstash] error, failing open", err);
    return true;
  }
}
