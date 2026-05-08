// env-loader.ts — minimal .env.local loader for marketing scripts.
//
// Why: tsx doesn't auto-load .env files (Next.js's loader is the
// thing that does it during dev/build). Marketing scripts need
// NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + optional
// CHATGPT_PROFILE_DIR / OPENAI_API_KEY from .env.local. Rather
// than pull a dotenv dep, this is a 30-line parser. It supports
// the basic KEY=value format Next uses.
//
// Precedence: existing process.env values WIN over .env.local
// (consistent with Next.js's behavior). This means CI / shell
// exports always override on-disk config.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Parse a .env file. Supports:
 *    KEY=value
 *    KEY="quoted value"
 *    KEY='single-quoted'
 *    # comment lines
 *    blank lines
 *  Does NOT support multi-line values, variable interpolation, or
 *  the export keyword. Sufficient for Next-style .env.local. */
function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip wrapping quotes (single or double).
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Strip an inline comment if the value isn't quoted.
    const hash = value.indexOf(" #");
    if (hash >= 0) value = value.slice(0, hash).trim();
    out[key] = value;
  }
  return out;
}

/** Look for .env.local relative to cwd, then walk up to repo root.
 *  Stops at the filesystem root or after 5 levels — marketing
 *  scripts run from ryda-web/, so .env.local is at most one level
 *  away in any sensible invocation. */
function findEnvLocal(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, ".env.local");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Load .env.local into process.env. No-op if the file isn't
 *  found. Returns the absolute path that was loaded so callers
 *  can log it. */
export function loadDotEnvLocal(): string | null {
  const file = findEnvLocal();
  if (!file) return null;
  const parsed = parseEnvFile(readFileSync(file, "utf8"));
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
  return file;
}
