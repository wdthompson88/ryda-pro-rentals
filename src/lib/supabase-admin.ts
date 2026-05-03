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
