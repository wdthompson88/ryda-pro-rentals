-- Encrypt KYC verified_outputs PII at rest.
--
-- threat-modeling-expert agent finding KYC T1: today
-- kyc_verifications.verified_outputs is plaintext jsonb. RLS
-- protects authenticated reads but does NOT protect against:
--   - leaked SUPABASE_SERVICE_ROLE_KEY (bypasses every RLS policy)
--   - nightly backups + WAL ship plaintext
--   - PITR restore in a lower-trust environment
--
-- This migration adds verified_outputs_encrypted as a TEXT column
-- holding base64-encoded AES-256-GCM ciphertext (envelope:
-- version + iv + tag + ciphertext). Encryption/decryption happens
-- in lib/pii-encryption.ts using a key from KYC_PII_ENCRYPTION_KEY
-- env var (separate trust boundary from Supabase).
--
-- Migration period (TIME-BOXED to ≤30 days; codex round-1 catch
-- that dual-column writes preserve plaintext in DB + backups + WAL):
--   - Webhook writes BOTH columns until KYC_PII_ENCRYPTION_KEY is
--     deployed AND lands cleanly in prod.
--   - Readers prefer encrypted; in STRICT mode (when key is
--     configured) they fail-closed if a row has no encrypted column,
--     forcing the backfill to complete (lib/kyc-verified-outputs).
--   - Within 30 days of key deployment: ship a follow-up migration
--     (next available number) that (a) backfills any plaintext-only
--     rows by re-encrypting via the application layer, (b) drops the
--     verified_outputs (plaintext) column, (c) makes
--     verified_outputs_encrypted NOT NULL going forward. The
--     follow-up isn't pre-staged in this tree because the backfill
--     step needs the application running with the key — it'll be
--     written when the rollout reaches the cleanup phase.
--
-- Until that cleanup migration ships, plaintext PII still exists
-- in older backups + WAL — defense in depth is partial. The
-- cleanup must not slip past the 30-day window.
--
-- Pre-launch impact: zero — no kyc_verifications rows exist yet.
-- This migration sets up the schema + encryption is exercised on
-- the first real KYC verification.

alter table public.kyc_verifications
  add column if not exists verified_outputs_encrypted text;

-- Marker column: when populated, indicates the row's PII is in the
-- encrypted column and verified_outputs (plaintext) is either null
-- or stale-and-superseded. A future "drop plaintext" migration
-- will require all rows to have encrypted_at IS NOT NULL.
alter table public.kyc_verifications
  add column if not exists encrypted_at timestamptz;

-- Helpful for the eventual cleanup migration that backfills any
-- legacy plaintext-only rows + drops the plaintext column.
create index if not exists kyc_verifications_unencrypted_idx
  on public.kyc_verifications (id)
  where encrypted_at is null and verified_outputs is not null;
