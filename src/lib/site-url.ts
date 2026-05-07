// Single source of truth for the site's canonical origin. Lives in
// its own module so every page that builds canonical URLs / JSON-LD
// `@id` values normalizes the same way.
//
// Codex review on the SEO batch caught that an env-set
// NEXT_PUBLIC_SITE_URL with a trailing slash would generate URLs
// like "https://ryda.pro//portfolio/..." — duplicate "//" breaks
// Google canonicalization and looks like a bug to crawlers. We strip
// trailing slashes once here so callers never have to remember.
//
// No "server-only" import — this is a public origin string used in
// both server-rendered pages (for OG/canonical) and client-fetched
// JSON-LD bundles. Holds no secrets.

const RAW = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ryda.pro";

/** Canonical site origin, never with a trailing slash.
 *  Use this for canonical URLs, OG URLs, and JSON-LD `@id`/`url`. */
export const SITE_URL = RAW.replace(/\/+$/, "");

/** Convert a human-readable date like "Apr 27, 2026" to ISO 8601
 *  ("2026-04-27"). Returns the input unchanged if it's already
 *  ISO-shaped or can't be parsed — Google tolerates the original
 *  better than a bad guess. */
export function toIsoDate(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return date;
  return new Date(t).toISOString().slice(0, 10);
}
