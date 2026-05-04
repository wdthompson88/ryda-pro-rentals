-- supabase/tests/rls.sql
--
-- Smoke-test queries for the Row-Level Security policies that gate
-- multi-tenant data on RYDA. Run as the AUTHENTICATED role with a
-- specific user's JWT context to verify the policy denies cross-
-- tenant reads.
--
-- Run: open the Supabase SQL editor, click the "Run as: authenticated"
-- toggle, paste each section below as a separate query, replacing the
-- placeholder UUIDs with two real test-account UUIDs (call them USER_A
-- and USER_B). Each query should return ZERO rows or "permission
-- denied" — never another user's row.
--
-- Last verified: 2026-05-04 against migrations 0001-0019.
-- Re-run after every migration that touches RLS policies (especially
-- 0010 kyc, 0014 user_profiles, 0016 share_transfers, 0019 transfers
-- RLS scope).

-- =========================================================
-- 1. share_purchases — should see only your own pending/paid rows
-- =========================================================
-- Setup (service role): insert one row per user.
-- INSERT INTO share_purchases (user_id, email, name, vehicle_symbol,
--   shares, price_per_share, acquisition_fee, total_cents, status)
-- VALUES
--   ('USER_A_UUID', 'a@example.com', 'A', 'F296', 2, 28333, 2834, 6080000, 'pending'),
--   ('USER_B_UUID', 'b@example.com', 'B', 'L296', 2, 28333, 2834, 6080000, 'pending');

-- As USER_A: SHOULD return only A's row.
SELECT id, user_id, email, status FROM public.share_purchases;

-- As USER_A: SHOULD return zero rows (B's row).
SELECT * FROM public.share_purchases WHERE user_id = 'USER_B_UUID';

-- =========================================================
-- 2. share_holdings — same constraint
-- =========================================================
-- As USER_A: returns only A's holdings.
SELECT id, user_id, vehicle_symbol, shares FROM public.share_holdings;

-- =========================================================
-- 3. bookings — same
-- =========================================================
SELECT id, user_id, vehicle_symbol, status FROM public.bookings;

-- =========================================================
-- 4. kyc_verifications — your own status only
-- =========================================================
-- The policy is `auth.uid() = user_id`. Defense in depth: the recipient
-- transfer page also adds .eq("user_id", user.id) explicitly.
SELECT id, user_id, status FROM public.kyc_verifications;

-- =========================================================
-- 5. user_profiles — your own row only
-- =========================================================
SELECT user_id, full_name, phone, address_line_1
FROM public.user_profiles;

-- =========================================================
-- 6. share_transfers — sender OR named recipient (status-scoped)
-- =========================================================
-- As USER_A (the sender): SHOULD see A's outgoing rows.
SELECT id, from_user_id, to_user_email, status
FROM public.share_transfers
WHERE from_user_id = 'USER_A_UUID';

-- As USER_B (the named recipient by email):
-- - Pre-claim row (status='requested', to_user_id IS NULL): visible.
-- - Post-claim row (to_user_id = USER_B): visible.
-- - Post-claim row to a DIFFERENT user: NOT visible (after migration 0019).
SELECT id, status, to_user_email, to_user_id
FROM public.share_transfers
WHERE to_user_email = 'b@example.com';

-- Edge case after 0019 — if B's email gets reused later by USER_C,
-- USER_C should NOT see historical rows where to_user_id = USER_B.
-- Set up a row: status='completed', to_user_id=USER_B_UUID, to_user_email='b@example.com'.
-- Then assume USER_C registers with 'b@example.com' (after rotation).
-- As USER_C: SHOULD return zero rows.
-- (Manual test — requires email rotation simulation.)

-- =========================================================
-- 7. admin_audit_log — NO authenticated access at all
-- =========================================================
-- As any non-admin user (and even admins via the authenticated role —
-- admin reads go through the /api/admin/audit service-role route):
-- SHOULD return permission denied or zero rows.
SELECT * FROM public.admin_audit_log LIMIT 1;

-- =========================================================
-- 8. waitlist + investor_inquiries + contact_messages — INSERT only
-- =========================================================
-- Anon role can INSERT but not SELECT (the form posts; we don't want
-- anyone enumerating the list).
-- As anon:
INSERT INTO public.waitlist (email, source) VALUES ('test@x.com', 'rls-test');
SELECT * FROM public.waitlist; -- SHOULD return zero rows or denied.

-- =========================================================
-- 9. document_signatures + llc_amendments — owner-only
-- =========================================================
-- As USER_A: only A's document_signatures rows.
SELECT id, user_id, document_type, signed_at
FROM public.document_signatures;

-- As USER_A: only amendments for purchases A owns.
SELECT a.id, a.purchase_id, a.emailed
FROM public.llc_amendments a
JOIN public.share_purchases p ON p.id = a.purchase_id
WHERE p.user_id = 'USER_A_UUID';

-- =========================================================
-- Wrap-up
-- =========================================================
-- Every section above SHOULD pass. If ANY returns a row from a
-- different user_id, an RLS policy is broken. Capture the failing
-- query + JWT in an incident ticket and lock down the table before
-- shipping.
