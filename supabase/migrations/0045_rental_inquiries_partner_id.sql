-- 0045: rental_inquiries.partner_id — operators are joined by FK, not by
-- the name string. (Claims 0045; 0044 is taken by the rental_listings PR.)
--
-- WHY THIS EXISTS
-- 0039 stamped every lead with `partner_name`, the operator's roster name
-- as it read at capture time, and the pay-link route re-resolved the
-- operator from it with an exact string match on partners.name
-- (src/app/api/admin/inquiries/[id]/payment-link/route.ts). That made a
-- mutable display name load-bearing IDENTITY: rename an operator and
-- every in-flight lead is orphaned — the payment link 404s as "not
-- onboarded yet" and the booking path can no longer find the Stripe
-- account the money settles into. The admin route papered over it by
-- BLOCKING renames while any inquiry referenced the name, which is not a
-- fix; it is the coupling wearing a guard. Self-serve fleet management
-- (operators editing their own company name) makes that guard untenable.
--
-- After this migration identity travels as a foreign key. An operator can
-- be renamed and every lead — live or historical — still resolves.
--
-- WHY partner_name STAYS (it is NOT dropped)
-- partner_id answers "who owns this lead now". partner_name answers "what
-- was this operator called when the lead came in", which is a different
-- question and the one an ops export, an audit trail, or a dispute six
-- months later actually asks. The same reasoning already governs
-- rental_payments (amount/fee frozen at link time so a later
-- commission_rate edit cannot rewrite history, 0041) and rental_inquiries'
-- own denormalized name/phone (a lead must survive the profile being
-- deleted, 0040): outcome and label data must survive the referenced row
-- changing. So partner_name is demoted from identity to a historical
-- label, and the read path treats it as a legacy fallback only.

-- ── the FK ───────────────────────────────────────────────────────────
-- on delete RESTRICT — deliberately not cascade and deliberately not set
-- null.
--
-- Not cascade: a lead is the conversion-rate denominator and the
-- re-marketing list (see /api/admin/inquiries/[id]), so deleting an
-- operator must never delete their leads.
--
-- Not set null either, which is the subtler half. partners.name is
-- UNIQUE but reusable: delete an operator and the name is free for the
-- next company that registers it. If deletion nulled partner_id, the old
-- leads would silently drop back to the partner_name fallback — and that
-- fallback would then resolve the NEW company, whose Stripe account the
-- pay-link route pins the charge to (payment-link/route.ts). Restrict is
-- what makes the resolver's "a dangling partner_id never falls back to
-- the name" guarantee non-vacuous: an operator holding leads cannot be
-- deleted at all, so partner_id is either valid or was never set.
--
-- Consistent with rental_payments.partner_id (0041), which is likewise
-- `references public.partners(id)` with no ON DELETE action.
-- partner_accounts.partner_id (0042) stays `set null`: an application is
-- entitlement, not attribution, and it names no money destination.
--
-- Deleting an operator that has leads is therefore a deliberate act:
-- re-attribute or delete the leads first.

alter table public.rental_inquiries
  add column if not exists partner_id uuid;

-- The constraint is asserted separately from the column, and dropped
-- first, so re-running this file corrects an environment that got the
-- earlier `on delete set null` draft (add column if not exists would
-- leave that constraint in place). Named explicitly to match the name
-- Postgres would have generated, so no duplicate is left behind.
alter table public.rental_inquiries
  drop constraint if exists rental_inquiries_partner_id_fkey;

alter table public.rental_inquiries
  add constraint rental_inquiries_partner_id_fkey
    foreign key (partner_id) references public.partners(id)
    on delete restrict;

create index if not exists rental_inquiries_partner_id_idx
  on public.rental_inquiries (partner_id);

-- ── backfill ─────────────────────────────────────────────────────────
-- Exact name match is the ONLY honest backfill: it is the same join the
-- pay-link route has been performing at read time, so it links precisely
-- the rows that already resolved and nothing more. Rows whose operator
-- was renamed before this ran, or that were never attributed (RYDA
-- fleet), keep partner_id null and stay on the name fallback — the
-- migration must not guess at attribution it cannot prove.
--
-- Guarded on `partner_id is null` so a re-run never re-points a row that
-- the write path has since linked by id.

update public.rental_inquiries i
   set partner_id = p.id
  from public.partners p
 where i.partner_id is null
   and i.partner_name is not null
   and p.name = i.partner_name;

-- ── RLS ──────────────────────────────────────────────────────────────
-- Unchanged on purpose. partners stays service-role only (0041): the
-- column added here is an opaque uuid on a table the browser cannot read
-- anyway, and it exposes no commission rate or acct_ id.
--
-- 0040's anon insert policy (`with check (user_id is null)`) is also left
-- as-is. It gates USER LINKAGE — the thing that decides whose dashboard a
-- row appears in — and partner_id is attribution, not entitlement: the
-- same anon caller could already write an arbitrary partner_name, and a
-- planted row still lands as status 'new' and cannot become a payment
-- link without an admin moving it to 'sent' and typing a price. Tightening
-- that policy is a separate decision from this migration.
