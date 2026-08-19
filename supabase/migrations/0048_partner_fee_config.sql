-- 0048: partners fee configuration — per-operator booking-fee TERMS,
-- not just a rate. (RYDA_RENTAL_BUILD_LOOP.md task 3A, decision D2.
-- Claims 0048; 0047 is the rental_bookings PR.)
--
-- WHAT THIS IS
-- 0041 gave every operator exactly one commercial lever: commission_rate,
-- a percentage deducted from their payout. D2 says the fee engine is
-- configurable along three axes instead of one — percent OR flat, and
-- carried by EITHER party, with an optional floor and cap. This file is
-- the storage for that, and the widening of the one number 0041 already
-- had.
--
-- THE COLUMN THAT IS NOT HERE
-- Nothing in this migration touches rental_bookings. The quote snapshot
-- (0047) already stores fee_cents / fee_payer / renter_total_cents /
-- operator_net_cents as FROZEN facts about one deal, and 0047's
-- rental_bookings_quote_consistent CHECK already re-derives the two
-- arithmetics from fee_payer. These columns are the operator's CURRENT
-- terms; those are what a specific renter was quoted last Tuesday. A
-- change here must never rewrite one of those, which is exactly what
-- 0047's immutability trigger already guarantees.
--
-- WHO READS THESE COLUMNS
-- src/lib/fees.ts — rentalFeeConfigFromPartner() maps this row into the
-- config computeRentalFee() takes, and that function is the only place
-- rental money math happens (its file header records the $1,500-vs-5%
-- incident that made that rule). The admin terms editor on
-- /admin/partners previews with the same function the server charges
-- with; the API validates with it too, so a config the UI accepts is
-- necessarily a row this schema accepts.
--
-- ON THE PAYMENT DIRECTION. 0041's header describes a fee-only DIRECT
-- charge where the rental price never enters RYDA's balance. That is
-- still true of the inquiry rail it was written for, and it is NOT true
-- of the booking rail D1 introduces: there the renter is charged on
-- RYDA's own platform account and the operator is paid out by transfer
-- after a clean return (D4, task 3B). These columns are rail-agnostic on
-- purpose — they answer "what does RYDA charge for this operator's
-- bookings", not "which Stripe object carries it". The copy sweep that
-- corrects the older doctrine text lands with 3B/4A, not here.

-- ── 1) The [0, 0.5] ceiling, widened ────────────────────────────────
--
-- 0041 wrote the bound inline, so Postgres named the constraint
-- `partners_commission_rate_check`. Three other places assert the same
-- bound and none of them can see this file: the guard inside
-- computeRentalFee, the POST validation in
-- src/app/api/admin/partners/route.ts, and the form rails in
-- src/app/admin/partners/page.tsx. Those three now import one exported
-- constant (RENTAL_COMMISSION_RATE_MAX in src/lib/fees.ts) so they
-- cannot drift from each other; this CHECK is the fourth copy, in a
-- language that cannot import anything, so
-- src/lib/__tests__/rental-fee-config.test.ts PARSES THIS FILE and fails
-- if the number below stops matching the constant. Same drift guard
-- 0047's status list has in rental-booking-status.test.ts.
--
-- Keeping them equal is not pedantry. A CHECK stricter than the UI means
-- an admin saves a legitimate rate and gets an opaque constraint-name
-- 500; a UI stricter than the CHECK means a term the business has agreed
-- cannot be entered and nobody can say why.
--
-- WHY 0.75. The ceiling's real job is typo protection — catching `15`
-- typed where `0.15` belonged — and any value below 1 does that. 0.5 was
-- additionally a guess about commercial reality, made when a fee could
-- only be a deduction from the operator's payout. Under D2 the same
-- number can be a markup the RENTER pays on top, where 50% is no longer
-- a natural wall. 0.75 preserves the typo guard, clears every plausible
-- commercial term, and stays strictly below 1 — so the percent path
-- alone can never drive operator_net_cents negative and collide with
-- 0047's `check (operator_net_cents >= 0)`. A FLAT fee can cross that
-- line, and computeRentalFee refuses it there with a message that names
-- the terms rather than letting this constraint's name surface
-- mid-booking.
--
-- Re-runnable: drop both the generated name and the new one first. The
-- rename is deliberate — a named constraint is one a later migration can
-- find without guessing what Postgres called it.
alter table public.partners
  drop constraint if exists partners_commission_rate_check;
