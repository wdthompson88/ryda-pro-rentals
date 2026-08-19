-- 0051: rental_payments grows the columns the ON-PLATFORM rail needs, and
-- the status machine learns what happens to money AFTER it is paid.
-- (RYDA_RENTAL_BUILD_LOOP.md phase 3B, decisions D1 and D4. Claims 0051;
-- 0050 is rental_listings.instant_book.)
--
-- WHAT CHANGES ABOUT THE MONEY, in one paragraph.
-- The inquiry rail (0041) is a Stripe Connect DIRECT charge: the customer
-- pays the OPERATOR's connected account, RYDA's commission rides along as
-- application_fee_amount, and the rental price never touches RYDA's
-- balance. D1 replaces that for BOOKINGS: the renter is charged on RYDA's
-- OWN platform account, the funds land in RYDA's balance, and the
-- operator is paid by a separate Transfer after a clean return (D4).
--
-- Both rails write to this one table, and that is deliberate — it is the
-- rental ledger, and a reconciliation that had to union two tables would
-- eventually union them wrongly. 0047 §7 already made the parentage
-- explicit (`num_nonnulls(inquiry_id, booking_id) = 1`), so which rail a
-- row belongs to is answerable in SQL. This migration adds the columns
-- the second rail needs and leaves the first one's untouched.
--
-- ── WHY THE AMOUNTS ARE RESTATED HERE ───────────────────────────────
--
-- rental_bookings (0047) already freezes the quote: base, fee, payer,
-- renter total, operator net. Copying four of them onto the payment row
-- looks redundant, and for the BOOKING it would be. For the LEDGER it is
-- not, for two reasons that only show up later:
--
--   A booking accumulates several payment rows over its life — the
--   charge, a re-authorized deposit, a refund. Each one moved a specific
--   amount under a specific fee arrangement. Reading the operator's cut
--   for a two-year-old refund by joining back to the booking gives you
--   the booking's CURRENT snapshot, which is right only because 0047
--   makes a re-quote a new row; the moment anything relaxes that, the
--   ledger starts lying about history. A ledger row states its own terms.
--
--   The inquiry rail has no booking to join to at all. Giving both rails
--   the same four columns is what lets one query answer "what did RYDA
--   earn in March" without a CASE over the parent type.
--
-- They are nullable because 0041's applied rows predate them and cannot
-- be backfilled from anything: an inquiry-rail row records amount and
-- application fee, and its base is by definition the amount (the operator
-- always carried the fee on that rail), but writing that inference into
-- old rows would manufacture data the system never observed. New rows
-- fill them; old rows say nothing, honestly.

alter table public.rental_payments
  add column if not exists base_amount_cents integer
    check (base_amount_cents is null or base_amount_cents > 0);

-- Which side carried RYDA's fee, mirroring rental_bookings.fee_payer and
-- partners.fee_payer (0048). Without it the ledger cannot tell a $3,315
-- charge that included a renter-paid fee from a $3,315 charge that did
-- not, and those two rows owe the operator different amounts.
alter table public.rental_payments
  add column if not exists fee_payer text
    check (fee_payer is null or fee_payer in ('renter', 'operator'));

-- What the operator is owed for this row — the Transfer amount on the D1
-- rail, and the direct-charge remainder on the 0041 rail. Zero is legal
-- (a fee that consumed the whole base); negative is not.
alter table public.rental_payments
  add column if not exists operator_net_cents integer
    check (operator_net_cents is null or operator_net_cents >= 0);

-- ── The payout (D4) ─────────────────────────────────────────────────
--
-- Separate charges + transfers: the charge happens at confirmation, the
-- Transfer happens after the return is confirmed clean. Between those two
-- moments RYDA is holding the operator's money, which is exactly the
-- claim the copy sweep (4A) has to stop denying.
--
-- transfer id is UNIQUE so a retried completion cannot pay an operator
-- twice: the second insert of the same Stripe object collides instead of
-- creating a second payout row. This is the same compare-and-swap job
-- rental_bookings.charge_payment_intent_id does for the charge.
alter table public.rental_payments
  add column if not exists stripe_transfer_id text;

do $$
begin
  alter table public.rental_payments
    add constraint rental_payments_transfer_id_unique unique (stripe_transfer_id);
exception when duplicate_object then
  null;
end $$;

