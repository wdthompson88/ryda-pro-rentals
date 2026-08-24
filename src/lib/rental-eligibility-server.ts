// Load a renter's identity state and decide whether they may be handed
// the keys. (Build loop 1A.)
//
// The server half of rental-eligibility.ts. That module is pure and holds
// the RULES; this one does the reading, because reading involves the
// service-role client and decrypting PII, and neither belongs in a module
// a client component might import.
//
// `server-only` is load-bearing: readVerifiedOutputs decrypts a date of
// birth taken off a government ID, and the module graph that reaches it
// must never end up in a browser bundle.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readVerifiedOutputs } from "./kyc-verified-outputs";
import {
  decideRentalEligibility,
  type KycStatus,
  type RentalEligibility,
  type VerifiedDob,
} from "./rental-eligibility";

/**
 * Decide eligibility for one renter on one booking.
 *
 * FAILS CLOSED, and that is the whole posture of this function. A read
 * that errors — the table missing, a decrypt throwing on a tampered row,
 * the service-role client unavailable — returns NOT eligible, not
 * "unknown, carry on". The thing on the other side of this check is
 * handing a stranger a car worth more than a house, so an outage
 * postponing a confirmation is the acceptable failure and an outage
 * waving one through is not.
 *
 * The one nuance: a decrypt that THROWS is a security signal (0029's
 * strict mode propagates it deliberately), so it is caught here and
 * turned into `identity_failed` rather than a 500 — the operator gets a
 * refusal they can act on and the incident lands in the log, instead of
 * an unexplained error on an approval button.
 */
export async function loadRentalEligibility(
  db: SupabaseClient,
  renterUserId: string,
  startDate: string,
): Promise<RentalEligibility> {
  let status: KycStatus | null = null;
  let dob: VerifiedDob = null;

  try {
    // Newest first: a renter who failed once and re-verified has two
    // rows, and the latest is the one that counts.
    const res = await db
      .from("kyc_verifications")
      .select("status, verified_outputs, verified_outputs_encrypted, created_at")
      .eq("user_id", renterUserId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (res.error) {
      console.warn("[rental-eligibility · kyc read]", res.error.message);
      // No row we can trust → treat as not started. Blocks, as intended.
      return decideRentalEligibility({ kycStatus: null, dob: null, startDate });
    }

    const row = (res.data ?? [])[0] as
      | {
          status?: string;
          verified_outputs?: unknown;
          verified_outputs_encrypted?: string | null;
        }
      | undefined;

    if (!row) {
      return decideRentalEligibility({ kycStatus: null, dob: null, startDate });
    }

    status = (row.status ?? null) as KycStatus | null;

    // Only decrypt when the status says there is something worth reading.
    // A requires_input row has no outputs, and attempting a decrypt on it
    // would turn a normal state into a logged security signal.
    if (status === "verified") {
      const outputs = readVerifiedOutputs(row);
      dob = outputs?.dob ?? null;
    }
  } catch (err) {
    // Includes decryptVerifiedOutputs throwing on tamper or a wrong key —
    // 0029 propagates that on purpose. Loud in the log, a refusal to the
    // caller, never a pass.
    console.error("[rental-eligibility · verified outputs]", err);
    return decideRentalEligibility({
      kycStatus: "requires_action",
      dob: null,
      startDate,
    });
  }

  return decideRentalEligibility({ kycStatus: status, dob, startDate });
}
