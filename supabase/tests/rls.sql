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
-- 11. rental_availability — public calendar reads, operator-scoped
--     writes  (migration 0046)
-- =========================================================
-- Acceptance check for build-loop task 2A. Like section 10 and unlike
-- everything above it, the first query here SHOULD return rows: a
-- logged-out visitor has to see which days a car is free before they
-- have an account. Three properties, and they fail differently:
--
--   (a) VISIBILITY — inherited from the parent listing, not restated.
--       A blackout on an ACTIVE listing is public; a blackout on a
--       DRAFT listing is not, because the policy's subquery is itself
--       subject to rental_listings' RLS.
--   (b) WRITE SCOPE — an operator manages their own cars' calendars and
--       nobody else's. The WITH CHECK half is the one that matters:
--       without it an operator could black out a competitor's car,
--       which is a denial of service against their inventory.
--   (c) THE KIND-SCOPED EXCLUDE — two overlapping blackouts collide,
--       but a blackout and an 'open' override on the same days do NOT.
--       That pairing IS the override; if it ever starts failing, the
--       operator dashboard loses the ability to carve a drivable
--       weekend out of a month-long rebuild.
--
-- Setup (service role). Continues section 10, reusing its listings:
--   LISTING_A_UUID       = 'rls-test-active' (operator A, public)
--   LISTING_DRAFT_UUID   = 'rls-test-draft'  (operator A, not public)
--   LISTING_B_OTHER_UUID = 'rls-test-other'  (operator B — the one
--                          USER_A must not be able to touch)
--   INSERT INTO public.rental_availability
--     (listing_id, kind, start_date, end_date, reason)
--   VALUES
--     ('LISTING_A_UUID',    'blackout','2026-08-10','2026-08-12','maintenance'),
--     ('LISTING_DRAFT_UUID','blackout','2026-08-10','2026-08-12','owner_use');

-- As ANON (signed out): SHOULD return exactly the ACTIVE listing's
-- blackout. Zero rows means /rent's date picker shows a maintenance
-- week as bookable; the draft's row appearing means an unpublished car
-- is leaking its schedule.
SELECT listing_id, kind, start_date, end_date, reason
FROM public.rental_availability ORDER BY listing_id;

-- As ANON: SHOULD return zero rows — a draft listing's calendar is as
-- private as the draft.
SELECT id FROM public.rental_availability
WHERE listing_id = 'LISTING_DRAFT_UUID';

-- As USER_A (approved staff of operator A): SHOULD return BOTH rows.
-- An operator who cannot see the calendar of their own work-in-progress
-- cannot set it up before publishing.
SELECT listing_id, kind, start_date FROM public.rental_availability;

-- As USER_A: SHOULD SUCCEED — an operator blacks out their own car.
INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date, reason)
VALUES ('LISTING_A_UUID', 'blackout', '2026-12-24', '2026-12-26', 'owner_use');

-- As USER_A: SHOULD FAIL with a row-level-security violation. This is
-- the WITH CHECK half doing its job — 'rls-test-other' belongs to
-- operator B, and blacking out a competitor's inventory is not an edit,
-- it is an attack.
INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date)
VALUES ('LISTING_B_OTHER_UUID', 'blackout', '2026-12-24', '2026-12-26');

-- As USER_A: SHOULD affect ZERO rows — the policy hides B's row from
-- the statement rather than raising. Check the affected count.
UPDATE public.rental_availability SET end_date = '2027-01-31'
 WHERE listing_id = 'LISTING_B_OTHER_UUID';

-- As USER_B (signed in, staff of no operator): SHOULD read the public
-- row and write nothing.
SELECT listing_id, kind FROM public.rental_availability;
INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date)
VALUES ('LISTING_A_UUID', 'blackout', '2027-02-01', '2027-02-03');  -- expect RLS violation