alter table public.partners
  drop constraint if exists partners_commission_rate_bounded;
alter table public.partners
  add constraint partners_commission_rate_bounded
    check (commission_rate >= 0 and commission_rate <= 0.75);

-- ── 2) The fee-terms columns ────────────────────────────────────────
--
-- Every one is added with a default that reproduces TODAY's behavior, so
-- applying this migration changes no operator's economics by a cent:
-- percent mode, operator pays, no clamps — i.e. commission_rate,
-- deducted from the payout, which is all 0041 could express.

-- percent = commission_rate x base. flat = a fixed fee per booking,
-- independent of the rental's size (a legible term for short cheap
-- rentals, where a percentage of a one-night $300 booking is not worth
-- the support cost).
alter table public.partners
  add column if not exists fee_mode text not null default 'percent';

-- The flat amount, in CENTS — the same unit as rental_listings.
-- daily_rate_cents (0044), rental_bookings' quote columns (0047) and
-- computeRentalFee. Nullable because it is meaningless in percent mode,
-- and section 3 makes that not merely conventional but enforced.
alter table public.partners
  add column if not exists fee_flat_cents integer;

-- WHICH SIDE CARRIES THE FEE (D2). This is not a bookkeeping label: it
-- changes the amount charged to the card.
--   'operator' — deducted from the payout. renter pays the base;
--                operator receives base - fee. Today's behavior.
--   'renter'   — added on top. renter pays base + fee; the operator
--                receives the full base.
-- Mirrors rental_bookings.fee_payer (0047), which freezes whichever
-- value was live when a given booking was quoted.
alter table public.partners
  add column if not exists fee_payer text not null default 'operator';

-- Optional clamps on the computed fee, in cents. Applied BEFORE the
-- payer split (see the order-of-operations note in computeRentalFee):
-- clamping after the split would let the renter's total and the
-- operator's net disagree by the clamp, which is the whole class of bug
-- 0047's quote-consistency CHECK exists to make unwritable.
--
-- A floor is how "we do not process a booking for less than $25 of
-- revenue" is expressed; a cap is how a large fleet negotiates "your
-- percentage, but never more than $500 on one booking".
alter table public.partners
  add column if not exists fee_floor_cents integer;
alter table public.partners
  add column if not exists fee_cap_cents integer;

-- ── 3) Coherence CHECKs ─────────────────────────────────────────────
--
-- Asserted outside the column definitions, drop-then-add, for the reason
-- 0047 section 1b spells out: `add column if not exists` is a no-op
-- against an environment that took an earlier draft, and a no-op that
-- exits 0 leaves the table without its constraints while reporting
-- success. On money columns that is the last thing to leave to chance.

alter table public.partners
  drop constraint if exists partners_fee_mode_valid;
alter table public.partners
  add constraint partners_fee_mode_valid
    check (fee_mode in ('percent', 'flat'));

alter table public.partners
  drop constraint if exists partners_fee_payer_valid;
alter table public.partners
  add constraint partners_fee_payer_valid
    check (fee_payer in ('operator', 'renter'));

