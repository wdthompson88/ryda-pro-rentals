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
-- 10. rental_listings + rental_listing_photos — public browse,
--     operator-scoped writes  (migration 0044)
-- =========================================================
-- Acceptance check for build-loop task 0A. Unlike every section above
-- it, the FIRST query here is supposed to RETURN ROWS: the rental grid
-- is browsed by logged-out visitors, which is the deliberate opposite
-- of the co-ownership calendar's members-only posture.
--
-- Setup (service role). Two operators, and one approved staff login on
-- the first of them:
--   INSERT INTO public.partners (name, market) VALUES
--     ('RLS Test Operator A', 'Miami'), ('RLS Test Operator B', 'Miami');
--   -- OP_A_UUID / OP_B_UUID = the ids those two rows got.
--   UPDATE public.partner_accounts
--      SET partner_id = 'OP_A_UUID', status = 'approved'
--    WHERE user_id = 'USER_A_UUID';
--   INSERT INTO public.rental_listings
--     (partner_id, slug, make, model, category, daily_rate_cents, status)
--   VALUES
--     ('OP_A_UUID','rls-test-active','Lamborghini','Huracan','Exotic',110500,'active'),
--     ('OP_A_UUID','rls-test-draft', 'Ferrari',    '296',    'Exotic',125000,'draft'),
--     ('OP_B_UUID','rls-test-other', 'Porsche',    '911',    'Exotic', 85000,'active');

-- As ANON (signed out): SHOULD return the two 'active' rows and NOT the
-- draft. Zero rows here means /rent is empty for logged-out visitors.
SELECT slug, status FROM public.rental_listings ORDER BY slug;

-- As ANON: SHOULD return zero rows. Drafts are never public.
SELECT slug FROM public.rental_listings WHERE status = 'draft';

-- As USER_A (approved staff of operator A): SHOULD return A's active
-- AND A's draft, plus B's active row (it is public) — but the draft is
-- the one that matters: without it, an operator cannot see their own
-- work in progress.
SELECT slug, status FROM public.rental_listings ORDER BY slug;

-- As USER_A: SHOULD SUCCEED — an operator adds to their own fleet.
INSERT INTO public.rental_listings
  (partner_id, slug, make, model, category, daily_rate_cents)
VALUES ('OP_A_UUID', 'rls-test-mine', 'Audi', 'R8', 'Exotic', 90000);

-- As USER_A: SHOULD FAIL with a row-level-security violation — you may
-- not create inventory under another operator.
INSERT INTO public.rental_listings
  (partner_id, slug, make, model, category, daily_rate_cents)
VALUES ('OP_B_UUID', 'rls-test-stolen', 'Audi', 'R8', 'Exotic', 90000);

-- As USER_A: SHOULD affect ZERO rows. A policy hides the row from the
-- UPDATE rather than raising, so check the affected count — an error
-- is not what failure looks like here.
UPDATE public.rental_listings SET daily_rate_cents = 1
 WHERE slug = 'rls-test-other';

-- As USER_B (signed in, but staff of no operator — or still
-- 'pending'): SHOULD read the active rows and write nothing.
SELECT slug, status FROM public.rental_listings ORDER BY slug;
UPDATE public.rental_listings SET daily_rate_cents = 1
 WHERE slug = 'rls-test-active';   -- expect 0 rows affected

-- Status machine. Run these as the SERVICE ROLE so RLS is out of the
-- picture and only the 0044 trigger is under test.
--
-- NOT a uniformly negative block — read each label. Two of these are
-- supposed to succeed, and the archive deliberately targets the
-- throwaway 'rls-test-mine' rather than 'rls-test-active', because
-- archiving the latter would hide it from anon and make the photo
-- assertions below fail for the wrong reason. Archived is terminal,
-- so there is no undo.
--   -- SHOULD SUCCEED — active/draft may always be archived:
--   UPDATE public.rental_listings SET status = 'archived' WHERE slug = 'rls-test-mine';
--   -- SHOULD RAISE — archived is terminal:
--   UPDATE public.rental_listings SET status = 'active' WHERE slug = 'rls-test-mine';
--   -- SHOULD RAISE — a listing does not change hands:
--   UPDATE public.rental_listings SET partner_id = 'OP_B_UUID' WHERE slug = 'rls-test-draft';
--   -- SHOULD RAISE — draft goes to active or archived, never straight to paused:
--   UPDATE public.rental_listings SET status = 'paused' WHERE slug = 'rls-test-draft';
--   -- SHOULD SUCCEED — an ordinary edit with no status change, and
--   -- updated_at should move:
--   UPDATE public.rental_listings SET daily_rate_cents = 99000 WHERE slug = 'rls-test-active';
--   -- SHOULD RAISE — the cover must live in the owning operator's folder:
--   UPDATE public.rental_listings SET hero_photo_path = 'OP_B_UUID/x.jpg'
--    WHERE slug = 'rls-test-active';

-- Photos. Setup (service role), with LISTING_A_UUID = the id of
-- 'rls-test-active' and the <partner_id>/<listing_id>/<file> path
-- convention that 0044's storage policy authorises against:
--   INSERT INTO public.rental_listing_photos (listing_id, storage_path, position)
--   VALUES ('LISTING_A_UUID', 'OP_A_UUID/LISTING_A_UUID/a.jpg', 0);

-- As ANON: SHOULD return photos on ACTIVE listings only — nothing
-- attached to a draft.
SELECT storage_path, position FROM public.rental_listing_photos;

-- As USER_A: SHOULD FAIL. The listing is yours, but the path points
-- into another operator's folder — the prefix check is what stops a
-- listing hotlinking someone else's upload.
INSERT INTO public.rental_listing_photos (listing_id, storage_path, position)
VALUES ('LISTING_A_UUID', 'OP_B_UUID/LISTING_A_UUID/stolen.jpg', 5);

-- Storage objects — exercise these through the Storage API against the
-- rental-car-photos bucket, not in SQL. As USER_A:
--   upload 'OP_A_UUID/LISTING_A_UUID/ok.jpg'      → SHOULD SUCCEED
--   upload 'OP_B_UUID/LISTING_A_UUID/stolen.jpg'  → SHOULD FAIL
--   upload 'not-a-uuid/x.jpg'                     → SHOULD FAIL (not throw)
--   upload a 20 MB file                           → SHOULD FAIL (bucket limit)
--   upload a .pdf                                 → SHOULD FAIL (MIME allowlist)
--   anonymous GET of a public object URL          → SHOULD SUCCEED

-- Cleanup (service role):
--   DELETE FROM public.rental_listings WHERE slug LIKE 'rls-test-%';
--   DELETE FROM public.partners WHERE name LIKE 'RLS Test Operator %';

-- =========================================================
-- Wrap-up
-- =========================================================
-- Every section above SHOULD pass. If ANY returns a row from a
-- different user_id, an RLS policy is broken. Capture the failing
-- query + JWT in an incident ticket and lock down the table before
-- shipping.
--
-- Section 10 is the exception to "zero rows is good": its public
-- browse queries MUST return rows. Read each comment for the expected
-- outcome rather than assuming an empty result is a pass.