-- ── (c) the kind-scoped EXCLUDE + the update guard ──────────────────
-- SERVICE ROLE, so only the 0046 constraint and trigger are under test.
-- NOT a uniformly negative block — read each label.
--
--   -- SHOULD RAISE 23P01 — two blackouts on one car may not overlap,
--   -- and a shared endpoint IS an overlap ('[]' is inclusive):
--   INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date)
--   VALUES ('LISTING_A_UUID', 'blackout', '2026-08-12', '2026-08-14');
--   -- SHOULD SUCCEED — the whole point of scoping the EXCLUDE by kind.
--   -- An 'open' override on top of a blackout is how an operator says
--   -- "the car is drivable on the 11th after all":
--   INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date)
--   VALUES ('LISTING_A_UUID', 'open', '2026-08-11', '2026-08-11');
--   -- SHOULD RAISE 23P01 — but two OPEN rows may not overlap either:
--   INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date)
--   VALUES ('LISTING_A_UUID', 'open', '2026-08-11', '2026-08-13');
--   -- SHOULD SUCCEED — adjacency is not overlap. Postgres canonicalises
--   -- [a,b] to [a,b+1), so the 13th sits flush against the 12th. An
--   -- operator splitting a month in two has not made an error:
--   INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date)
--   VALUES ('LISTING_A_UUID', 'blackout', '2026-08-13', '2026-08-20');
--   -- SHOULD RAISE (23514) — the kind vocabulary is checked, because a
--   -- typo must not resolve to "not a blackout, therefore bookable":
--   INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date)
--   VALUES ('LISTING_A_UUID', 'sabbatical', '2027-03-01', '2027-03-02');
--   -- SHOULD RAISE (23514) — an inverted range is not a range:
--   INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date)
--   VALUES ('LISTING_A_UUID', 'blackout', '2027-03-05', '2027-03-01');
--   -- SHOULD RAISE (23514) — reason is a closed vocabulary because this
--   -- column is renter-visible; free text would eventually publish PII:
--   INSERT INTO public.rental_availability (listing_id, kind, start_date, end_date, reason)
--   VALUES ('LISTING_A_UUID','blackout','2027-04-01','2027-04-02','held for Bob Smith +1 305...');
--   -- SHOULD RAISE — listing_id is immutable. Moving a range between
--   -- two cars you both own frees days on one and blocks them on
--   -- another in a statement that reads, in any audit log, as an edit:
--   UPDATE public.rental_availability SET listing_id = 'LISTING_DRAFT_UUID'
--    WHERE listing_id = 'LISTING_A_UUID' AND start_date = '2026-12-24';
--   -- SHOULD SUCCEED, and updated_at should move — flipping a blackout
--   -- to an override is a real correction, deliberately not frozen:
--   UPDATE public.rental_availability SET kind = 'open'
--    WHERE listing_id = 'LISTING_A_UUID' AND start_date = '2026-12-24';

-- Operating-window columns (0046 §1), on rental_listings itself.
-- SERVICE ROLE:
--   -- SHOULD RAISE (23514) — a season cannot end before it starts:
--   UPDATE public.rental_listings
--      SET available_from = '2026-09-01', available_until = '2026-08-01'
--    WHERE slug = 'rls-test-active';
--   -- SHOULD RAISE (23514) — horizon 0 would silently delist a car
--   -- that still reads as 'active' on the grid; 731 exceeds the bound
--   -- the day-expansion in src/lib/rental-availability.ts relies on:
--   UPDATE public.rental_listings SET booking_horizon_days = 0
--    WHERE slug = 'rls-test-active';
--   UPDATE public.rental_listings SET booking_horizon_days = 731
--    WHERE slug = 'rls-test-active';
--   -- SHOULD SUCCEED — an ordinary season edit, no status change:
--   UPDATE public.rental_listings
--      SET available_from = '2026-08-01', available_until = '2027-01-31',
--          booking_horizon_days = 365
--    WHERE slug = 'rls-test-active';

-- Cleanup: none needed. rental_availability.listing_id is ON DELETE
-- CASCADE, so section 10's listing cleanup takes these rows with it —
-- the opposite of section 12, which must be deleted first.

