// Helper for API routes that need the Supabase auth.uid() on the server.
// Reads the access token from the standard `sb-access-token` cookie that
// Supabase's browser client sets on sign-in.
//
// Usage:
//   const userId = await requireUserId(req);
// Throws/returns null when:
//   - Supabase isn't configured (preview without keys)
//   - No valid bearer token in cookies/headers
//   - Token is expired or invalid

import { type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getUserFromRequest(
  req: NextRequest | Request,
): Promise<{ id: string; email: string | null } | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;

  // Strategy: try Authorization header first (clean for API clients),
  // then cookies (the browser client uses these by default).
  let token: string | null = null;

  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
  }

  if (!token) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    // Supabase v2 uses sb-<project-ref>-auth-token. Match flexibly.
    const matches = cookieHeader.match(/sb-[^=]*-auth-token=([^;]+)/);
    if (matches) {
      try {
        // Cookie value is URL-encoded JSON [access_token, refresh_token, ...]
        const decoded = decodeURIComponent(matches[1]);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && typeof parsed[0] === "string") {
          token = parsed[0];
        } else if (parsed?.access_token) {
          token = parsed.access_token;
        }
      } catch {
        // Malformed cookie; fall through.
      }
    }
  }

  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
