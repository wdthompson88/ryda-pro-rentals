-- 0047: rental_bookings — the daily-rental booking entity, the
-- no-double-book EXCLUDE constraint, and the state machine that decides
-- WHEN a set of dates is actually reserved.
-- (RYDA_RENTAL_BUILD_LOOP.md phase 2B. Claims 0047; 0046 is the
-- rental availability / blackout PR.)
--
-- WHAT THIS IS
-- 0044 gave the marketplace inventory (rental_listings). 0046 gives it a
-- calendar of open days. This file gives it the thing a renter actually
-- creates: a request for specific dates on a specific car, carrying the
-- price it was quoted at, moving through an operator's decision, a
-- pickup and a return.
--
-- THE ONE IDEA THIS FILE EXISTS TO ENCODE
-- A request does NOT hold the dates. Decision D3 is request-to-book:
-- the renter asks, the operator answers. Between those two moments any
-- number of renters may be asking for the same week, and that is
-- correct — an operator with three requests for the same Saturday
-- should get to pick one. The dates are reserved at exactly one
-- instant: the transition to 'confirmed' (money-flow step 3c), which is
-- also the instant RYDA charges the card. So the EXCLUDE constraint
-- below is scoped to the statuses that mean "this car is spoken for",
-- and a same-date race is decided by Postgres, not by a read-then-write
-- in a route. That is the whole point of section 3.
--
-- Nothing here touches co-ownership. public.bookings (0009/0021) is
-- share-entitlement scoped and stays exactly as it is; this is a new,
-- parallel table per guardrail 3.6. The two are never joined and never
-- share a helper — see the spelling note on 'cancelled' in section 1.

-- ── 1) rental_bookings ──────────────────────────────────────────────
--
-- STATUS VOCABULARY, and the one deviation from the build loop.
--
-- The loop's phase-2B sketch borrows Mainstable's slot machine
-- verbatim: requested → confirmed → paid → in_progress → completed.
-- This table drops 'paid'. That is deliberate, and it follows from the
-- money flow the loop itself specifies in §2:
--
--   step 3 (on approve) — (a) charge the rental total, (b) place the
--   deposit hold, (c) move the booking to 'confirmed'.
--
-- The charge PRECEDES the confirm. There is therefore no such thing as
-- a confirmed-but-unpaid rental booking, so a 'paid' state between
-- 'confirmed' and 'in_progress' would be a state no booking can ever
-- occupy for longer than it takes to write the next UPDATE — a state
-- that exists only to be skipped. Worse, it would be a SECOND source of
-- truth about money: rental_payments (0041) already owns the
-- pending → paid lifecycle, with its own guard trigger and its own
-- webhook writer. Two tables asserting "this is paid" is exactly the
-- divergence 0041's header warns about. Payment state stays on
-- rental_payments; booking state stays here.
--
-- The loop's sketch also omits the terminal states a request-to-book
-- flow cannot function without: an operator who says no ('declined'),
-- a request nobody answered ('expired', open default O5 = 24h), and a
-- booking called off after it was confirmed ('cancelled', the policy
-- tiers of O3). Those are additions, not deviations.
--
-- SPELLING, read this before writing a filter. This table spells its
-- terminal 'cancelled' (two Ls). public.rental_payments (0041) spells
-- its own 'canceled' (one L), and so does the co-own public.bookings
-- (0009). They are different columns on different tables and are never
-- compared, but a shared constant or a copy-pasted `.eq("status", …)`
-- WILL silently match nothing. If a later PR wants one spelling across
-- the rental side, 0041's is the older one and this is the row to
-- change.
--
-- MONEY. Cents everywhere, matching computeRentalFee in src/lib/fees.ts
-- and rental_listings.daily_rate_cents (0044). The dollars boundary is
-- crossed once, in the mapper, never in SQL.

