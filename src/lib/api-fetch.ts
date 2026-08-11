// Authenticated fetch helper for client-side API calls. Reads the
// active Supabase session's access token and attaches it as a Bearer
// header so the API routes' getUserFromRequest() can resolve auth.uid().
//
// Without this, the marketing-site browser client persists the session
// in localStorage but doesn't auto-attach it to fetch — so
// /api/rental-inquiry, /api/partner/me, the /api/admin/* routes and
// /api/kyc/start would return 401 even with a logged-in user.
//
// Use everywhere a client component calls a server route that needs
// authentication.

"use client";

import { supabase } from "@/lib/supabase";

// Refresh the session when the cached access token is within this
// window of expiry. Tokens default to 1h; we refresh proactively if
// less than this remains so the API call carries a fresh JWT.
const REFRESH_BEFORE_EXPIRY_SECONDS = 60;

export async function authedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});

  // Attach access token if we have a session. Soft-fail if Supabase
  // isn't configured (preview deploys) — the API route will return
  // 401 with a clean error in that case.
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      let session = data.session;

      // supabase-js v2's getSession() returns the cached session
      // verbatim — it does NOT auto-refresh on read. autoRefreshToken
      // handles this on a timer, but if the tab was backgrounded /
      // throttled / restored from disk cache, the timer can miss its
      // window and we'd send an expired JWT to the API (server
      // returns 401 with diag=getuser_error:AuthApiError:header).
      // Detect a stale-or-near-stale token and force-refresh before
      // attaching.
      if (session?.expires_at) {
        const expiresAtMs = session.expires_at * 1000;
        const refreshThresholdMs =
          Date.now() + REFRESH_BEFORE_EXPIRY_SECONDS * 1000;
        if (expiresAtMs <= refreshThresholdMs) {
          const refresh = await supabase.auth.refreshSession();
          if (refresh.data.session) {
            session = refresh.data.session;
          } else {
            // Refresh failed (refresh_token also expired, e.g. user
            // hasn't been on the site in over a week). Don't keep
            // sending the known-stale token — clear it so the API
            // returns a clean 401 with no_token_present and the
            // caller's "Sign in required" copy surfaces.
            session = null;
          }
        }
      }

      const token = session?.access_token;
      if (
        token &&
        !headers.has("authorization") &&
        !headers.has("Authorization")
      ) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // getSession() / refreshSession() can throw on a corrupt local
      // token; fall through to the unauthenticated path.
    }
  }

  return fetch(input, { ...init, headers });
}
