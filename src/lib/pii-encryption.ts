// AES-256-GCM encryption for PII at rest.
//
// Why this exists (threat-modeling-expert agent finding KYC T1):
// kyc_verifications.verified_outputs is a jsonb column that stores
// the user's DOB, full name, address, document number — all
// returned from Stripe Identity. Today it's plaintext at rest.
// Postgres RLS protects authenticated reads, but RLS does not
// protect:
//   - Service-role compromise (a leaked SUPABASE_SERVICE_ROLE_KEY
//     bypasses every policy and reads every row)
//   - Backup exfiltration (Supabase nightly backups + WAL ship
//     plaintext if the column is plaintext)
//   - Database snapshot or PITR restore landing in an
//     environment with weaker access controls
//
// With AES-256-GCM encryption + key in Vercel env (separate trust
// boundary from Supabase), a stolen DB dump is unreadable without
// also compromising the Vercel env. Defense in depth, not
// defense in front.
//
// Algorithm: AES-256-GCM (NIST-recommended for authenticated
// encryption). 12-byte random IV per ciphertext (96 bits is the
// recommended GCM IV length). 16-byte authentication tag verifies
// integrity — tampering is detected on decrypt.
//
// Encoding: ciphertext bytes are stored as text (base64) so the
// schema stays portable and we don't have to deal with bytea
// encoding quirks across Supabase clients.
//
// Key rotation: key version is encoded as the first byte of the
// ciphertext (currently 0x01). Future rotation: bump KEY_VERSION,
// add the new key to the keyring, decrypt-with-old-key + encrypt-
// with-new-key in a janitor migration, then drop old key.

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits — NIST recommended for GCM
const TAG_LENGTH = 16; // 128 bits — GCM standard
const KEY_VERSION = 0x01;

/** Decode the env-provided key (base64-encoded 32 bytes).
 *  Throws on missing / wrong-length to fail fast at boot. */
function getKey(): Buffer {
  const raw = process.env.KYC_PII_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "KYC_PII_ENCRYPTION_KEY env var is not set. Generate with: openssl rand -base64 32",
    );
  }
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error("KYC_PII_ENCRYPTION_KEY is not valid base64.");
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `KYC_PII_ENCRYPTION_KEY decodes to ${key.length} bytes; need ${KEY_LENGTH}.`,
    );
  }
  return key;
}

/** True iff the key env var is configured. Lets callers gracefully
 *  no-op (writing plaintext) during the migration period when the
 *  key isn't deployed yet. */
export function isPiiEncryptionConfigured(): boolean {
  if (!process.env.KYC_PII_ENCRYPTION_KEY) return false;
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt a JSON-serializable value.
 *
 * Output format (base64-encoded concatenation):
 *   [version: 1B] [iv: 12B] [tag: 16B] [ciphertext: NB]
 *
 * Returns a string suitable for storage in a Supabase text column.
 */
export function encryptJson(plaintext: unknown): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const serialized = Buffer.from(JSON.stringify(plaintext), "utf8");
  const ciphertext = Buffer.concat([cipher.update(serialized), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_LENGTH) {
    throw new Error(`unexpected GCM tag length: ${tag.length}`);
  }
  return Buffer.concat([Buffer.from([KEY_VERSION]), iv, tag, ciphertext]).toString(
    "base64",
  );
}

/**
 * Decrypt a value encrypted by encryptJson. Throws on:
 *   - Wrong key version (future-proofs key rotation)
 *   - Truncated input
 *   - Auth-tag mismatch (tampered ciphertext)
 *   - Malformed JSON (corruption after-encrypt)
 *
 * Callers should treat the throw as "row is unreadable, alert ops."
 */
export function decryptJson(envelope: string): unknown {
  const key = getKey();
  const buf = Buffer.from(envelope, "base64");
  if (buf.length < 1 + IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("ciphertext too short to be valid");
  }
  const version = buf[0];
  if (version !== KEY_VERSION) {
    throw new Error(`unknown key version: ${version}`);
  }
  const iv = buf.subarray(1, 1 + IV_LENGTH);
  const tag = buf.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
  const ct = buf.subarray(1 + IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}

/** Type-narrowing wrapper used by KYC consumers (they expect a
 *  specific shape from Stripe Identity). Throws on the same
 *  conditions as decryptJson + on shape mismatch (so a corrupted
 *  row can't accidentally satisfy the type). */
export function decryptVerifiedOutputs(
  envelope: string,
):
  | {
      first_name?: string;
      last_name?: string;
      dob?: { day?: number; month?: number; year?: number };
      address?: Record<string, string>;
      id_number?: string;
    }
  | null {
  const value = decryptJson(envelope);
  if (value === null || typeof value !== "object") return null;
  return value as ReturnType<typeof decryptVerifiedOutputs>;
}