-- =========================================================
-- 12. rental_bookings — renter-scoped, operator-scoped, no anon
--     (migration 0047)
-- =========================================================
-- Acceptance check for build-loop task 2B. Three separate properties
-- are under test here and they fail in different ways, so read the
-- labels:
--
--   (a) VISIBILITY — a renter sees only their own bookings; operator
--       staff see the bookings on the cars they own; anon sees nothing.
--   (b) THE EXCLUDE — two overlapping confirmations on one car: the
--       second must fail at the database with 23P01.
--   (c) THE TRIGGER — illegal status jumps and edits to the frozen
--       quote must raise.
--
-- Sections (b) and (c) are run as the SERVICE ROLE, deliberately: RLS
-- is not what is being tested there, and running them as a member would
-- fail at the policy layer and prove nothing about the constraint.
--
-- Setup (service role). Reuses the operators and staff account from
-- section 10, plus a second renter. LISTING_A_UUID is the id of the
-- 'rls-test-active' listing created there.
--   -- USER_A = approved staff of OP_A (from section 10) and therefore
--   --          the OPERATOR here. USER_B and USER_C are renters.
--   INSERT INTO public.rental_bookings
--     (listing_id, renter_user_id, start_date, end_date, status,
--      base_amount_cents, fee_cents, fee_payer,
--      renter_total_cents, operator_net_cents, client_token)
--   VALUES
--     -- B's request: fee on the renter, so total = base + fee.
--     ('LISTING_A_UUID','USER_B_UUID','2026-09-01','2026-09-04','requested',
--      331500, 49725, 'renter', 381225, 331500, 'rls-test-b1'),
--     -- C's request for the SAME dates. Both are allowed to exist:
--     -- 'requested' does not reserve (D3 — the operator picks).
--     ('LISTING_A_UUID','USER_C_UUID','2026-09-01','2026-09-04','requested',
--      331500, 49725, 'renter', 381225, 331500, 'rls-test-c1');

-- As ANON (signed out): SHOULD RAISE 42501 "permission denied for
-- table rental_bookings". Section 5 of 0047 revokes the table grant
-- from anon and grants nothing back, and a privilege check runs before
-- RLS — so anon never reaches the policies at all. Zero rows would also
-- be a pass in effect, but it would mean the grant is back and only the
-- policy is holding the line; a row is a failure.
SELECT id, status FROM public.rental_bookings;

-- As USER_B (renter): SHOULD return exactly ONE row — B's own request.
-- Two rows means the renter policy is not scoping to auth.uid(); zero
-- rows means "my rentals" (2G) will render empty.
SELECT id, listing_id, start_date, status FROM public.rental_bookings;

-- As USER_B: SHOULD return zero rows. C's request for the same car and
-- the same dates is none of B's business — and note that the renter
-- CANNOT tell from this that a competing request exists, which is the
-- point.
SELECT id FROM public.rental_bookings WHERE renter_user_id = 'USER_C_UUID';

-- As USER_B: SHOULD FAIL with "permission denied for column fee_cents".
-- fee_cents and operator_net_cents are withheld by column grant, not by
-- policy — a renter with a legitimate row still must not learn RYDA's
-- commission (guardrail 3.7). A `SELECT *` from a browser client hits
-- this; that failure is deliberate.
SELECT * FROM public.rental_bookings;

-- As USER_B: SHOULD SUCCEED and show the fee they actually paid. When
-- fee_payer = 'renter' the fee is on the renter's own receipt and stays
-- derivable without the withheld column. When fee_payer = 'operator'
-- this difference is 0 and the commission stays invisible — exactly the
-- case the guardrail is about.
SELECT renter_total_cents - base_amount_cents AS fee_i_paid
FROM public.rental_bookings;

-- As USER_A (approved staff of the operator that owns the listing):
-- SHOULD return BOTH requests. An operator who cannot see their own
-- inbound requests cannot approve them — this is the query behind the
-- fleet dashboard's request inbox (2F).
SELECT id, renter_user_id, start_date, status FROM public.rental_bookings;

-- As USER_A: SHOULD RAISE 42501, "permission denied for table
-- rental_bookings" — NOT "zero rows". This table is not section 10's
-- shape and the difference matters: 0047 revokes the table grant from
-- authenticated and grants back only a column list of SELECT, so
-- `authenticated` holds no UPDATE privilege at all. Privilege checks
-- run BEFORE row-level security, so the statement never reaches the
-- policies. Anything other than 42501 here — including a quiet "UPDATE
-- 0" — means the table grant has been restored (a later migration's
-- `grant all ... to authenticated`, or a Supabase default-privileges
-- reset) and an operator-writable bookings table has shipped.
UPDATE public.rental_bookings SET status = 'confirmed'
 WHERE client_token = 'rls-test-b1';

-- As USER_A: SHOULD RAISE 42501 for the same reason — writes to this
-- table are service-role only, always. Note that an INSERT cannot
-- "affect zero rows" under any circumstance: if this statement does not
-- raise, it wrote a row.
INSERT INTO public.rental_bookings
  (listing_id, renter_user_id, start_date, end_date,
   base_amount_cents, fee_cents, fee_payer,
   renter_total_cents, operator_net_cents)