-- THE MODE AND ITS AMOUNT MUST AGREE, both ways round.
--
-- flat mode without an amount is a fee engine with no fee — the route
-- would either throw mid-quote or fall back to a percentage nobody
-- agreed to. percent mode WITH a leftover amount is the subtler and
-- worse one: the row now carries two candidate fees and answering "what
-- does this operator charge?" requires knowing which column the code
-- happens to read. Worse, the stale value silently becomes the live fee
-- the day someone flips the mode back. So a mode change must carry its
-- amount with it, in the same write — which is what the admin editor
-- and /api/admin/partners POST do, and what computeRentalFee's
-- resolveRentalFeeConfig refuses to let them skip.
--
-- The asymmetry with commission_rate — which keeps its value in flat
-- mode rather than being nulled — is forced, not chosen: 0041 declared
-- commission_rate NOT NULL with a default, and relaxing that would break
-- every existing reader. fee_flat_cents is new and nullable, so it is
-- held to the rule commission_rate cannot be.
--
-- `else false` is load-bearing here exactly as it is in 0047: a CASE
-- with no ELSE returns NULL for an unmatched value and a CHECK passes on
-- NULL.
alter table public.partners
  drop constraint if exists partners_fee_mode_amount_coherent;
alter table public.partners
  add constraint partners_fee_mode_amount_coherent
    check (
      case fee_mode
        when 'percent' then fee_flat_cents is null
                        and commission_rate is not null
        when 'flat'    then fee_flat_cents is not null
        else false
      end
    );

-- A fee cannot be negative in either direction, and a floor above a cap
-- is not a range — it is two rules that can never both hold, and the
-- engine would have to silently pick a winner.
alter table public.partners
  drop constraint if exists partners_fee_clamps_sane;
alter table public.partners
  add constraint partners_fee_clamps_sane
    check (
      (fee_flat_cents  is null or fee_flat_cents  >= 0)
      and (fee_floor_cents is null or fee_floor_cents >= 0)
      and (fee_cap_cents   is null or fee_cap_cents   >= 0)
      and (fee_floor_cents is null or fee_cap_cents is null
           or fee_floor_cents <= fee_cap_cents)
    );

-- ── 4) RLS ──────────────────────────────────────────────────────────
--
-- Unchanged and deliberately so: partners has RLS enabled with ZERO
-- anon/authenticated policies (0041), and these columns are exactly the
-- kind of thing that posture exists for. Commercial terms reach a
-- browser only through /api/admin/partners behind requireAdmin, on the
-- service-role client. Nothing here adds a policy; guardrail 3.7 stands.

-- ── 5) Comments ─────────────────────────────────────────────────────

comment on column public.partners.commission_rate is
  'Percent booking fee as a fraction (0.15 = 15%), used when fee_mode = ''percent''. Bounded [0, 0.75] by partners_commission_rate_bounded — the same ceiling as RENTAL_COMMISSION_RATE_MAX in src/lib/fees.ts, which a Vitest suite parses this file to verify. Kept (not nulled) while an operator is on flat terms because 0041 declared it NOT NULL.';

comment on column public.partners.fee_mode is
  'How RYDA''s booking fee is derived: ''percent'' (commission_rate x base) or ''flat'' (fee_flat_cents per booking). The amount for the active mode is required and the other is forbidden — see partners_fee_mode_amount_coherent.';

comment on column public.partners.fee_flat_cents is
  'Flat booking fee in cents. Required when fee_mode = ''flat'', and must be NULL in percent mode so the row never carries two candidate fees.';

comment on column public.partners.fee_payer is
  'Which side carries the fee (D2). ''operator'' deducts it from the payout (renter pays base); ''renter'' adds it on top (renter pays base + fee, operator receives the full base). Changes the amount charged, not just the attribution. Frozen per booking on rental_bookings.fee_payer (0047).';

comment on column public.partners.fee_floor_cents is
  'Optional minimum fee in cents, applied to the computed fee BEFORE the payer split. Null = no floor.';

comment on column public.partners.fee_cap_cents is
  'Optional maximum fee in cents, applied to the computed fee BEFORE the payer split. Null = no cap. Must be >= fee_floor_cents.';