create table if not exists public.rental_bookings (
  id                    uuid primary key default gen_random_uuid(),

  -- The car. `restrict` for the same reason 0044 uses it on partner_id:
  -- deleting a listing that carries booking history should fail loudly
  -- rather than silently erase the record of a rental that happened.
  -- A retired car is archived (0044's terminal status), not deleted.
  listing_id            uuid not null references public.rental_listings(id) on delete restrict,

  -- The renter. `restrict`, and NOT NULL — a deliberate departure from
  -- share_purchases (0007) and rental_inquiries (0040), which both null
  -- their user link on account deletion.
  --
  -- Those two can afford `set null` because they keep a DENORMALIZED
  -- label alongside the FK: 0007 stores email + name, 0040 stores
  -- name + phone, and 0045's header spells out the doctrine — identity
  -- travels as a key, the label survives the key going away. This table
  -- deliberately stores no renter PII at all (renter identity lives in
  -- rental_profiles and auth.users), so `set null` here would be the
  -- key half of that pattern without the label half: a financial record
  -- with no counterparty. Under D1 the charge is on RYDA's own account,
  -- which makes RYDA merchant of record (open item O4) and leaves it
  -- holding the chargeback for ~120 days after the trip — losing the
  -- renter link is not recoverable.
  --
  -- So deleting a renter who has bookings is a deliberate act, exactly
  -- as 0045 made deleting an operator who has leads one. An erasure
  -- flow, when one is built, should ANONYMIZE (denormalize a label,
  -- then release the key) rather than cascade — that is a decision for
  -- whoever builds account deletion, not a default to fall into here.
  renter_user_id        uuid not null references auth.users(id) on delete restrict,

  -- Inclusive pickup and return days. Nights = end_date - start_date,
  -- so a one-night rental is start = D, end = D+1, and the day the car
  -- comes back is occupied (see the EXCLUDE in section 3 — '[]' is what
  -- makes the turnaround day block the next pickup).
  start_date            date not null,
  end_date              date not null,

  status                text not null default 'requested'
                          check (status in ('requested','confirmed','in_progress','completed','declined','expired','cancelled')),

  -- WHICH PARTY OPENED THIS ROW.
  --
  -- "Propose alternate dates" (D3) is resolved above as "decline, then
  -- quote again" — a NEW row in status 'requested'. Without this column
  -- that counter-offer is byte-for-byte indistinguishable from a
  -- renter's inbound ask, with two consequences that are not cosmetic:
  -- the operator's own proposal surfaces in the operator's request
  -- inbox (2F queries `status = 'requested'` on listings I own), and
  -- the 24h sweep (4D) auto-expires the operator's offer while the ball
  -- is in the renter's court. O5's clock is scoped to "an operator who
  -- has not answered"; this column is what lets both the inbox and the
  -- sweep tell which party is being waited on.
  initiated_by          text not null default 'renter'
                          check (initiated_by in ('renter','operator')),

  -- ── the frozen quote snapshot ────────────────────────────────────
  -- Computed once, at request time, by the server quote calculator (2C)
  -- and computeRentalFee (fees.ts / 3A), and never recomputed. Same
  -- doctrine 0041 established for rental_payments: a later change to
  -- the operator's commission_rate must not rewrite what a renter was
  -- quoted last Tuesday. The trigger in section 4 makes it structural —
  -- a re-quote is a NEW row, never an edit, and that is also how
  -- "propose alternate dates" (D3) works: decline, then quote again.

  -- Daily rate x billable nights, after any duration discount. This is
  -- the operator's side of the deal before RYDA's fee is applied.
  base_amount_cents     integer not null check (base_amount_cents > 0),

  -- RYDA's booking fee for this row. May legitimately be 0 (a launch
  -- promotion, a flat fee with a floor of zero).
  fee_cents             integer not null check (fee_cents >= 0),

  -- Who the fee lands on (D2). 'renter' adds it on top of the base;
  -- 'operator' deducts it from the payout. The consistency CHECK below
  -- is what stops those two arithmetics from being applied to the wrong
  -- one.
  fee_payer             text not null
                          check (fee_payer in ('renter','operator')),

  -- The security-deposit authorization (D5). NOT part of
  -- renter_total_cents: it is a separate manual-capture PaymentIntent
  -- that is authorized and then released on a clean return, so it is
  -- money that is held and (normally) never captured. Adding it to the
  -- total would double-charge the renter on the receipt and on the
  -- ledger. 0 means this operator asks for no deposit.
  deposit_amount_cents  integer not null default 0
                          check (deposit_amount_cents >= 0),

  -- What the card is actually charged at confirmation, and what the
  -- operator is actually transferred at completion (D4). Stored rather
  -- than derived so the row reads as the receipt it is.
  renter_total_cents    integer not null check (renter_total_cents > 0),
  operator_net_cents    integer not null check (operator_net_cents >= 0),

  currency              text not null default 'usd',

  -- ── the Stripe objects this booking owns ─────────────────────────
  --
  -- THE CHARGE (money-flow step 3a). Written by the approval route the
  -- moment the off-session PaymentIntent is created, and write-once
  -- thereafter (section 4). Its real job is idempotency: a retried
  -- approval — a webhook replay, an operator double-click, the
  -- unwind-and-retry after a 23P01 — has to be able to answer "has this
  -- booking already been charged?" before it charges again, and a
  -- compare-and-swap needs a column on THIS row to swap on. Without it
  -- the only record of the charge is a rental_payments row that nothing
  -- joins back to the booking, and the renter is charged twice for one
  -- confirmation.
  --
  -- The ledger row itself stays on rental_payments (0041); section 7
  -- gives that table the matching booking_id so the two join without a
  -- breaking alter once 3B lands.
  charge_payment_intent_id  text,

  -- ── the deposit hold (D5), as STATE rather than as an amount ──────
  --
  -- deposit_amount_cents on its own cannot drive 3C ("record deposit
  -- state on rental_bookings"). A hold is a Stripe object with a life:
  -- it is authorized, it EXPIRES, and it ends either released (clean
  -- return) or captured (a claim). All three of those are facts about
  -- this booking, and none of them fit in an amount.
  --
  -- ON THE EXPIRY, correcting a claim this file's first draft and
  -- 0044's max_nights comment both make: the 30-night ceiling does NOT
  -- keep a booking "inside the Stripe card-authorization window". A
  -- card authorization lasts roughly SEVEN days. Extended authorization
  -- stretches it toward ~30, but that is opt-in, card-brand- and
  -- issuer-dependent, and not something a schema may assume. So a
  -- 14-night rental confirmed on the 1st has a hold that is gone by the
  -- 8th, and the claim it can be captured on the 15th is false. §2
  -- therefore requires a re-authorization pass;
  -- deposit_auth_expires_at is the column that pass sweeps on, and
  -- deposit_payment_intent_id is deliberately NOT frozen so the
  -- replacement hold can be recorded in place. (The 30-night ceiling
  -- keeps its floor-and-ceiling job — it is an exposure bound, not a
  -- Stripe one.)
  deposit_payment_intent_id text,
  deposit_status        text not null default 'none'
                          check (deposit_status in ('none','authorized','released','captured','expired')),
  deposit_authorized_at timestamptz,
  deposit_auth_expires_at timestamptz,
  deposit_captured_cents integer not null default 0
                          check (deposit_captured_cents >= 0),

  -- Client-generated idempotency token, one per form mount — the same
  -- primitive as rental_inquiries.client_token (0039). A double tap or
  -- a retried POST hits the partial unique index below instead of
  -- creating a second request. Nullable for rows written by a path that
  -- has no token (an admin backfill, a seed script).
  client_token          text,

  -- Auto-expiry deadline for an unanswered request (open default O5:
  -- 24 hours, then auto-decline + notify). Lives here rather than being
  -- computed at read time so the sweep (4D) and the lazy expire-on-read
  -- agree on one instant. Only meaningful while status = 'requested';
  -- the partial index in section 2 is what the sweep drives off.
  expires_at            timestamptz not null default (now() + interval '24 hours'),

  -- Stamped by the trigger — on the transition, and on an INSERT that
  -- lands directly in a live state — rather than by the route, so the
  -- timestamps cannot disagree with the status. confirmed_at is the
  -- instant the dates were reserved and the card was charged;
  -- completed_at is the instant the payout and deposit release become
  -- due. Both are write-once AND write-only-on-the-transition-that-
  -- earns-them; see section 4.
  confirmed_at          timestamptz,
  completed_at          timestamptz,

  -- HOW IT ENDED, for the three terminals that are not 'completed'.
  --
  -- decided_at is the instant the row reached 'declined', 'expired' or
  -- 'cancelled', stamped by the trigger for the same reason
  -- confirmed_at is. updated_at is NOT a usable substitute: the trigger
  -- bumps it on every UPDATE, including the same-status expires_at
  -- extension section 4 explicitly blesses.
  --
  -- cancelled_by is the discriminator O3 needs and nothing else in the
  -- row carries. 'cancelled' is reached from two directions that are
  -- priced differently — a renter backing out (RYDA keeps its fee:
  -- refund_application_fee false) and an operator backing out (full
  -- refund including the fee: refund_application_fee true) — and the
  -- refund route in 3D has to choose between them. The trigger REQUIRES
  -- this value on the transition to 'cancelled' rather than letting a
  -- route omit it, because a booking cancelled without it is
  -- permanently unclassifiable: the information is destroyed at the
  -- moment of the write, not merely deferred.
  --
  -- 'declined' and 'expired' need no actor column — declined is by
  -- definition the operator's answer and expired is by definition the
  -- sweep's.
  decided_at            timestamptz,
  cancelled_by          text
                          check (cancelled_by in ('renter','operator','admin')),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── 1b) Table-level CHECKs, asserted OUTSIDE the create ─────────────
--
-- Declared here rather than inline because `create table if not
-- exists` is a no-op against an environment that took an earlier draft
-- of this file — and a no-op that exits 0, silently leaving the table
-- without the constraints below while the migration reports success.
-- The EXCLUDE in section 3 is wrapped in a DO block for exactly this
-- reason, and 0046 uses the same drop-then-add idiom on
-- rental_listings. A money constraint is the last one to leave to
-- chance: without rental_bookings_quote_consistent the table accepts a
-- row whose renter_total_cents disagrees with base + fee, and the
-- renter's card is charged a number that does not match their receipt.

-- Platform floor 1 night, ceiling 30 (open default O1). The ceiling is
-- the same one 0044 puts on min_nights/max_nights. It is a
-- product/exposure bound — how long RYDA is willing to have one car
-- committed and one card on the hook — NOT a Stripe bound: see the
-- deposit-state block above for why the card authorization expires
-- long before night 30 and has to be re-authorized regardless.
alter table public.rental_bookings
  drop constraint if exists rental_bookings_nights_bounded;
alter table public.rental_bookings
  add constraint rental_bookings_nights_bounded
    check (end_date > start_date and end_date - start_date <= 30);

-- The quote must be internally consistent, whichever way the fee
-- falls. Without this a route that reads fee_payer wrong writes a row
-- that looks plausible and charges the wrong number — the exact class
-- of divergence fees.ts's header warns about, made impossible here.
--
--   renter   pays the fee on top:  total = base + fee, operator gets base
--   operator pays it out of payout: total = base,      operator gets base - fee
--
-- `else false` is load-bearing: a CASE with no ELSE returns NULL for
-- an unmatched value, and a CHECK passes on NULL.
alter table public.rental_bookings
  drop constraint if exists rental_bookings_quote_consistent;
alter table public.rental_bookings
  add constraint rental_bookings_quote_consistent
    check (
      case fee_payer
        when 'renter'   then renter_total_cents = base_amount_cents + fee_cents
                         and operator_net_cents = base_amount_cents
        when 'operator' then renter_total_cents = base_amount_cents
                         and operator_net_cents = base_amount_cents - fee_cents
        else false
      end
    );

-- A capture can never exceed the authorization it draws on.
alter table public.rental_bookings
  drop constraint if exists rental_bookings_deposit_capture_bounded;
alter table public.rental_bookings
  add constraint rental_bookings_deposit_capture_bounded
    check (deposit_captured_cents <= deposit_amount_cents);

-- cancelled_by answers "who cancelled", so it is meaningless — and
-- misleading to a refund route reading it — on a row that is not
-- cancelled.
alter table public.rental_bookings
  drop constraint if exists rental_bookings_cancelled_by_scoped;
alter table public.rental_bookings
  add constraint rental_bookings_cancelled_by_scoped
    check (cancelled_by is null or status = 'cancelled');

-- ── 2) Indexes ──────────────────────────────────────────────────────

