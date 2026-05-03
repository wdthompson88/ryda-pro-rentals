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
  return (await getUserFromRequestWithDiag(req)).user;
}

// Diagnostic variant: returns the user (or null) plus a `diag` string
// that classifies WHY auth failed. Routes can log this server-side so
// 401s are debuggable without exposing internals to the client.
export async function getUserFromRequestWithDiag(
  req: NextRequest | Request,
): Promise<{
  user: { id: string; email: string | null } | null;
  diag: string;
}> {
  const admin = supabaseAdmin();
  if (!admin) return { user: null, diag: "no_admin_client" };

  // Strategy: try Authorization header first (clean for API clients),
  // then cookies (the browser client uses these by default).
  let token: string | null = null;
  let source = "none";

  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice("Bearer ".length).trim();
    source = "header";
  }

  if (!token) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    // Supabase v2 uses sb-<project-ref>-auth-token. Match flexibly.
    const matches = cookieHeader.match(/sb-[^=]*-auth-token=([^;]+)/);
    if (matches) {
      try {
        const decoded = decodeURIComponent(matches[1]);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && typeof parsed[0] === "string") {
          token = parsed[0];
          source = "cookie_array";
        } else if (parsed?.access_token) {
          token = parsed.access_token;
          source = "cookie_obj";
        } else {
          return { user: null, diag: "cookie_parsed_but_no_token" };
        }
      } catch {
        return { user: null, diag: "cookie_parse_failed" };
      }
    }
  }

  if (!token) {
    // No header, no cookie. Most common cause: client didn't attach
    // the bearer (old bundle, no session) and we're not getting a
    // cookie either (browser localStorage-only Supabase setup).
    return { user: null, diag: "no_token_present" };
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error) {
    // Token reached us but Supabase rejected it. Usually expired or
    // signed by a different project. Surface the error name.
    return {
      user: null,
      diag: `getuser_error:${error.name ?? "unknown"}:${source}`,
    };
  }
  if (!data.user) {
    return { user: null, diag: `getuser_no_user:${source}` };
  }
  return {
    user: { id: data.user.id, email: data.user.email ?? null },
    diag: `ok:${source}`,
  };
}
