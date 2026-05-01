// Open-redirect / XSS sanitizer for the `?next=` query param used by
// signin, signup, and /auth/callback to bounce members back to the
// gated page they came from.
//
// Without this, a link like https://ryda.com/signin?next=https://evil.com
// would redirect the user off-site after sign-in — classic phishing
// vector. Worse, `router.push("javascript:alert(1)")` is treated by
// Next.js's router as a navigation and the JS executes in our origin
// (per Next docs).
//
// Rules: only allow same-origin paths (`/whatever`). Reject anything
// that could be interpreted as an external URL or a non-http(s) scheme.

const FALLBACK = "/portfolio";

/**
 * Sanitize a `next=` value. Returns `fallback` if input is unsafe.
 *
 * Allow-list: must start with a single `/`, followed by an alphanumeric
 * or one of `_-`. This rejects:
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
  // Must start with `/` — and the second char must NOT be `/` or `\`
  // (which would make the browser interpret it as a host).
  if (!/^\/[A-Za-z0-9_-]/.test(trimmed)) return fallback;
  // Reject control characters anywhere in the path.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return fallback;
  // Cap length so a malicious caller can't fill router state.
  if (trimmed.length > 512) return fallback;
  return trimmed;
}