-- "Show me this car's calendar." The gist index the EXCLUDE creates
-- covers only reserved rows, so this is what serves the operator's
-- full request list, declined and expired rows included.
create index if not exists rental_bookings_listing_id_idx
  on public.rental_bookings (listing_id, start_date);

-- "My rentals" (2G), newest trip first.
create index if not exists rental_bookings_renter_user_id_idx
  on public.rental_bookings (renter_user_id, start_date desc);

create index if not exists rental_bookings_status_idx
  on public.rental_bookings (status);

create index if not exists rental_bookings_created_at_idx
  on public.rental_bookings (created_at desc);

-- The expiry sweep (4D) and the lazy expire-on-read: partial, because
-- the only rows that can expire are the ones still awaiting an answer,
-- and that is a small fraction of the table.
create index if not exists rental_bookings_expiring_idx
  on public.rental_bookings (expires_at)
  where status = 'requested';

-- Idempotency, in the spirit of rental_inquiries (0039) but SCOPED TO
-- THE RENTER, which 0039 could not be and this table must be.
--
-- 0039's index is global because a rental inquiry is anonymous lead
-- capture: there is no authenticated principal for two rows to cross.
-- Here there is, and the recovery path the route is told to take (catch
-- the 23505, look the row up, return it) is what makes the difference
-- dangerous: under a GLOBAL index a client-supplied token that collides
-- with another user's hands that user's booking — their id, their
-- dates, their totals — to the caller. Including renter_user_id makes
-- the row that lookup finds necessarily the caller's own.
create unique index if not exists rental_bookings_client_token_idx
  on public.rental_bookings (renter_user_id, client_token)
  where client_token is not null;

-- The second half of idempotency, in the spirit of 0041's
-- one-pending-per-inquiry index. client_token dedupes a double tap
-- within one form mount; this dedupes the SAME TRIP asked for twice
-- across mounts (reload the page, request again, new token). Scoped to
-- the exact date range rather than to (listing, renter) so a renter can
-- still legitimately hold open requests for two different weeks on the
-- same car — which is a real thing people do and not a mistake to
-- block.
--
-- The request route should treat a 23505 here as "you have already
-- asked for these dates" and return the existing row, not an error.
--
-- BUT: two unique indexes on this table raise a bare 23505 and they do
-- not mean the same thing, so the handler must read the constraint name
-- off the error before it decides. rental_bookings_client_token_idx is
-- "this exact submission, again" (a double tap); this one is "you
-- already have an open request for these dates" (a re-ask from a fresh
-- form mount). Both are safe to answer with the existing row now that
-- both are renter-scoped — a generic catch that assumes either was not.
create unique index if not exists rental_bookings_one_open_request_idx
  on public.rental_bookings (listing_id, renter_user_id, start_date, end_date)
  where status = 'requested';

-- One charge per booking, one deposit hold per booking. The DB half of
-- the approval route's idempotency: a replayed webhook or a retried
-- approval that tries to attach an already-recorded PaymentIntent to a
-- second booking fails loudly rather than silently charging twice.
create unique index if not exists rental_bookings_charge_pi_idx
  on public.rental_bookings (charge_payment_intent_id)
  where charge_payment_intent_id is not null;

create unique index if not exists rental_bookings_deposit_pi_idx
  on public.rental_bookings (deposit_payment_intent_id)
  where deposit_payment_intent_id is not null;

-- The deposit re-authorization sweep (3C): live holds, nearest deadline
-- first. Partial for the same reason the expiry index is — only an
-- authorized hold can lapse. Without this column and this index there
-- is nothing for that sweep to drive off, which is how a 14-night
-- rental reaches its return date with an authorization that quietly
-- expired on day 7.
create index if not exists rental_bookings_deposit_expiring_idx
  on public.rental_bookings (deposit_auth_expires_at)
  where deposit_status = 'authorized';

