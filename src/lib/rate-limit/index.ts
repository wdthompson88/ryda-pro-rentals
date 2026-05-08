// Rate-limit subsystem — public entrypoint.
//
// Routes import { isAllowed, clientIp } from "@/lib/rate-limit"
// and don't think about which adapter is in play. Adapter selection
// is single-source-of-truth here: Upstash if configured, in-memory
// fallback otherwise.
//
// All consumers are async-ready: isAllowed returns Promise<boolean>.
// Existing routes already had `if (!isAllowed(...))` checks and
// have been updated to `if (!(await isAllowed(...)))`.
//
// Why one-package: the in-memory adapter is the safety net. If
// Upstash env vars get unset (rotation, misconfiguration, partial
// outage), routes still get rate-limit protection. The boundary is
// "is the env configured at boot", not "is Redis reachable right
// now" — runtime Upstash failures fail-open inside the upstash
// adapter (logged), not silently fall through to in-memory.

import { isAllowedInMemory } from "./in-memory";
import { isAllowedUpstash, isUpstashConfigured } from "./upstash";

/** True iff the request is allowed; false if rate-limited. */
export async function isAllowed(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  if (isUpstashConfigured()) {
    return isAllowedUpstash(key, limit, windowMs);
  }
  return isAllowedInMemory(key, limit, windowMs);
}

/**
 * Best-effort client-IP extraction from Next.js Request.
 * Trusts Vercel's `x-forwarded-for` (left-most) and falls back to
 * `x-real-ip`. If neither is set (rare on Vercel), returns "unknown",
 * all such requests share a bucket (intentional fail-closed).
 *
 * SECURITY: trusts the platform proxy. On Vercel, XFF is rewritten
 * server-side. On any host that doesn't sanitize XFF, a client can
 * forge it. If you migrate off Vercel, replace this with the
 * trusted-edge header (e.g. `cf-connecting-ip` on Cloudflare).
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

// Re-export adapter implementations for direct testing if needed.
// Routes should NOT import these directly — go through `isAllowed`.
export { isAllowedInMemory, isAllowedUpstash, isUpstashConfigured };
