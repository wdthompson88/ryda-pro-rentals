// Strict Content-Length header validation, factored out so the
// route handler at api/csp-report and its unit tests share the
// same predicate. Codex round-4 caught that duplicating the regex
// in the test file pinned the contract but didn't prove the route
// stayed in sync. With this module, both call the same function.
//
// Why strict: Number() coerces "", "1.5", "0x10", "1e3" to finite
// numbers that pass naive `>= 0` checks but aren't valid browser-
// sent Content-Length values. We require a plain integer string
// after trim. See codex rounds 2-3 in the route file.

/** Default cap for CSP-report bodies. Legit reports are sub-1KB;
 *  8192 leaves headroom for legacy/extended report bodies. */
export const DEFAULT_MAX_BYTES = 8192;

const INTEGER_RE = /^[0-9]+$/;

/**
 * True iff the raw header value is a non-empty string of digits
 * (after trim) AND the parsed integer is at most maxBytes.
 *
 * Returns false for: null, "", whitespace, "1.5", "1e3", "0x10",
 * "-1", "+5", NaN/Infinity literals, junk-suffixed values, and
 * any oversized value.
 */
export function isAcceptableContentLength(
  raw: string | null,
  maxBytes: number = DEFAULT_MAX_BYTES,
): boolean {
  if (raw === null) return false;
  const trimmed = raw.trim();
  if (!INTEGER_RE.test(trimmed)) return false;
  const n = parseInt(trimmed, 10);
  return n <= maxBytes;
}