-- ── 3) The no-double-book EXCLUDE — the centerpiece ─────────────────
--
-- Copied from 0021_bookings_no_double_book.sql, which fixed exactly
-- this bug on the co-ownership side: a read-then-insert conflict check
-- in a route is a TOCTOU race, and two requests a few milliseconds
-- apart both pass the SELECT and both write. An index does not prevent
-- that. An EXCLUDE constraint does — Postgres takes the lock, the loser
-- gets 23P01 exclusion_violation, and no car is ever promised twice.
--
-- Requires btree_gist for the uuid equality side. 0021 already enabled
-- it; repeated here so this file stands alone on a fresh database.
create extension if not exists btree_gist;

-- '[]' — inclusive on both ends, the same bound 0021 chose. That means
-- a booking returning on the 3rd occupies the 3rd, and the next renter
-- cannot pick up until the 4th. For a car that is correct rather than
-- conservative: it has to be cleaned, inspected and refuelled between
-- renters, and a same-day handoff is an operations problem the schema
-- should not create.
--
-- WHICH STATUSES RESERVE. Only 'confirmed' and 'in_progress'.
--
--   requested    does NOT reserve. Request-to-book (D3) means several
--                renters may be asking for the same week at once; the
--                operator picks. If 'requested' reserved, the first
--                click would silently lock out every other renter and
--                every expired request would leave the car unbookable
--                until a sweep ran.
--   confirmed    reserves. This is money-flow step 3c, the instant the
--                card is charged and the deposit is held. Two operators
--                (or one operator in two tabs) approving overlapping
--                requests race HERE, and the loser fails at the
--                database with 23P01. The approval route must catch
--                that code and unwind its own side effects — refund the
--                charge, void the deposit authorization — because at
--                that point real money has already moved. This is the
--                single most important error path in the rental rail.
--   in_progress  reserves. The car is physically out.
--   completed    does NOT reserve, and this is the deliberate one. The
--                car is back; the range is in the past. Keeping it in
--                the constraint would buy nothing and would make a
--                corrected or backfilled historical row impossible to
--                write.
--   declined /
--   expired /
--   cancelled    do not reserve. Releasing the dates IS what those
--                statuses mean.
--
-- The build loop's sketch lists ('confirmed','paid','in_progress'); the
-- 'paid' member is dropped for the reason given in section 1 — this
-- table has no such state.
--
-- Note the shape of the write this guards: in the product flow the
-- reservation is created by an UPDATE (requested → confirmed), not by
-- an INSERT. A partial EXCLUDE handles that correctly — the row enters
-- the constraint's index at the moment its status starts satisfying the
-- WHERE clause — so a 23P01 from this constraint is usually an approval
-- failing, not a booking creation. Usually, not always: a service-role
-- backfill may INSERT straight into 'confirmed', which enters the index
-- on the insert and is guarded on the same terms (section 4 fires on
-- INSERT too, precisely so such a row cannot skip the rest of the
-- rules).
--
-- WHAT THIS KEY IS, AND WHAT IT IS NOT. The constraint scopes by
-- listing_id — the OFFER — where 0021 scoped by asset_key, the
-- physical thing. That is not an oversight and it is not equivalent:
--
--   0021 could key the asset because the asset's name was already ON
--   the booking row (vehicle_symbol / boat_slug, coalesced into a
--   generated column). Here the car's identity lives one table over, on
--   rental_listings.vin, and an EXCLUDE cannot reach across a join. The
--   only way to key it here is to denormalize the VIN onto every
--   booking — and a denormalized key that is stamped at insert becomes
--   WRONG the day 2F backfills VINs onto listings that already have
--   bookings: old rows would carry the listing fallback, new rows the
--   VIN, and two bookings on the SAME listing would stop colliding.
--   That is a worse failure than the one it fixes.
--
-- So the asset-identity guard is layered instead, and each layer is
-- honest about its strength:
--
--   1. Same listing, overlapping dates — this constraint. Atomic; a
--      race is decided by Postgres. This is the common case and it is
--      airtight.
--   2. Two DIFFERENT listings carrying the same VIN, overlapping dates
--      — rental_bookings_assert_dates_free() in section 4, called on
--      the transition into a reserving status. A trigger check, not a
--      constraint, so two simultaneous confirmations on sibling
--      listings can still both pass; it closes the operational case
--      (an archived listing re-listed under a new slug or a new
--      operator, which 0044's rental_listings_vin_live_idx deliberately
--      permits) rather than the millisecond race.
--   3. Two live listings for one car in the first place —
--      0044's rental_listings_vin_live_idx.
--
-- Layer 3 is the real fix and it is currently a NO-OP, because 0044
-- makes vin nullable (no operator UI collects it until 2F) and the
-- index is `where vin is not null`. Until VINs are mandatory on
-- ACTIVE listings, an operator who imports the same Huracan twice has
-- two independent calendars for one car and nothing in this schema can
-- tell. Making vin required cannot be done here: it would invalidate
-- every listing in the existing 37-car fleet. It belongs to 2F, with a
-- backfill, and it is the single most important thing that task owes
-- this constraint.
do $$
begin
  alter table public.rental_bookings
    add constraint rental_bookings_no_overlap
    exclude using gist (
      listing_id with =,
      daterange(start_date, end_date, '[]') with &&
    )
    where (status in ('confirmed', 'in_progress'));
exception when duplicate_object then
  null;
end $$;

