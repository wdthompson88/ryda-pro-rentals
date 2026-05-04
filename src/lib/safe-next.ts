// Open-redirect / XSS sanitizer for the `?next=` query param used by
// signin, signup, and /auth/callback to bounce members back to the
// gated page they came from.
//
// Without this, a link like https://ryda.pro/signin?next=https://evil.com
// would redirect the user off-site after sign-in, classic phishing
// vector. Worse, `router.push("javascript:alert(1)")` is treated by
// Next.js's router as a navigation and the JS executes in our origin
// (per Next docs).
//
// Rules: only allow same-origin paths (`/whatever`). Reject anything
// that could be interpreted as an external URL or a non-http(s) scheme.

// Sign-in / auth-callback fallback. Was `/portfolio` — but that route
// is the public sample-data demo, not the member dashboard. Members
// who hit a sign-in flow with no ?next= param land on /account, the
// real authenticated overview. /portfolio remains for the marketing
// preview surface only.
const FALLBACK = "/account";

/**
 * Sanitize a `next=` value. Returns `fallback` if input is unsafe.
 *
 * Allow-list: must start with a single `/`, followed by EITHER:
 *   - an alphanumeric or `_-` (a path char), OR
 *   - `?` (query-only URL like `/?ref=miami`), OR
 *   - `#` (fragment-only URL like `/#section`), OR
 *   - end-of-string (just `/`).
 *
 * This rejects:
 *   - protocol-relative URLs (`//evil.com`)
 *   - absolute URLs (`https://evil.com`, `http://...`)
 *   - dangerous schemes (`javascript:`, `data:`, `vbscript:`, etc.)
 *   - Windows backslash tricks (`/\evil.com`)
 *   - empty, null, undefined, non-string inputs
 *   - control characters and whitespace before the path
 */
export function safeNext(
  input: string | null | undefined,
  fallback: string = FALLBACK,
): string {
  if (typeof input !== "string") return fallback;
  const trimmed = input.trim();
  if (trimmed.length === 0) return fallback;
  // Bare `/` is fine.
  if (trimmed === "/") return trimmed;
  // Must start with `/`. Second char can be a path char OR query/fragment
  // start, but never `/` or `\` (host-confusion) or anything else odd.
  if (!/^\/[A-Za-z0-9_\-?#]/.test(trimmed)) return fallback;
  // Backslash anywhere in the path is suspicious, browsers normalize
  // `\` → `/` in URLs, so `/x\evil.com` could become `/x/evil.com`
  // (cross-origin) when the router expands it. Reject the whole input.
  if (/\\/.test(trimmed)) return fallback;
  // Reject percent-encoded backslash (%5C) and double-encoded slash
  // (%2F%2F → //), defense in depth in case a future code path
  // decodes the value before rendering it. Case-insensitive.
  if (/%5[Cc]|%2[Ff]%2[Ff]/.test(trimmed)) return fallback;
  // Reject control characters anywhere in the path.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return fallback;
  // Reject zero-width / bidirectional override Unicode, these don't
  // create open redirects but enable URL-bar visual spoofing on the
  // destination page (e.g. U+202E reverses display direction).
  // Range: ZWSP/ZWNJ/ZWJ/LRM/RLM (200B-200F), LRE/RLE/PDF/LRO/RLO
  // (202A-202E), word-joiner (2060), BOM (FEFF).
  if (/[​-‏‪-‮⁠﻿]/.test(trimmed)) return fallback;
  // Cap length so a malicious caller can't fill router state.
  if (trimmed.length > 512) return fallback;
  return trimmed;
}
