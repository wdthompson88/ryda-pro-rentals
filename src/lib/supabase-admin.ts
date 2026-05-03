// Server-side Supabase client with the service-role key. Bypasses
// Row-Level Security so API routes can write to share_purchases,
// share_holdings, and bookings on behalf of authenticated users.
//
// NEVER import this from a client component. The service-role key
// gives full read/write access to every table; leaking it to the
// browser is a full-takeover bug.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  if (!url || !serviceRoleKey) return null;
  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      // Server client never persists or refreshes. Each request
      // attaches whatever auth context it needs explicitly.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}

export function requireSupabaseAdmin(): SupabaseClient {
  const c = supabaseAdmin();
  if (!c) {
    throw new Error(
      "Supabase admin not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return c;
}

// Server-side client init'd with the *publishable/anon* key. Used
// only for validating user JWTs via auth.getUser(token).
//
// Why a separate client: Supabase's /auth/v1/user endpoint requires
// the apikey header to be the publishable (sb_publishable_*) form.
// supabase-js's admin client (init'd with the sb_secret_* service
// role key) sends that secret key as the apikey, and auth/v1/user
// rejects it with "Invalid API key" because it tries to interpret
// the value as a JWT (which fails the missing-sub-claim check).
//
// PostgREST + storage + admin endpoints (/auth/v1/admin/*) all
// accept the secret key, so the existing admin client stays for
// every read/write. Token validation is the only call that needs
// the anon-keyed client.
let cachedAuthClient: SupabaseClient | null = null;

export function supabaseAuthValidator(): SupabaseClient | null {
  if (cachedAuthClient) return cachedAuthClient;
  if (!url || !anonKey) return null;
  cachedAuthClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedAuthClient;
}