VALUES ('LISTING_A_UUID','USER_A_UUID','2026-10-01','2026-10-03',
        200000, 30000, 'renter', 230000, 200000);

-- As a signed-in user who is neither the renter nor operator staff
-- (any other test account): SHOULD return zero rows. A booking is not
-- public the way a listing is.
SELECT id FROM public.rental_bookings;

-- ── (b) the no-double-book EXCLUDE ──────────────────────────────────
-- SERVICE ROLE. This is the acceptance check named in build-loop 2B:
-- two overlapping confirmations on the same car, second one loses.
--
--   -- SHOULD SUCCEED — the first approval reserves the dates:
--   UPDATE public.rental_bookings SET status = 'confirmed'
--    WHERE client_token = 'rls-test-b1';
--   -- SHOULD RAISE 23P01 exclusion_violation — same car, overlapping
--   -- range, and the loser is decided by Postgres rather than by a
--   -- read-then-write in the route. In production the approval route
--   -- must catch this and unwind: refund the charge it just made and
--   -- void the deposit authorization.
--   UPDATE public.rental_bookings SET status = 'confirmed'
--    WHERE client_token = 'rls-test-c1';
--   -- SHOULD SUCCEED — declining the loser is always legal, and it is
--   -- what the route does after catching the 23P01 above:
--   UPDATE public.rental_bookings SET status = 'declined'
--    WHERE client_token = 'rls-test-c1';
--   -- SHOULD SUCCEED — a request that merely TOUCHES nothing is free.
--   -- Insert a second request on adjacent dates and confirm it: the
--   -- range is '[]' inclusive, so a booking ending 09-04 occupies
--   -- 09-04 and the next pickup is 09-05, not 09-04.
--   INSERT INTO public.rental_bookings
--     (listing_id, renter_user_id, start_date, end_date, status,
--      base_amount_cents, fee_cents, fee_payer,
--      renter_total_cents, operator_net_cents, client_token)
--   VALUES ('LISTING_A_UUID','USER_C_UUID','2026-09-05','2026-09-07','confirmed',
--           221000, 33150, 'renter', 254150, 221000, 'rls-test-c2');
--   -- SHOULD RAISE 23P01 — one day earlier and it overlaps the
--   -- turnaround day:
--   INSERT INTO public.rental_bookings
--     (listing_id, renter_user_id, start_date, end_date, status,
--      base_amount_cents, fee_cents, fee_payer,
--      renter_total_cents, operator_net_cents, client_token)
--   VALUES ('LISTING_A_UUID','USER_C_UUID','2026-09-04','2026-09-06','confirmed',
--           221000, 33150, 'renter', 254150, 221000, 'rls-test-c3');
--   -- SHOULD SUCCEED — 'requested' does NOT reserve, so a third renter
--   -- may still ask for dates that are already confirmed. The operator
--   -- declines it; the schema must not pre-empt that conversation:
--   INSERT INTO public.rental_bookings
--     (listing_id, renter_user_id, start_date, end_date, status,
--      base_amount_cents, fee_cents, fee_payer,
--      renter_total_cents, operator_net_cents, client_token)
--   VALUES ('LISTING_A_UUID','USER_B_UUID','2026-09-01','2026-09-04','requested',
--           331500, 49725, 'renter', 381225, 331500, 'rls-test-b2');

