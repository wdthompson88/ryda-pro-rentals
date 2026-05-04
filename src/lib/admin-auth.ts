// Admin gating helper. A user is "admin" iff their auth.users
// row has user_metadata.role === 'admin'. This is set manually
// per user via the Supabase dashboard or via a one-shot SQL:
//
//   update auth.users set raw_user_meta_data =
//     jsonb_set(raw_user_meta_data, '{role}', '"admin"')
//   where email = 'ops@ryda.com';
//
// We deliberately don't expose a self-service "make me admin" path.
// Roles are added by ops out-of-band.

import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AdminUser = {
  id: string;
  email: string | null;
};

/**
 * Returns the admin user if the request is authenticated AND that
 * user has user_metadata.role === 'admin'. Returns null otherwise.
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

  // Pull the auth.users row directly to read user_metadata.role.
  // We don't trust the JWT-embedded metadata for this check because
  // it can lag a role change (token has the OLD role until refresh).
  const { data, error } = await adminClient.auth.admin.getUserById(user.id);
  if (error || !data?.user) return null;
  const meta = data.user.user_metadata as Record<string, unknown> | undefined;
  if (meta?.role !== "admin") return null;
  return user;
}