alter table public.rental_payments
  add column if not exists transferred_at timestamptz;

-- The charge object, distinct from the PaymentIntent. Stripe's dispute
-- events (charge.dispute.created / .closed) key on the CHARGE, not the
-- intent, so a webhook that only ever stored the intent id has to make a
-- round trip to Stripe to find the row a chargeback belongs to — mid
-- incident, on a handler that must be fast and idempotent.
alter table public.rental_payments
  add column if not exists stripe_charge_id text;

-- ── Refunds ─────────────────────────────────────────────────────────
--
-- An amount rather than a boolean: the cancellation tiers (O3) refund
-- 100%, 50% or nothing, and a claim against the deposit captures part of
-- a hold. "Was it refunded" is a question the amount answers; "how much"
-- is one a boolean never can.
alter table public.rental_payments
  add column if not exists refunded_cents integer not null default 0
    check (refunded_cents >= 0);

alter table public.rental_payments
  add column if not exists refunded_at timestamptz;

-- A refund cannot exceed what was charged. Written as a table CHECK
-- rather than trusted to the refund route because the route is where a
-- retry loop lives, and "refund the booking total" applied twice is the
-- single easiest way to hand back more money than was ever taken.
alter table public.rental_payments
  drop constraint if exists rental_payments_refund_bounded;
alter table public.rental_payments
  add constraint rental_payments_refund_bounded
    check (refunded_cents <= amount_cents);

-- ── The status machine learns about life after 'paid' ───────────────
--
-- 0041 + 0047 §7 allow exactly: pending -> paid | expired | canceled,
-- and nothing out of paid. That was right while 'paid' really was the
-- end of the story — the inquiry rail's money reached the operator
-- directly and RYDA had no further part in it. On the D1 rail RYDA holds
-- the funds, so two things can still happen to a paid row and BOTH are
-- currently `raise exception`:
--
--   refunded  a cancellation (O3) or a lost dispute sent money back.
--   disputed  the renter's bank opened a chargeback. RYDA is merchant of
--             record on this rail (open item O4), so the chargeback lands
--             on RYDA, not on the operator.
--
-- The new map, in full:
--
--   pending  -> paid | expired | canceled
--   paid     -> refunded | disputed
--   disputed -> refunded | paid
--
-- disputed -> paid is the dispute RESOLVED IN RYDA'S FAVOUR, and it is
-- the one edge worth spelling out. It looks like it reopens a terminal
-- state, and it does not: the immutability rule below still freezes the
-- Stripe ids and paid_at on any row that is or was paid, so winning a
-- dispute restores the STATUS without making the money re-writable. The
-- alternative — a separate 'dispute_won' state — would mean every
-- reconciliation query had to know two spellings of "this payment
-- stands", which is how a revenue number quietly starts excluding rows.
--
-- refunded and canceled are terminal. There is no path back from either,
-- because money that has been returned is returned; a later charge for
-- the same booking is a NEW payment row, exactly as 0041 made a re-quote
-- a new row.

alter table public.rental_payments
  drop constraint if exists rental_payments_status_check;

