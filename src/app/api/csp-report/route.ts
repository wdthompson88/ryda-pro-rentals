// POST /api/csp-report — sink for Content-Security-Policy-Report-Only
// violation reports. Browsers POST a JSON document here whenever a
// page action would be blocked by the CSP set in vercel.json.
//
// Why this exists:
// We're rolling out CSP in Report-Only mode for ≥1 week before
// flipping to enforce (per .launch-prep/LAUNCH_PLAN.md Week 2).
// During that observation window, every legitimate third-party
// resource that's NOT in the allow-list shows up here. We grep
// the logs, decide whether to widen the policy or fix the page,
// then enforce.
//
// Format: browsers send `application/csp-report` with a JSON body
// shaped like { "csp-report": { "blocked-uri": "...", "violated-
// directive": "...", "document-uri": "...", "line-number": N, ...} }.
// Modern browsers also use the Reporting API which sends an array
// of reports as `application/reports+json`. Accept both.
//
// TODO before enforce: the current Report-Only header has
// `script-src 'self' 'unsafe-inline' ...` because Next.js inlines
// hydration scripts. 'unsafe-inline' makes XSS protection a
// fiction — it MUST go before flipping to enforce. Two paths:
//  1. Migrate to nonce-based CSP: Next.js middleware generates a
//     per-request nonce, injects it as a header + into <Script
//     nonce={...} />. Strict-dynamic + nonce kills 'unsafe-inline'
//     while preserving Next.js hydration. Tracked work item.
//  2. Migrate to hash-based CSP: enumerate every inline script
//     hash. More fragile across Next upgrades; do not do this.
//
// Path 1 is the right answer; budget ~1 day eng once enforce
// migration is on the calendar.
//
// Response: ALWAYS 204 No Content. We never want a CSP report POST
// to fail user-visibly (it's a side-channel from the browser, not
// a user action). Failures here = log loud, return 204.

import { NextResponse, type NextRequest } from "next/server";
import {
  isAcceptableContentLength,
  DEFAULT_MAX_BYTES,
} from "@/lib/content-length";

export const runtime = "nodejs";

// Per-IP rate limit on the report sink. Without this, a malicious
// page (or a runaway browser bug) can blast us with reports until
// the function-invocation budget burns. Using the in-memory
// rate-limiter is fine for now — the threat model here is
// bandwidth/cost, not security correctness, and the in-memory
// limiter is a soft-throttle. Replace with Redis when the rest
// of rate-limit gets that treatment (see compliance roadmap).
import { isAllowed, clientIp } from "@/lib/rate-limit";

const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  if (!isAllowed(`csp-report:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    // 204 even on rate-limit so the browser doesn't retry.
    return new NextResponse(null, { status: 204 });
  }

  // Content-Length precheck BEFORE buffering the body. Predicate
  // factored out into lib/content-length.ts so this route + the
  // unit tests share the same code (codex round-4 caught that the
  // test was duplicating the predicate). Rejects: missing header,
  // chunked-encoded (no Content-Length), and Number()-coercible
  // junk like "", "1.5", "0x10", "1e3".
  const rawLen = req.headers.get("content-length");
  if (!isAcceptableContentLength(rawLen)) {
    console.warn(
      "[csp-report] rejected: missing/malformed/oversized Content-Length",
      rawLen,
    );
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body = await req.text();
    // Defense-in-depth: also check post-read in case Content-Length
    // header was lying about the body size. Codex round-4 noted
    // that body.length is UTF-16 code units, not bytes — for ASCII
    // CSP reports they're identical, but use Buffer.byteLength to
    // be exact in case a future report includes multibyte UTF-8.
    const byteLen = Buffer.byteLength(body, "utf8");
    if (byteLen > DEFAULT_MAX_BYTES) {
      console.warn("[csp-report] oversized post-read", byteLen);
      console.error("[csp-report]", body.slice(0, 1024));
      return new NextResponse(null, { status: 204 });
    }
    // Log the raw body so triage can grep for blocked-uri patterns
    // in Vercel logs without parsing report-API vs csp-report
    // formats. When CSP enforcement lands, switch this to a
    // structured logger that emits per-violation events into the
    // observability stack (Better Stack / Datadog).
    console.error("[csp-report]", body);
  } catch (err) {
    console.error("[csp-report] read failed", err);
  }

  return new NextResponse(null, { status: 204 });
}

// Browsers may send OPTIONS preflight (Reporting API). Allow it.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