-- ── 4) State machine + immutability trigger ─────────────────────────
--
-- Guardrail 3.8: enforce state at the database, not just the route.
-- Written in the shape of rental_payments_enforce_status (0041) — one
-- BEFORE INSERT OR UPDATE function that combines the transition rules
-- with the immutability rules, because both answer the same question
-- ("is this write allowed to exist?") and splitting them across two
-- triggers means two places to look when one of them fires.
--
-- INSERT IS GUARDED TOO, and that is not decoration. `status` defaults
-- to 'requested' but nothing pins it there, so an UPDATE-only trigger
-- leaves every rule below bypassable by writing the row straight into
-- its end state: a service-role route, an admin backfill, a seed script
-- or the acceptance checklist in supabase/tests/rls.sql can INSERT
-- `status = 'confirmed'` and get a row that holds its dates in the
-- EXCLUDE index, is charged (post-3B), and has confirmed_at NULL —
-- contradicting the promise made on that column and silently skipping
-- every consumer keyed on it (the D6 operator reveal, O3's
-- cancellation clock, the receipt line, the 2G upcoming/active split).
-- The INSERT branch does not forbid creating a row in a live state —
-- backfills legitimately need that — it makes such a row honest:
-- timestamps stamped, cancelled_by required, dates re-checked.
--
-- LEGAL TRANSITIONS
--   requested   → confirmed | declined | expired | cancelled
--   confirmed   → in_progress | cancelled
--   in_progress → completed
--   completed / declined / expired / cancelled → nothing; terminal.
--
-- Terminal-stays-terminal falls out of the structure rather than being
-- asserted separately: a status that appears on no left-hand side can
-- never appear in a legal pair, so any move off it fails.
--
-- Two of those deserve their reasoning written down:
--
--   confirmed → cancelled, but never confirmed → declined. 'declined'
--   is the operator's answer to a REQUEST. An operator backing out
--   after confirmation is a cancellation, and O3 prices it differently
--   (operator cancellation → full refund including RYDA's fee). Same
--   English word, different money; different status.
--
--   in_progress → completed only. Once the car is out, the trip ends by
--   the car coming back. A damaged or late return is a deposit claim
--   and a dispute (3C/3D) recorded against the payment, not a rewrite
--   of the booking's status; a car that never comes back is an incident
--   report, not a state transition. If a real operational need for
--   in_progress → cancelled ever appears, add it here with its money
--   semantics spelled out — do not let a route work around this guard.
--
-- Same-status updates pass through the TRANSITION table untouched, so a
-- route can stamp expires_at (a granted extension) without tripping the
-- guard — the same allowance 0041 makes for its webhook. They do not
-- pass through the immutability rules: see the write-once block, which
-- is why that extension cannot smuggle a confirmed_at onto a row that
-- was never confirmed.
--
-- THREE CLOCK RULES the transition table alone cannot express:
--
--   requested → confirmed is refused past expires_at. Without this the
--   24h auto-expiry (O5) is advisory: the renter is told the request
--   auto-declines in a day and books elsewhere, the sweep (4D) does not
--   run until the next daily cron window, and an operator clicking
--   Approve at hour 25 still charges the card and locks the dates. The
--   same clause also settles the race between the approve UPDATE and
--   the expire UPDATE — both target a 'requested' row, and only one of
--   them stays legal once the deadline passes.
--
--   → completed is refused before the trip has started. 'completed' is
--   deliberately outside the EXCLUDE (section 3: "the car is back; the
--   range is in the past"), so completing a booking RELEASES its
--   remaining days. That premise is unenforced by the status alone: a
--   handover flow firing early, or a mis-tap on the wrong row of the
--   fleet dashboard, would free days the car is still out for, and
--   'completed' is terminal so it cannot be walked back. This refuses
--   the clearly-wrong case. A genuine EARLY return mid-trip is still
--   allowed and still frees the remaining days — that is correct, the
--   car really is back — but it is a decision the operator makes with
--   the car in front of them.
--
--   → cancelled requires cancelled_by. See the column comment: without
--   the actor the O3 refund tier is unknowable, and unknowable
--   permanently, because nothing else in the row records who backed
--   out.
--
-- THE EXCLUDE constraint is not re-checked here; it does not need to
-- be, because it is a constraint and fires on this same statement after
-- the trigger, raising 23P01. What IS checked here is everything the
-- EXCLUDE structurally cannot see — the operator's blackout calendar
-- (0046) and a sibling listing carrying the same VIN — via
-- rental_bookings_assert_dates_free() below, on the transition INTO a
-- reserving status. 0046's precedence rule (d) says a confirmed booking
-- beats a blackout, and it does: that rule governs the READ path, where
-- a blackout added after a confirmation must not un-book a paid renter.
-- It was never a licence to confirm INTO a blackout, and until this
-- check existed nothing stopped it — the operator's maintenance window
-- was silently consumed and the car handed over on the day it was
-- booked into the shop.
--
-- The legal-transition table below is mirrored, deliberately, in
-- src/lib/rental-booking-status.ts so the routes and their Vitest suite
-- share one definition with this trigger. That file's test parses THIS
-- file and fails if the two drift — including if a status is added to
-- the CHECK constraint above without being added there.

-- The cross-table half of "are these dates actually free", called on
-- the write that reserves them. Two questions the EXCLUDE cannot ask,
-- because both live one join away:
--
--   1. Is a day in this range blacked out (0046)? Evaluated with 0046's
--      own precedence — a 'blackout' row blocks a day unless an 'open'
--      row covers the same day. At most 31 days per call (the nights
--      ceiling), so the day-by-day expansion is cheap and exact.
--   2. Does another LISTING for the same physical car already hold an
--      overlapping range? See the asset-identity note in section 3:
--      this is layer 2 of that guard, and it is a check rather than a
--      constraint — it catches the operational case (one car listed
--      twice, e.g. archived then re-listed) but not two simultaneous
--      confirmations racing on sibling listings.
--
-- SECURITY INVOKER on purpose. Every write to rental_bookings is a
-- service-role route (section 5 revokes the table grant from
-- authenticated outright), so this runs with RLS bypassed and sees
-- every listing and every blackout. If a future path ever writes as
-- `authenticated`, this check reads only what that caller could read —
-- which fails toward "no conflict found", so that path must not exist
-- without revisiting this function.
create or replace function public.rental_bookings_assert_dates_free(
  p_listing_id uuid,
  p_start_date date,
  p_end_date   date
)
returns void as $$
declare
  blocked_day date;
  sibling_id  uuid;
begin
  select d::date
    into blocked_day
    from generate_series(p_start_date::timestamp,
                         p_end_date::timestamp,
                         interval '1 day') as d
   where exists (
           select 1
             from public.rental_availability a
            where a.listing_id = p_listing_id
              and a.kind = 'blackout'
              and d::date between a.start_date and a.end_date)
     and not exists (
           select 1
             from public.rental_availability a
            where a.listing_id = p_listing_id
              and a.kind = 'open'
              and d::date between a.start_date and a.end_date)
   limit 1;

  if blocked_day is not null then
    raise exception
      'rental_bookings: % is blacked out on this listing (rental_availability); clear the blackout or decline the request',
      blocked_day;
  end if;

  select b.id
    into sibling_id
    from public.rental_bookings b
    join public.rental_listings l    on l.id = b.listing_id
    join public.rental_listings mine on mine.id = p_listing_id
   where b.listing_id <> p_listing_id
     and mine.vin is not null
     and l.vin is not null
     and upper(l.vin) = upper(mine.vin)
     and b.status in ('confirmed', 'in_progress')
     and daterange(b.start_date, b.end_date, '[]')
         && daterange(p_start_date, p_end_date, '[]')
   limit 1;

  if sibling_id is not null then
    raise exception
      'rental_bookings: booking % already holds these dates on another listing for the same VIN',
      sibling_id;
  end if;
end;
$$ language plpgsql;

create or replace function public.rental_bookings_enforce_status()
returns trigger as $$
begin
  new.updated_at := now();

  -- ── the INSERT branch ───────────────────────────────────────────
  -- OLD does not exist here, so this returns before any OLD reference
  -- below. Its job is to make a row created directly in a live or
  -- terminal state indistinguishable from one that walked there.
  if tg_op = 'INSERT' then
    if new.status = 'cancelled' and new.cancelled_by is null then
      raise exception 'rental_bookings: cancelled_by is required on a cancelled booking (renter/operator/admin — O3 refunds them differently)';
    end if;

    -- A row inserted at or past 'confirmed' HAS been confirmed; the
    -- instant is either supplied by the backfill or is now().
    if new.status in ('confirmed', 'in_progress', 'completed') then
      new.confirmed_at := coalesce(new.confirmed_at, now());
    end if;
    if new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
    if new.status in ('declined', 'expired', 'cancelled') then
      new.decided_at := coalesce(new.decided_at, now());
    end if;

    -- An insert that lands straight in a reserving status reserves the
    -- dates, so it answers the same cross-table questions an approval
    -- does.
    if new.status in ('confirmed', 'in_progress') then
      perform public.rental_bookings_assert_dates_free(
        new.listing_id, new.start_date, new.end_date);
    end if;

    return new;
  end if;

  -- Identity is frozen. The car, the renter, the dates, the initiating
  -- party and the idempotency token are what the row IS; changing any
  -- of them makes it a different booking that happens to reuse a
  -- primary key.
  --
  -- Freezing the dates is the part with a design consequence: it means
  -- "propose alternate dates" (D3) cannot be an edit. The operator
  -- declines and quotes again, which is the same shape as 0041's "a
  -- re-quote is a NEW row" and leaves both the original ask and the
  -- counter-offer legible in the history.
  if new.listing_id is distinct from old.listing_id
     or new.renter_user_id is distinct from old.renter_user_id
     or new.start_date is distinct from old.start_date
     or new.end_date is distinct from old.end_date
     or new.initiated_by is distinct from old.initiated_by
     or new.client_token is distinct from old.client_token then
    raise exception 'rental_bookings: listing, renter, dates, initiated_by and client_token are immutable (propose alternates as a NEW row)';
  end if;

  -- The frozen quote. Every number a renter was shown and every number
  -- an operator will be paid, fixed at request time. A commission
  -- change tomorrow must not rewrite what was agreed today (0041).
  if new.base_amount_cents is distinct from old.base_amount_cents
     or new.fee_cents is distinct from old.fee_cents
     or new.fee_payer is distinct from old.fee_payer
     or new.deposit_amount_cents is distinct from old.deposit_amount_cents
     or new.renter_total_cents is distinct from old.renter_total_cents
     or new.operator_net_cents is distinct from old.operator_net_cents
     or new.currency is distinct from old.currency then
    raise exception 'rental_bookings: the quote snapshot is immutable (a re-quote is a NEW row)';
  end if;

  -- The charge is write-once for the same reason the dates are: a
  -- second PaymentIntent against one booking is a second charge, and if
  -- the first one is overwritten nothing is left to reconcile or refund
  -- it by. A re-charge is a new booking.
  if old.charge_payment_intent_id is not null
     and new.charge_payment_intent_id is distinct from old.charge_payment_intent_id then
    raise exception 'rental_bookings: charge_payment_intent_id is write-once';
  end if;

  -- Lifecycle timestamps are write-once. They record when money moved;
  -- a second write would be a rewrite of the ledger's clock.
  if (old.confirmed_at is not null and new.confirmed_at is distinct from old.confirmed_at)
     or (old.completed_at is not null and new.completed_at is distinct from old.completed_at)
     or (old.decided_at is not null and new.decided_at is distinct from old.decided_at)
     or (old.cancelled_by is not null and new.cancelled_by is distinct from old.cancelled_by) then
    raise exception 'rental_bookings: confirmed_at, completed_at, decided_at and cancelled_by are write-once';
  end if;

  -- ...and a FIRST write is only legal on the transition that earns it.
  -- Checking only `old is not null` above would leave every one of these
  -- freely writable — and freely BACKDATABLE — on any row that has not
  -- been stamped yet, which is every row that matters: the same-status
  -- expires_at extension blessed above could set confirmed_at =
  -- '2026-07-01' on a still-'requested' booking, and the stamping below
  -- coalesces, so the later confirmation would PRESERVE the fabricated
  -- instant instead of recording the real one. O3's cancellation tiers
  -- and every "confirmed N days ago" audit would then read a timestamp
  -- no confirmation produced. Write-once needs both halves: not twice,
  -- and not before.
  if old.confirmed_at is null and new.confirmed_at is not null
     and not (new.status = 'confirmed' and old.status is distinct from 'confirmed') then
    raise exception 'rental_bookings: confirmed_at may only be stamped on the transition into confirmed';
  end if;
  if old.completed_at is null and new.completed_at is not null
     and not (new.status = 'completed' and old.status is distinct from 'completed') then
    raise exception 'rental_bookings: completed_at may only be stamped on the transition into completed';
  end if;
  if old.decided_at is null and new.decided_at is not null
     and not (new.status is distinct from old.status
              and new.status in ('declined', 'expired', 'cancelled')) then
    raise exception 'rental_bookings: decided_at may only be stamped on the transition into declined/expired/cancelled';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'requested' and new.status in ('confirmed','declined','expired','cancelled'))
      or (old.status = 'confirmed' and new.status in ('in_progress','cancelled'))
      or (old.status = 'in_progress' and new.status in ('completed'))
    ) then
      raise exception 'illegal rental_bookings status transition: % -> %',
        old.status, new.status;
    end if;

    -- The deadline is a deadline. Legal in the transition table, refused
    -- by the clock: an unanswered request that has passed expires_at can
    -- only be expired (or declined/cancelled), never approved.
    if old.status = 'requested' and new.status = 'confirmed'
       and old.expires_at <= now() then
      raise exception 'rental_bookings: this request expired at % and can no longer be confirmed (expire it; a revived deal is a NEW row)',
        old.expires_at;
    end if;

    -- A trip cannot finish before it starts. current_date is UTC on
    -- Supabase, matching the UTC-only day math in
    -- src/lib/rental-availability.ts.
    if new.status = 'completed' and old.start_date > current_date then
      raise exception 'rental_bookings: cannot complete a rental that has not started (pickup is %)',
        old.start_date;
    end if;

    if new.status = 'cancelled' and new.cancelled_by is null then
      raise exception 'rental_bookings: cancelled_by is required on a cancellation (renter/operator/admin — O3 refunds them differently)';
    end if;

    -- Stamped here so status and timestamp cannot disagree. coalesce so
    -- a backfill that supplies its own instant is respected — bounded by
    -- the "only on the transition that earns it" rule above.
    if new.status = 'confirmed' then
      new.confirmed_at := coalesce(new.confirmed_at, now());
    end if;
    if new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
    if new.status in ('declined', 'expired', 'cancelled') then
      new.decided_at := coalesce(new.decided_at, now());
    end if;

    -- Entering a reserving status is the write that takes the dates, so
    -- it answers the cross-table questions the EXCLUDE cannot. Skipped
    -- on confirmed → in_progress: the row already holds these days and
    -- re-asking would let a blackout written mid-trip block a handover
    -- that money has already paid for (0046 precedence (d)).
    if new.status in ('confirmed', 'in_progress')
       and old.status not in ('confirmed', 'in_progress') then
      perform public.rental_bookings_assert_dates_free(
        new.listing_id, new.start_date, new.end_date);
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists rental_bookings_status_guard on public.rental_bookings;
create trigger rental_bookings_status_guard
  before insert or update on public.rental_bookings
  for each row execute function public.rental_bookings_enforce_status();

