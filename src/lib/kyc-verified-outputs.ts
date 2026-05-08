// Reader/writer helpers for kyc_verifications.verified_outputs.
//
// Bridges the migration period where the column lives in two
// places: verified_outputs (legacy plaintext jsonb) and
// verified_outputs_encrypted (new AES-256-GCM ciphertext text).
// Once the backfill migration runs and plaintext is dropped, the
// fallback path in readVerifiedOutputs will be a no-op and can be
// removed.
//
// Why a separate module: callers (5 routes today) shouldn't have
// to know about the dual-column situation OR perform the
// encrypt/decrypt themselves. They call read or build helpers and
// get back the typed jsonb shape they expect.

import {
  isPiiEncryptionConfigured,
  encryptJson,
  decryptVerifiedOutputs,
} from "./pii-encryption";
import "server-only";

/** The shape Stripe Identity returns + we consume. */
export type VerifiedOutputs = {
  first_name?: string;
  last_name?: string;
  dob?: { day?: number; month?: number; year?: number };
  address?: Record<string, string>;
  id_number?: string;
} | null;

/** Row shape readers should select to use this helper. Pull both
 *  columns so the fallback works seamlessly. */
export type RowWithVerifiedOutputs = {
  verified_outputs?: VerifiedOutputs | unknown;
  verified_outputs_encrypted?: string | null;
};

/**
 * Return the decoded verified_outputs from a kyc_verifications row.
 *
 * Strict mode triggers ONLY on env-var PRESENCE
 * (KYC_PII_ENCRYPTION_KEY set), NOT on isPiiEncryptionConfigured().
 * Codex round-2 catch: a configured-but-invalid key would have
 * returned false from isPiiEncryptionConfigured + silently fallen
 * through to plaintext, defeating encryption-at-rest. Operator
 * intent (env var set) is what matters; a malformed key is a
 * deploy bug that should fail loud, not a license to leak
 * plaintext.
 *
 * Strict mode (KYC_PII_ENCRYPTION_KEY set): only read encrypted.
 *   - encrypted column present → decrypt (throws on tamper/wrong-key)
 *   - encrypted column null → return null (stale legacy row;
 *     calling route surfaces "complete identity verification")
 *   - decryptVerifiedOutputs throws → propagate (security signal)
 *
 * Lenient mode (no key set — pre-rollout / dev): fall back to
 * plaintext for legacy rows. Keeps dev working before key deploy.
 */
export function readVerifiedOutputs(row: RowWithVerifiedOutputs): VerifiedOutputs {
  if (row.verified_outputs_encrypted) {
    return decryptVerifiedOutputs(row.verified_outputs_encrypted);
  }
  // Strict mode based on env-var PRESENCE, not decoded validity.
  // A malformed key crashes inside decryptVerifiedOutputs / encryptJson
  // when called — but we never reach those paths here because the
  // encrypted column is null.
  if (process.env.KYC_PII_ENCRYPTION_KEY !== undefined) {
    console.warn(
      "[kyc-verified-outputs] strict mode: row missing encrypted column",
    );
    return null;
  }
  if (row.verified_outputs && typeof row.verified_outputs === "object") {
    return row.verified_outputs as VerifiedOutputs;
  }
  return null;
}

/**
 * Build the UPDATE/INSERT payload for writing verified_outputs.
 *
 * Three modes (driven by env var presence + validity):
 *   - Env UNSET (pre-rollout / dev): write plaintext only.
 *   - Env SET + valid: write BOTH encrypted + plaintext during the
 *     30-day migration window (cleanup migration drops plaintext).
 *   - Env SET + invalid: throw. Codex round-3 catch — operator
 *     intent (env set) means encryption is required; falling back
 *     to plaintext-only would defeat encryption-at-rest. The
 *     thrown error lands in the route's 503-on-write-failure
 *     path so Stripe retries instead of permanently writing
 *     plaintext to a row that was supposed to be encrypted.
 *
 * Caller is the KYC webhook handler. It calls this once per
 * 'verified' event and merges the result into its existing
 * update payload.
 */
export function buildVerifiedOutputsWrite(
  outputs: VerifiedOutputs,
): Record<string, unknown> {
  if (!outputs) return {};
  const payload: Record<string, unknown> = {};
  const envSet = process.env.KYC_PII_ENCRYPTION_KEY !== undefined;
  if (envSet) {
    // encryptJson throws on invalid key — let it propagate so the
    // webhook route 503s and Stripe retries. We do NOT silently
    // fall back to plaintext-only when the operator clearly
    // intended encryption.
    payload.verified_outputs_encrypted = encryptJson(outputs);
    payload.encrypted_at = new Date().toISOString();
  }
  // Keep writing plaintext until the follow-up cleanup migration
  // drops the column (per migration 0029 30-day window).
  // Single-point-of-failure during the migration period: if key
  // rotation goes wrong, plaintext still lets us recover. After
  // cleanup migration ships, this line goes away.
  payload.verified_outputs = outputs;
  return payload;
}