-- The column's original inline CHECK is unnamed in 0041, so it cannot be
-- dropped by name. Postgres names it rental_payments_status_check by
-- convention; the drop above handles the common case, and this DO block
-- catches an environment where it was named differently, so the new
-- vocabulary can be installed either way.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'rental_payments'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
      and pg_get_constraintdef(con.oid) ilike '%pending%'
  loop
    execute format('alter table public.rental_payments drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.rental_payments
  add constraint rental_payments_status_known
    check (status in ('pending', 'paid', 'expired', 'canceled', 'refunded', 'disputed'));

-- The guard, replaced whole. Same doctrine as 0047 §7: the newest
-- migration owns the function, so an applied file is never edited and a
-- fresh rebuild replays to the same definition.
create or replace function public.rental_payments_enforce_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if not (
         (old.status = 'pending'  and new.status in ('paid', 'expired', 'canceled'))
      or (old.status = 'paid'     and new.status in ('refunded', 'disputed'))
      or (old.status = 'disputed' and new.status in ('refunded', 'paid'))
    ) then
      raise exception 'illegal rental_payments status transition: % -> %',
        old.status, new.status;
    end if;
  end if;

  -- The frozen facts. inquiry_id, booking_id and partner_id are 0041's
  -- and 0047's; the four amount columns join them because a ledger row
  -- whose terms can be re-written after the money moved is not a ledger.
  --
  -- refunded_cents is NOT here: it is the one amount that legitimately
  -- moves after the fact, bounded by rental_payments_refund_bounded.
  if new.amount_cents is distinct from old.amount_cents
     or new.application_fee_cents is distinct from old.application_fee_cents
     or new.currency is distinct from old.currency
     or new.inquiry_id is distinct from old.inquiry_id
     or new.booking_id is distinct from old.booking_id
     or new.partner_id is distinct from old.partner_id
     or new.base_amount_cents is distinct from old.base_amount_cents
     or new.fee_payer is distinct from old.fee_payer
     or new.operator_net_cents is distinct from old.operator_net_cents then
    raise exception 'rental_payments: financial terms are immutable after insert';
  end if;

  -- A refund may only ever grow. Letting it shrink would erase the record
  -- of money that left, and the CHECK above only bounds the ceiling.
  if new.refunded_cents < old.refunded_cents then
    raise exception 'rental_payments: refunded_cents may not decrease';
  end if;

  -- Write-once Stripe objects. Each is the idempotency key for the
  -- operation that created it — re-aiming one after the fact is how a
  -- retry pays a second operator or refunds a second charge.
  if old.stripe_transfer_id is not null
     and new.stripe_transfer_id is distinct from old.stripe_transfer_id then
    raise exception 'rental_payments: stripe_transfer_id is write-once';
  end if;

  if old.stripe_charge_id is not null
     and new.stripe_charge_id is distinct from old.stripe_charge_id then
    raise exception 'rental_payments: stripe_charge_id is write-once';
  end if;

  -- Unchanged from 0047 §7, and still the rule that matters most: once a
  -- row has been paid, the objects that prove it cannot be re-pointed.
  -- Note this fires for a row that is CURRENTLY paid; a disputed row that
  -- returns to paid never had them unfrozen, because the same test ran on
  -- the transition out of paid.
  if old.status = 'paid'
     and (new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id
          or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
          or new.paid_at is distinct from old.paid_at) then
    raise exception 'rental_payments: paid rows are immutable';
  end if;

  return new;
end;
$$ language plpgsql;

-- ── Indexes ─────────────────────────────────────────────────────────
--
-- Both are webhook lookups: a Stripe event arrives carrying an object id
-- and the handler has milliseconds to find its row. Neither is unique —
-- stripe_charge_id is one-per-charge in practice but the uniqueness that
-- matters (no double payout) is on the transfer, already declared above.
create index if not exists rental_payments_charge_id_idx
  on public.rental_payments (stripe_charge_id)
  where stripe_charge_id is not null;

create index if not exists rental_payments_payment_intent_idx
  on public.rental_payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ── Comments ────────────────────────────────────────────────────────

comment on column public.rental_payments.base_amount_cents is
  'The operator-side price before RYDA''s fee, restated on the ledger row so a payment states its own terms rather than borrowing the booking''s current snapshot. Null on rows written before 0051.';

comment on column public.rental_payments.fee_payer is
  'Which side carried RYDA''s fee for THIS row (0048 / D2). Without it a charge that included a renter-paid fee is indistinguishable from one that did not, and the two owe the operator different amounts.';

comment on column public.rental_payments.operator_net_cents is
  'What the operator is owed for this row — the Transfer amount on the D1 booking rail, the direct-charge remainder on the 0041 inquiry rail.';

comment on column public.rental_payments.stripe_transfer_id is
  'The Transfer that paid the operator (D4, after a clean return). UNIQUE, so a retried completion collides rather than paying twice. Write-once.';

comment on column public.rental_payments.stripe_charge_id is
  'The Charge behind the PaymentIntent. Stored because Stripe''s dispute events key on the charge, not the intent — without it a chargeback handler has to round-trip to Stripe to find its row.';

comment on column public.rental_payments.refunded_cents is
  'How much has been sent back, cumulative. An amount rather than a boolean because the cancellation tiers (O3) refund 100%, 50% or nothing. May only grow, and never past amount_cents.';

comment on column public.rental_payments.status is
  'pending -> paid | expired | canceled; paid -> refunded | disputed; disputed -> refunded | paid. The last is a dispute won: it restores the status without unfreezing the money, since the immutability rules key on the row having been paid.';
