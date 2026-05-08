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
//   where email = 'ops@ryda.pro';
//
// To revoke:
//
//   update auth.users
//   set raw_app_meta_data = raw_app_meta_data - 'role'
//   where email = 'ops@ryda.pro';

import type { NextRequest } from "next/server";
import { getUserFromRequestWithDiag } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AdminUser = {
  id: string;
  email: string | null;
};

/** Decode the unsigned `aal` claim from a Supabase JWT. We don't
 *  re-verify the signature — getUserFromRequest already did that
 *  via supabase-js. We just want the assurance-level claim
 *  Supabase Auth stamps after MFA verification. */
function readAalFromJwt(token: string): "aal1" | "aal2" | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    // base64url → base64. Pad to multiple of 4.
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    if (payload?.aal === "aal2") return "aal2";
    if (payload?.aal === "aal1") return "aal1";
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the admin user if the request is authenticated AND that
 * user has app_metadata.role === 'admin'. Returns null otherwise.
 *
 * MFA gate (Item 8 from .launch-prep/LAUNCH_PLAN.md): if env
 * ADMIN_MFA_REQUIRED=true, also requires the JWT to carry
 * aal=aal2 (a session that completed the TOTP step at signin).
 * Pre-flip the env var is unset so we don't lock admins out
 * before they enroll. Pre-flip behavior: log a warning when an
 * aal1 admin call lands so we have telemetry on un-MFA'd actions
 * before flipping the gate.
 *
 * The AAL is read from the SAME token getUserFromRequestWithDiag
 * already verified — codex round-1 caught that re-extracting the
 * token from the request could let an aal2 token from one source
 * masquerade as MFA for an admin verified via a different source.
 *
 * Routes that need admin gating do:
 *   const admin = await requireAdmin(req);
 *   if (!admin) return NextResponse.json({error:'...'}, {status: 403});
 */
export async function requireAdmin(
  req: NextRequest | Request,
): Promise<AdminUser | null> {
  const { user, token } = await getUserFromRequestWithDiag(req);
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

  const mfaRequired = process.env.ADMIN_MFA_REQUIRED === "true";
  // token is guaranteed non-null when user is non-null (api-auth
  // contract); defensive for the type system.
  const aal = token ? readAalFromJwt(token) : null;
  if (aal !== "aal2") {
    if (mfaRequired) {
      console.warn(
        "[admin-auth] denied: admin without aal2 (MFA required)",
        user.email,
      );
      return null;
    }
    console.warn(
      "[admin-auth] aal1 admin action — flip ADMIN_MFA_REQUIRED=true once enrolled",
      user.email,
    );
  }

  return user;
}