-- ── 5) RLS + column privileges ──────────────────────────────────────
--
-- Guardrail 3.7 for this table: renter-scoped SELECT, operator SELECT
-- for their own listings, writes via service-role routes only, no anon
-- access of any kind. A booking is not public the way a listing is —
-- 0044's public browse policy has no analogue here.

alter table public.rental_bookings enable row level security;

-- A renter sees their own bookings and nothing else. Null-safe by
-- construction: for an anonymous caller auth.uid() is null, and
-- `renter_user_id = null` is NULL rather than true, so the policy
-- matches no rows.
--
-- On D6 (operators stay anonymous until confirmation): this policy hands
-- the renter their own row, which carries listing_id. Following that to
-- rental_listings is allowed — it is public — but rental_listings does
-- not name the operator either, and public.partners has RLS enabled
-- with zero policies (0041), so the browser cannot reach the operator's
-- identity from here at any status. The reveal at confirmation is
-- therefore something a server route DOES, not something RLS stops
-- being true. Nothing in this migration weakens it.
drop policy if exists rental_bookings_select_renter on public.rental_bookings;
create policy rental_bookings_select_renter
  on public.rental_bookings
  for select
  to authenticated
  using (renter_user_id = auth.uid());

-- Operator staff see the bookings on the cars they own — including the
-- 'requested' ones, which is the point: an operator who cannot see
-- their own inbound requests cannot approve them.
--
-- The subquery is itself subject to rental_listings' RLS, the same trap
-- 0044 documents for its photo policies. It resolves because 0044's
-- select policy is `status = 'active' or is_partner_staff(partner_id)`,
-- so an operator can always see their own listing whatever its status —
-- a request on a car they have since paused stays visible to them.
drop policy if exists rental_bookings_select_operator on public.rental_bookings;
create policy rental_bookings_select_operator
  on public.rental_bookings
  for select
  to authenticated
  using (
    exists (
      select 1 from public.rental_listings l
      where l.id = rental_bookings.listing_id
        and public.is_partner_staff(l.partner_id)
    )
  );

