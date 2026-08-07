// Helper: durable record of an admin action. Used by every admin
// API route to leave an audit trail. Admin actions touch shared
// state (KYC overrides, refunds, transfer acks, etc.) so we want
// a service-role-only durable answer to "who did this, when, why."
//
// Persists to admin_audit_log (migration 0018). Failures here are
// non-fatal but logged loudly — the action itself takes precedence
// over the audit row, but if writes are failing in a steady-state
// way we want the warning to surface.

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAction =
  | "kyc_override"
  | "refund_issued"
  | "transfer_ack"
  | "transfer_reject"
  | "resend_amendment"
  | "booking_canceled"
  | "purchase_marked_paid"
  | "role_granted"
  | "role_revoked"
  | "partner_status_changed"
  // Operator roster (partners, 0041). Post-unification these are
  // partner-program lifecycle events, not bookkeeping: commission_rate
  // is RYDA's application fee on every live charge, and status
  // active/paused is the switch that blocks or restores payment links.
  | "partner_operator_created"
  | "partner_operator_updated"
  | "email_sent";

/** Record one admin action. Returns true on durable persistence. */
export async function recordAdminAction(
  admin: SupabaseClient,
  params: {
    adminUserId: string;
    action: AdminAction;
    targetType: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<boolean> {
  const { error } = await admin.from("admin_audit_log").insert({
    admin_user_id: params.adminUserId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    details: params.details ?? null,
  });
  if (error) {
    console.error("[admin-audit · record]", error);
    return false;
  }
  return true;
}
