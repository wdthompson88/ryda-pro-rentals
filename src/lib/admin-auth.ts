// Admin gating helper. A user is "admin" iff their auth.users row
// has app_metadata.role === 'admin'.
//
// IMPORTANT: this MUST read app_metadata, NOT user_metadata.
// user_metadata is user-controlled — anyone can call
//   supabase.auth.updateUser({ data: { role: 'admin' } })
// from the browser and grant themselves admin. app_metadata is
// service-role-only writable; users can't modify their own
// app_metadata via supabase-js. (Original implementation read
// user_metadata; that was a self-escalation hole. Fixed per audit.)
//
// To grant admin to a user, run this in the Supabase SQL editor or
// via the Management API:
//
//   update auth.users
//   set raw_app_meta_data = jsonb_set(
//     coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'
//   )
//   where email = 'ops@ryda.com';
//
// To revoke:
//
//   update auth.users
//   set raw_app_meta_data = raw_app_meta_data - 'role'
//   where email = 'ops@ryda.com';

import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AdminUser = {
  id: string;
  email: string | null;
};

/**
 * Returns the admin user if the request is authenticated AND that
 * user has app_metadata.role === 'admin'. Returns null otherwise.
 *
 * Routes that need admin gating do:
 *   const admin = await requireAdmin(req);
 *   if (!admin) return NextResponse.json({error:'...'}, {status: 403});
 */
export async function requireAdmin(
  req: NextRequest | Request,
): Promise<AdminUser | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;

  const adminClient = supabaseAdmin();
  if (!adminClient) return null;

  // Pull the auth.users row directly so we see app_metadata
  // (service-role only — users can't write to it). We don't trust
  // the JWT-embedded app_metadata for this check because it can
  // lag a role change (token has the OLD role until refresh).
  const { data, error } = await adminClient.auth.admin.getUserById(user.id);
  if (error || !data?.user) return null;
  const appMeta = (data.user as { app_metadata?: Record<string, unknown> })
    .app_metadata;
  if (appMeta?.role !== "admin") return null;
  return user;
}