-- Admins, same expression as 0044 / 0042 / 0022.
--
-- Read the column-privilege block below before assuming FOR ALL means
-- what it means on those tables: privileges are granted per ROLE, and
-- an admin's browser session is still the `authenticated` role, which
-- this migration leaves holding column-level SELECT and nothing else.
-- So this policy is effectively read-only from a browser and the
-- withheld columns stay withheld even for an admin. That is not a
-- regression — every admin surface in this repo writes through a
-- service-role route behind requireAdmin (/api/admin/*), and
-- service_role keeps its full grant.
drop policy if exists rental_bookings_admin_all on public.rental_bookings;
create policy rental_bookings_admin_all
  on public.rental_bookings
  for all
  using ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' )
  with check ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' );

-- No INSERT / UPDATE / DELETE policy for authenticated, on purpose.
-- Every write is a money event — creating a request quotes a price,
-- confirming one charges a card — and belongs to a service-role route
-- that verifies ownership in code (RYDA's dominant pattern).
--
-- COLUMN PRIVILEGES, and why this table needs them when 0044 did not.
--
-- Guardrail 3.7 says commission must never reach the browser, which is
-- why partners and rental_payments carry zero client policies. This
-- table cannot take that posture — a renter has to be able to read
-- their own booking — but it carries fee_cents and operator_net_cents,
-- which together ARE the commission on that deal. A renter-scoped
-- SELECT policy would hand every renter RYDA's take rate, and hand it
-- to the operator's staff as well.
--
-- RLS is row-level; it cannot express "this row, minus two columns".
-- Column-level GRANTs can. Note the order: Postgres will not let a
-- column-level REVOKE carve an exception out of a table-level grant
-- (it warns and does nothing), and Supabase's default privileges grant
-- ALL on new public tables to anon and authenticated. So the table
-- grant must be withdrawn first and a column list granted back.
--
-- What the renter loses is less than it looks. When fee_payer =
-- 'renter' the fee is on their own receipt and stays derivable
-- (renter_total_cents - base_amount_cents). When fee_payer = 'operator'
-- the renter pays exactly base_amount_cents and RYDA's cut is none of
-- their business — which is precisely the case the guardrail is about.
-- Operator staff read their net through the /partner service-role
-- routes, as they already read everything else commercial.
--
-- If a browser query ever fails with "permission denied for column
-- fee_cents", it is a `select *` that should be a column list — this
-- block is the reason, and the failure is deliberate and loud.
revoke all on public.rental_bookings from anon, authenticated;

-- The list is deny-by-default: a column not named here is unreadable
-- from a browser at any status. fee_cents and operator_net_cents are
-- withheld because they ARE the commission (above). The Stripe object
-- ids (charge_payment_intent_id, deposit_payment_intent_id) and the
-- rental_payments linkage are withheld too — nothing on a renter's or
-- an operator's screen needs a raw PaymentIntent id, and the routes
-- that do hold service-role. The deposit STATE columns are granted:
-- "your $2,000 hold was released" is exactly what a renter should be
-- able to read on their own booking. cancelled_by and decided_at are
-- granted for the same reason — a renter is entitled to know who
-- cancelled their trip and when.
grant select (
  id, listing_id, renter_user_id, start_date, end_date, status,
  initiated_by, base_amount_cents, fee_payer, deposit_amount_cents,
  deposit_status, deposit_authorized_at, deposit_auth_expires_at,
  deposit_captured_cents, renter_total_cents,
  currency, client_token, expires_at, confirmed_at, completed_at,
  decided_at, cancelled_by, created_at, updated_at
) on public.rental_bookings to authenticated;

-- ── 6) Comments ─────────────────────────────────────────────────────

comment on table public.rental_bookings is
  'Daily-rental bookings: one row per renter request against a listing, carrying the quote it was made at. Dates are reserved only in confirmed/in_progress (see rental_bookings_no_overlap); status moves are enforced by rental_bookings_enforce_status. Separate from the co-ownership bookings table (0009/0021).';

comment on column public.rental_bookings.status is
  'requested -> confirmed -> in_progress -> completed, with terminal declined / expired / cancelled. Mirrored in src/lib/rental-booking-status.ts. Note this column spells its terminal ''cancelled''; rental_payments (0041) spells its own ''canceled''.';

comment on column public.rental_bookings.base_amount_cents is
  'Frozen quote: daily rate x billable nights after discounts, before RYDA''s fee. Immutable after insert — a re-quote is a new row.';

comment on column public.rental_bookings.fee_cents is
  'RYDA''s booking fee for this row, frozen at quote time. Not readable by anon or authenticated (column grant, section 5): it discloses the operator''s commission.';

comment on column public.rental_bookings.fee_payer is
  'renter = fee added on top of base (renter_total = base + fee); operator = fee deducted from payout (operator_net = base - fee). Enforced by rental_bookings_quote_consistent.';

comment on column public.rental_bookings.deposit_amount_cents is
  'Security-deposit authorization (D5), held via a separate manual-capture PaymentIntent. Deliberately NOT part of renter_total_cents — it is held, not charged. The hold''s own lifecycle lives in the deposit_* columns beside it.';

comment on column public.rental_bookings.deposit_status is
  'Lifecycle of the deposit hold: none -> authorized -> released | captured | expired. A card authorization lapses in roughly 7 days (extended auth reaches ~30 on eligible cards only), so a rental longer than a week must be re-authorized before its return — deposit_auth_expires_at is what that sweep indexes on.';

comment on column public.rental_bookings.deposit_payment_intent_id is
  'Manual-capture PaymentIntent backing the hold. Deliberately NOT write-once: a re-authorization replaces a lapsed hold with a new PaymentIntent on the same booking.';

comment on column public.rental_bookings.charge_payment_intent_id is
  'The rental charge (money-flow step 3a), write-once. The compare-and-swap target that stops a retried approval — webhook replay, double-click, 23P01 unwind-and-retry — charging the renter twice for one confirmation.';

comment on column public.rental_bookings.initiated_by is
  'Which party opened this row. An operator''s counter-offer (D3 propose-alternates) is a NEW ''requested'' row initiated_by = operator: the 2F request inbox must exclude it, and the 4D 24h sweep must not auto-expire the operator''s own proposal while the renter is the one being waited on.';

comment on column public.rental_bookings.cancelled_by is
  'Who cancelled: renter (RYDA keeps its fee) or operator/admin (full refund including the fee). Required by the trigger on any transition into ''cancelled'' because O3 prices the two differently and nothing else in the row records the actor.';

comment on column public.rental_bookings.decided_at is
  'When the booking reached declined / expired / cancelled. Stamped by the trigger; updated_at is not a substitute because it also moves on the legal same-status expires_at extension.';

comment on column public.rental_bookings.expires_at is
  'Auto-decline deadline for an unanswered request (default 24h, open item O5). Only meaningful while status = requested — and enforced: the trigger refuses requested -> confirmed once it has passed.';

comment on function public.rental_bookings_enforce_status() is
  'State machine + immutability guard for rental_bookings, on INSERT and UPDATE: only legal status transitions, terminal states stay terminal, expiry and start-date clocks respected, cancellations name an actor, and the identity + frozen quote columns cannot be edited. Mirrored in src/lib/rental-booking-status.ts.';

comment on function public.rental_bookings_assert_dates_free(uuid, date, date) is
  'Cross-table half of the no-double-book guard, called when a booking enters confirmed/in_progress: refuses dates covered by an un-overridden blackout (0046) and dates already held by a booking on another listing with the same VIN. The EXCLUDE constraint handles the same-listing case atomically.';

-- ── 7) The payments seam ────────────────────────────────────────────
--
-- rental_payments (0041) is the ledger for the rental rail, and until
-- now its only parent was rental_inquiries — `inquiry_id not null`.
-- That makes it unusable for a booking charge: when 3B charges a
-- confirmed booking it has nowhere to write the payment row without
-- either inventing a dummy inquiry or altering an applied table in a
-- hurry, mid-incident, with a migration that would ALSO void the
-- one-live-pending-link guard (a nullable inquiry_id never collides in
-- that partial unique index).
--
-- Doing it here instead costs one nullable column and one CHECK, and
-- keeps the guard intact on both sides. A payment now has exactly one
-- parent — the old inquiry flow or the new booking flow, never both,
-- never neither.
--
-- Direction: the link lives on rental_payments, not on rental_bookings.
-- One booking can accumulate several payment rows over its life (the
-- charge, a re-authorized deposit, a refund), so a single
-- rental_payment_id on the booking would be wrong within a phase. The
-- booking keeps only its own Stripe object ids, which are one-per-
-- booking by construction.

alter table public.rental_payments
  add column if not exists booking_id uuid
    references public.rental_bookings(id) on delete restrict;

alter table public.rental_payments
  alter column inquiry_id drop not null;

alter table public.rental_payments
  drop constraint if exists rental_payments_one_parent;
alter table public.rental_payments
  add constraint rental_payments_one_parent
    check (num_nonnulls(inquiry_id, booking_id) = 1);

create index if not exists rental_payments_booking_id_idx
  on public.rental_payments (booking_id);

-- The booking-side twin of rental_payments_one_pending_per_inquiry
-- (0041): one live pending link per booking, so two admins or two
-- retries racing the same approval produce one payment row and the
-- loser reads a 23505 rather than charging again.
create unique index if not exists rental_payments_one_pending_per_booking
  on public.rental_payments (booking_id)
  where status = 'pending';

comment on column public.rental_payments.booking_id is
  'Parent booking for a rental-booking charge (0047). Exactly one of inquiry_id / booking_id is set — the pre-booking inquiry flow (0039) or the request-to-book flow. Frozen after insert by rental_payments_enforce_status.';

-- inquiry_id and partner_id are already frozen by 0041's guard; a
-- parent pointer that can be re-aimed after the money moved is the
-- same hole, so booking_id joins them. Replacing the function here
-- rather than editing 0041 keeps the applied file untouched — the
-- newest migration wins, which is the only ordering that survives a
-- fresh rebuild.
create or replace function public.rental_payments_enforce_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if old.status <> 'pending'
       or new.status not in ('paid', 'expired', 'canceled') then
      raise exception 'illegal rental_payments status transition: % -> %',
        old.status, new.status;
    end if;
  end if;

  if new.amount_cents is distinct from old.amount_cents
     or new.application_fee_cents is distinct from old.application_fee_cents
     or new.currency is distinct from old.currency
     or new.inquiry_id is distinct from old.inquiry_id
     or new.booking_id is distinct from old.booking_id
     or new.partner_id is distinct from old.partner_id then
    raise exception 'rental_payments: financial fields are immutable';
  end if;

  if old.status = 'paid'
     and (new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id
          or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
          or new.paid_at is distinct from old.paid_at) then
    raise exception 'rental_payments: paid rows are immutable';
  end if;

  return new;
end;
$$ language plpgsql;