-- ── (c) the state machine + frozen quote ────────────────────────────
-- SERVICE ROLE, so only the 0047 trigger is under test. NOT a uniformly
-- negative block — read each label.
--
-- One timing note before you start: the confirm in block (b) is refused
-- once the request's expires_at has passed (the default is 24h from the
-- fixture INSERT). If you left this checklist half-run overnight, the
-- 'this request expired at …' error is the guard working — re-seed the
-- fixtures rather than "fixing" the trigger.
--
--   -- SHOULD RAISE — the loop's own example of an illegal jump:
--   UPDATE public.rental_bookings SET status = 'completed'
--    WHERE client_token = 'rls-test-b2';
--   -- SHOULD RAISE — the car cannot leave before it is approved:
--   UPDATE public.rental_bookings SET status = 'in_progress'
--    WHERE client_token = 'rls-test-b2';
--   -- SHOULD RAISE — declined is terminal; a revived deal is a NEW row:
--   UPDATE public.rental_bookings SET status = 'confirmed'
--    WHERE client_token = 'rls-test-c1';
--   -- SHOULD SUCCEED — pickup on the confirmed row. confirmed_at was
--   -- stamped by the trigger at (b)'s confirm; check it moved and that
--   -- the statement never supplied it:
--   UPDATE public.rental_bookings SET status = 'in_progress'
--    WHERE client_token = 'rls-test-b1';
--   -- SHOULD RAISE — a trip cannot END before it STARTS. b1 picks up on
--   -- 2026-09-01, so until that day arrives this is a mis-tap on the
--   -- wrong row (or a handover flow firing early), and 'completed' is
--   -- both terminal AND outside the EXCLUDE — it would permanently free
--   -- days the car is still out for:
--   UPDATE public.rental_bookings SET status = 'completed'
--    WHERE client_token = 'rls-test-b1';
--   -- SHOULD SUCCEED — the same move on a trip that HAS started. Seed a
--   -- past-dated row to walk the return leg, then check completed_at.
--   -- On LISTING_B_OTHER deliberately: it is the one listing section 11
--   -- never blacks out, so these relative dates cannot collide with a
--   -- blackout on whatever day you happen to run this:
--   INSERT INTO public.rental_bookings
--     (listing_id, renter_user_id, start_date, end_date, status,
--      base_amount_cents, fee_cents, fee_payer,
--      renter_total_cents, operator_net_cents, client_token)
--   VALUES ('LISTING_B_OTHER_UUID','USER_C_UUID', current_date - 5, current_date - 2,
--           'in_progress', 331500, 49725, 'renter', 381225, 331500,
--           'rls-test-past');
--   -- ...and note what that INSERT proves on its own: the trigger fires
--   -- BEFORE INSERT as well as BEFORE UPDATE, so a row written straight
--   -- into a live state comes out with confirmed_at stamped rather than
--   -- NULL. Check it:
--   SELECT status, confirmed_at, completed_at FROM public.rental_bookings
--    WHERE client_token = 'rls-test-past';
--   UPDATE public.rental_bookings SET status = 'completed'
--    WHERE client_token = 'rls-test-past';
--   -- SHOULD RAISE — a cancellation must name the party that cancelled.
--   -- O3 refunds a renter cancellation and an operator cancellation
--   -- differently, and nothing else in the row records which happened:
--   UPDATE public.rental_bookings SET status = 'cancelled'
--    WHERE client_token = 'rls-test-b2';
--   -- SHOULD SUCCEED — the same cancellation, with the actor. decided_at
--   -- is stamped by the trigger:
--   UPDATE public.rental_bookings SET status = 'cancelled', cancelled_by = 'renter'
--    WHERE client_token = 'rls-test-b2';
--   -- SHOULD RAISE — completed is terminal even for the service role:
--   UPDATE public.rental_bookings SET status = 'cancelled', cancelled_by = 'admin'
--    WHERE client_token = 'rls-test-past';
--   -- SHOULD RAISE — the quote is frozen at request time; a commission
--   -- change tomorrow must not rewrite what was agreed today:
--   UPDATE public.rental_bookings SET fee_cents = 1
--    WHERE client_token = 'rls-test-c1';
--   -- SHOULD RAISE — so are the dates. "Propose alternate dates" (D3)
--   -- is a decline plus a new row, not an edit:
--   UPDATE public.rental_bookings SET end_date = '2026-09-06'
--    WHERE client_token = 'rls-test-c1';
--   -- SHOULD RAISE — a booking does not change renter:
--   UPDATE public.rental_bookings SET renter_user_id = 'USER_C_UUID'
--    WHERE client_token = 'rls-test-c1';
--   -- SHOULD RAISE — confirmed_at cannot be written onto a row that has
--   -- not been confirmed. This is the backdating path a same-status
--   -- update would otherwise open: the write-once rule has to refuse a
--   -- FIRST write on the wrong transition, not only a second write:
--   INSERT INTO public.rental_bookings
--     (listing_id, renter_user_id, start_date, end_date, status,
--      base_amount_cents, fee_cents, fee_payer,
--      renter_total_cents, operator_net_cents, client_token)
--   VALUES ('LISTING_A_UUID','USER_B_UUID','2026-10-10','2026-10-12','requested',
--           200000, 30000, 'renter', 230000, 200000, 'rls-test-b3');
--   UPDATE public.rental_bookings
--      SET expires_at = now() + interval '24 hours', confirmed_at = '2026-07-01'
--    WHERE client_token = 'rls-test-b3';
--   -- SHOULD SUCCEED — the same extension without the smuggled
--   -- timestamp: a same-status update with no frozen field touched, e.g.
--   -- granting an operator more time to answer:
--   UPDATE public.rental_bookings SET expires_at = now() + interval '24 hours'
--    WHERE client_token = 'rls-test-b3';
--   -- SHOULD RAISE — an expired request cannot be approved. O5's 24h
--   -- deadline is enforced, not advisory: the sweep (4D) may be hours
--   -- late and the operator must not be able to charge a card for a
--   -- request the renter was told had lapsed:
--   UPDATE public.rental_bookings SET expires_at = now() - interval '1 minute'
--    WHERE client_token = 'rls-test-b3';
--   UPDATE public.rental_bookings SET status = 'confirmed'
--    WHERE client_token = 'rls-test-b3';
--   -- SHOULD SUCCEED — expiring it is still legal, which is the point:
--   UPDATE public.rental_bookings SET status = 'expired'
--    WHERE client_token = 'rls-test-b3';
--   -- SHOULD RAISE — a booking cannot be confirmed INTO a blackout.
--   -- Section 11's setup blacks LISTING_A out for 2026-08-10..12 with a
--   -- one-day 'open' override on the 11th, so the 10th is genuinely
--   -- blocked. 0046's precedence (d) says a confirmed booking beats a
--   -- blackout on the READ path, but that was never a licence to hand
--   -- the car over on the days it is booked into the shop. Note WHERE it
--   -- raises: the request itself is fine ('requested' reserves nothing),
--   -- the approval is what is refused:
--   INSERT INTO public.rental_bookings
--     (listing_id, renter_user_id, start_date, end_date, status,
--      base_amount_cents, fee_cents, fee_payer,
--      renter_total_cents, operator_net_cents, client_token)
--   VALUES ('LISTING_A_UUID','USER_B_UUID','2026-08-10','2026-08-12','requested',
--           200000, 30000, 'renter', 230000, 200000, 'rls-test-black');
--   UPDATE public.rental_bookings SET status = 'confirmed'
--    WHERE client_token = 'rls-test-black';
--   -- SHOULD RAISE (23514 check_violation) — the quote arithmetic must
--   -- match fee_payer. 'operator' means the fee comes OUT of the payout,
--   -- so renter_total = base, not base + fee:
--   INSERT INTO public.rental_bookings
--     (listing_id, renter_user_id, start_date, end_date,
--      base_amount_cents, fee_cents, fee_payer,
--      renter_total_cents, operator_net_cents, client_token)
--   VALUES ('LISTING_A_UUID','USER_B_UUID','2026-11-01','2026-11-03',
--           200000, 30000, 'operator', 230000, 170000, 'rls-test-bad');
--   -- SHOULD RAISE (23514) — cancelled_by is meaningless on a row that
--   -- is not cancelled, and a refund route reading it would be misled:
--   UPDATE public.rental_bookings SET cancelled_by = 'operator'
--    WHERE client_token = 'rls-test-c1';

-- Cleanup (service role) — before section 10's cleanup, because the
-- bookings' listing_id FK is ON DELETE RESTRICT:
--   DELETE FROM public.rental_bookings WHERE client_token LIKE 'rls-test-%';

-- =========================================================
-- Wrap-up
-- =========================================================
-- Every section above SHOULD pass. If ANY returns a row from a
-- different user_id, an RLS policy is broken. Capture the failing
-- query + JWT in an incident ticket and lock down the table before
-- shipping.
--
-- Sections 10, 11 and 12 are the exception to "zero rows is good": the
-- public browse queries in 10, the public calendar reads in 11, and the
-- renter/operator reads in 12 MUST return rows. Read each comment for
-- the expected outcome rather than assuming an empty result is a pass.
-- Sections 11 and 12 also contain statements that are supposed to
-- RAISE — an exception there is the test passing.
--
-- Order matters for the rental sections. Run 10 → 11 → 12, and clean up
-- in reverse: rental_bookings must be deleted before its listings (the
-- FK is ON DELETE RESTRICT), while rental_availability is CASCADE and
-- goes with them.
