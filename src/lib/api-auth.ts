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
import { supabaseAuthValidator } from "@/lib/supabase-admin";

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
  /** The access token we validated. Exposed so callers (e.g.
   *  admin-auth) can inspect claims like `aal` from the SAME
   *  token Supabase verified — not re-extract from the request
   *  and risk a different source winning. Codex round-1 catch
   *  on the AAL gate. */
  token: string | null;
}> {
  // Token validation MUST go through the anon-keyed client, not the
  // service-role admin client. /auth/v1/user rejects the new
  // sb_secret_* format as the apikey ("Invalid API key"); it accepts
  // the sb_publishable_* / anon-JWT form. Bug surfaced as
  // diag=getuser_error:AuthApiError:401:valid:iss_ok:Invalid_API_key
  // — the user's JWT was fine, the server's apikey was the wrong one.
  const validator = supabaseAuthValidator();
  if (!validator) return { user: null, token: null, diag: "no_admin_client" };

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
          return { user: null, token: null, diag: "cookie_parsed_but_no_token" };
        }
      } catch {
        return { user: null, token: null, diag: "cookie_parse_failed" };
      }
    }
  }

  if (!token) {
    // No header, no cookie. Most common cause: client didn't attach
    // the bearer (old bundle, no session) and we're not getting a
    // cookie either (browser localStorage-only Supabase setup).
    return { user: null, token: null, diag: "no_token_present" };
  }

  // Decode the JWT WITHOUT verifying — purely for diag. We surface
  // (a) tokenAge: expired-seconds-ago / valid-for-seconds, and
  // (b) issuerDiag: whether the token's `iss` host matches the
  //     NEXT_PUBLIC_SUPABASE_URL host the server expects. A
  //     mismatch is the smoking gun for "client and server are
  //     wired to different Supabase projects".
  // Don't trust anything from this; it's just to debug 401s.
  let tokenAge: string = "no_exp";
  let issuerDiag: string = "iss_unknown";
  try {
    const payload = token.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      );
      if (typeof decoded.exp === "number") {
        const ageSec = Math.floor(Date.now() / 1000) - decoded.exp;
        tokenAge = ageSec >= 0 ? `expired_${ageSec}s` : `valid_${-ageSec}s`;
      }
      const expectedHost = process.env.NEXT_PUBLIC_SUPABASE_URL
        ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
        : "";
      const issuerHost =
        typeof decoded.iss === "string" ? new URL(decoded.iss).host : "";
      if (issuerHost && expectedHost) {
        issuerDiag =
          issuerHost === expectedHost
            ? "iss_ok"
            : `iss_mismatch:${issuerHost}_vs_${expectedHost}`;
      } else {
        issuerDiag = "iss_missing";
      }
    }
  } catch {
    tokenAge = "decode_failed";
  }

  const { data, error } = await validator.auth.getUser(token);
  if (error) {
    // Token reached us but Supabase rejected it. Surface the error
    // name + status + message + token age + issuer-match.
    const errStatus = (error as { status?: number }).status ?? "?";
    const errMsg = (error.message ?? "").slice(0, 60).replace(/[^\w\s.:-]/g, "_");
    return {
      user: null,
      token: null,
      diag: `getuser_error:${error.name ?? "unknown"}:${errStatus}:${tokenAge}:${issuerDiag}:${source}:${errMsg}`,
    };
  }
  if (!data.user) {
    return {
      user: null,
      token: null,
      diag: `getuser_no_user:${tokenAge}:${source}`,
    };
  }
  return {
    user: { id: data.user.id, email: data.user.email ?? null },
    token,
    diag: `ok:${source}`,
  };
}
