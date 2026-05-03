// Authenticated fetch helper for client-side API calls. Reads the
// active Supabase session's access token and attaches it as a Bearer
// header so the API routes' getUserFromRequest() can resolve auth.uid().
//
// Without this, the marketing-site browser client persists the session
// in localStorage but doesn't auto-attach it to fetch — so /api/bookings,
// /api/kyc/start, and /api/share-purchase/create-checkout would return
// 401 even with a logged-in user.
//
// Use everywhere a client component calls a server route that needs
// authentication.

"use client";

import { supabase } from "@/lib/supabase";

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
      const token = data.session?.access_token;
      if (token && !headers.has("authorization") && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // getSession() can throw on a corrupt local token; fall through.
    }
  }

  return fetch(input, { ...init, headers });
}
