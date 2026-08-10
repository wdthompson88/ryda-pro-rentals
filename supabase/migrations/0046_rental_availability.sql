-- 0046: rental_availability — the per-car calendar. A default-open
-- operating window on the listing, plus explicit operator blackouts.
-- (RYDA_RENTAL_BUILD_LOOP.md, phase 2A. Claims 0046; 0047 is claimed by
-- rental_bookings, phase 2B.)
--
-- WHAT THIS MODELS
-- 0044 gave every car a listing row, so /rent can show a price. Nothing
-- yet says WHEN that car can be rented, so it cannot show a date. This
-- migration adds the two halves of that answer:
--
--   1. An OPERATING WINDOW, on the listing itself: the span the operator
--      is willing to rent at all (available_from / available_until) and
--      how far ahead a renter may reach (booking_horizon_days). Every
--      one of them is optional-with-a-default, so a listing that says
--      nothing is OPEN for the next 180 days.
--
--      Default-open is deliberate. An operator who publishes a listing
--      is already offering the car; making them paint in every
--      available day before a single renter can ask would turn an
--      un-managed calendar into a dead listing, and the 37-car fleet
--      that 0044 exists to absorb has no per-day data at all. The
--      failure mode of default-open is a request for a day the operator
--      cannot serve — which decision D3 (request-to-book, the operator
--      approves) is designed to absorb. The failure mode of
--      default-closed is an empty marketplace.
--
--   2. RANGE ROWS in public.rental_availability that modify that window.
--      kind = 'blackout' subtracts days (maintenance, the owner is
--      driving it, a booking taken off-platform); kind = 'open' adds
--      them back — the exception carved out of a blackout, e.g. all of
--      August is blocked for a rebuild but the car is drivable on the
--      20th-22nd.
--
-- PRECEDENCE, stated once here and mirrored exactly by
-- src/lib/rental-availability.ts:
--
--   a. A day outside the operating window is never selectable. An
--      'open' row cannot reach past available_until or past the
--      horizon — to rent outside the season, move the season. This is
--      what keeps the horizon a real bound rather than a suggestion.
--   b. Within the window a day is open unless a 'blackout' covers it.
--   c. An 'open' row overrides a 'blackout' on the days they share.
--   d. A confirmed booking (0047) beats all of the above. That is real
--      money against a physical car; no operator row un-blocks it.
--
-- Rule (d) is about READING a calendar that already contains both, and
-- it is one-directional on purpose: a blackout written after a booking
-- was confirmed must not un-book a renter whose card has been charged.
-- It is NOT a licence to confirm a booking INTO an existing blackout.
-- That direction is enforced on the write, in 0047's
-- rental_bookings_assert_dates_free(), which the booking trigger calls
-- on the transition into confirmed/in_progress and which applies
-- exactly the precedence above ((c) included — an 'open' override
-- re-opens the day). Without it the pair could be created in either
-- order with no signal: an operator books the car in for service, then
-- approves a still-open request from last week, and the calendar
-- silently resolves the conflict in the booking's favour while the car
-- is handed over on the days it is due in the shop.
--
-- WHAT THIS IS NOT: the booking table.
-- A confirmed booking also consumes days, and it is deliberately NOT
-- written here as a blackout row. Availability is operator INTENT;
-- a booking is a renter COMMITMENT. Merging them would mean a
-- cancellation has to un-write a blackout (and a failed un-write
-- silently strands inventory), and — the real reason — the constraint
-- that prevents double-booking has to sit on the table where the race
-- actually happens, which is 0021's whole lesson. The read path unions
-- the two; the database keeps them apart.
--
-- RLS posture (guardrail 3.7): PUBLIC SELECT, gated through the parent
-- listing. Renters browse open days before they have an account, so
-- this is the OPPOSITE of the co-ownership calendar (members-only).
-- These are NEW policies on a NEW table; nothing here touches
-- public.bookings (0009/0021), its policies, or its trigger — the
-- co-ownership calendar is left exactly as it is, per guardrail 3.6.

-- ── 1) The operating window, on rental_listings ─────────────────────
--
-- These live on the listing rather than in a rental_availability row
-- because there is exactly ONE window per car: a table with a unique
-- (listing_id) is a column wearing a table costume, and it would force
-- every read of the calendar into a join that returns zero rows for the
-- common case (an operator who has set nothing). 0045 set the
-- precedent for a later migration widening an earlier rental table.
--
-- Nullable on both ends, and the null means "unbounded", not "unknown":
--   available_from  null → rentable from today
--   available_until null → rentable to the end of the horizon
--
-- booking_horizon_days is what makes "unbounded" finite. Without it a
-- default-open listing is open forever and the calendar UI has no last
-- page; worse, a renter could hold a date in 2031 against a car whose
-- operator may not exist. 180 days is the default because it comfortably
-- covers a season's planning without letting a request outlive the
-- Stripe objects (D5's deposit hold) that will eventually back it.
--
-- The 0044 update guard (rental_listings_enforce_update) needs no
-- change: it bumps updated_at, pins partner_id, and polices status
-- transitions. Editing a window is a same-status edit, which that
-- trigger already passes through.

alter table public.rental_listings
  add column if not exists available_from date;

alter table public.rental_listings
  add column if not exists available_until date;

alter table public.rental_listings
  add column if not exists booking_horizon_days smallint not null default 180;

-- Constraints are dropped before being added because Postgres has no
-- `add constraint if not exists`, and re-running this file must correct
-- an environment that took an earlier draft (0045's idiom).
alter table public.rental_listings
  drop constraint if exists rental_listings_window_ordered;

alter table public.rental_listings
  add constraint rental_listings_window_ordered
    check (available_from is null
           or available_until is null
           or available_until >= available_from);

-- Ceiling 730 (two years) rather than unbounded so the day-expansion in
-- src/lib/rental-availability.ts has a provable upper bound; floor 1 so
-- a horizon of 0 cannot silently delist a car that still reads as
-- 'active' on the grid.
alter table public.rental_listings
  drop constraint if exists rental_listings_horizon_range;

alter table public.rental_listings
  add constraint rental_listings_horizon_range
    check (booking_horizon_days >= 1 and booking_horizon_days <= 730);

-- ── 2) rental_availability ──────────────────────────────────────────
--
-- One row per range the operator has an opinion about. A listing with
-- no rows at all is fully open inside its window — the absence of a row
-- is meaningful, and it is the common case.
--
-- Dates are stored as two `date` columns, not as a single daterange,
-- for three reasons: 0021 and (per the build loop) 0047 both key their
-- EXCLUDE off `start_date` / `end_date` the same way, so the three
-- tables can be unioned without a shape translation; the JS client
-- reads a date as 'YYYY-MM-DD' and a daterange as the string
-- '[2026-08-05,2026-08-09)', which every consumer would then have to
-- re-parse; and a CHECK on ordering is legible where a range's
-- emptiness is not.
--
-- BOTH ENDPOINTS ARE INCLUSIVE. A blackout of 2026-08-10 → 2026-08-12
-- blocks three days, which is what an operator typing those dates
-- means. This matches the '[]' bound in the EXCLUDE below and in 0021,
-- and it is the reason the calendar's occupancy notion (days) differs
-- from its billing notion (nights): the 5th → the 8th occupies four
-- calendar days and bills three nights. Both live in one place,
-- src/lib/rental-availability.ts, with tests.

create table if not exists public.rental_availability (
  id            uuid primary key default gen_random_uuid(),

  -- `cascade` rather than the `restrict` used on rental_listings
  -- .partner_id: a calendar is a property OF a listing, carrying no
  -- history worth stranding once the listing is gone. (A booking is the
  -- opposite and 0047 should restrict.) Note that 0044 makes archive,
  -- not delete, the normal end of a listing's life, so this path is the
  -- unusual one.
  listing_id    uuid not null references public.rental_listings(id) on delete cascade,

  -- blackout — subtract these days from the operating window
  -- open      — add them back; overrides a blackout on shared days
  --
  -- Free text is not an option here the way it is for
  -- rental_listings.category: this value changes whether a car can be
  -- booked, so a typo must fail at write time rather than resolve to
  -- "not a blackout, therefore bookable". The CHECK itself is asserted
  -- after the create — see the note below.
  kind          text not null,

  start_date    date not null,
  end_date      date not null,

  -- Operator's note. A CHECKED vocabulary rather than free text, and
  -- that is a privacy decision, not a taste one: SELECT on this table is
  -- PUBLIC, so whatever lands in this column is renter-visible. A free
  -- text field would eventually hold "held for Bob Smith, +1 305…" and
  -- publish it on a browse page. Four coarse buckets carry everything
  -- the operator dashboard (2F) needs to render and leak nothing.
  reason        text
                  check (reason is null
                         or reason in ('maintenance','owner_use','off_platform','other')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The two CHECKs that decide whether a row can BLOCK a day, asserted
-- outside the create for the reason the drop-then-add idiom exists in
-- section 1: `create table if not exists` is a no-op against an
-- environment that took an earlier draft of this file, and a no-op that
-- exits 0 — leaving the table without them while the migration reports
-- success. A missing kind CHECK is the worst of the pair: an
-- unrecognised kind is dropped by partition() in
-- src/lib/rental-availability.ts, so a typo'd 'blackuot' row silently
-- resolves to "not a blackout, therefore bookable".
alter table public.rental_availability
  drop constraint if exists rental_availability_kind_valid;
alter table public.rental_availability
  add constraint rental_availability_kind_valid
    check (kind in ('blackout','open'));

alter table public.rental_availability
  drop constraint if exists rental_availability_dates_ordered;
alter table public.rental_availability
  add constraint rental_availability_dates_ordered
    check (end_date >= start_date);

-- The calendar read: every row for one car, ordered by date. The
-- EXCLUDE constraint below creates a GiST index that also leads with
-- listing_id, but GiST equality lookups are materially slower than a
-- btree's and this is the query on the public browse path.
create index if not exists rental_availability_listing_date_idx
  on public.rental_availability (listing_id, start_date);

-- ── 3) No overlapping rows of the same kind ─────────────────────────
--
-- The 0021 primitive, unchanged except for the extra equality column.
-- 0021 scopes by asset and overlap; this scopes by listing, KIND, and
-- overlap:
--
--   two blackouts on one car may not overlap   → rejected, 23P01
--   two open overrides on one car may not      → rejected, 23P01
--   a blackout and an open override may        → allowed, that IS the
--                                                override (precedence c)
--
-- Scoping by kind is the whole design. Without it the override is
-- unrepresentable; with it, "which of the two overlapping rows wins" is
-- never a question the data can pose, because two rows that could
-- disagree cannot both exist.
--
-- Adjacency is not overlap: daterange(a, b, '[]') canonicalises to
-- [a, b+1), so a blackout ending the 3rd and one starting the 4th sit
-- flush and both insert. That is correct — an operator splitting a
-- month into two entries has not made an error.
--
-- btree_gist is already enabled (0021); asserted again so this file
-- stands alone against a fresh database. The DO block is 0021's, and it
-- is what lets this migration repair an environment that applied an
-- earlier draft — `create table if not exists` above would otherwise
-- skip the constraint entirely.

create extension if not exists btree_gist;

do $$
begin
  alter table public.rental_availability
    add constraint rental_availability_no_overlap
    exclude using gist (
      listing_id with =,
      kind with =,
      daterange(start_date, end_date, '[]') with &&
    );
exception when duplicate_object then
  null;
end $$;

-- ── 4) Update guard ─────────────────────────────────────────────────
--
-- Guardrail 3.8: enforce state at the database, not just the route.
-- Same shape as rental_listings_enforce_update (0044) — the updated_at
-- bump and the immutability rule in one trigger.
--
-- listing_id is immutable for the reason 0044 pins partner_id: the
-- operator's FOR ALL policy checks the OLD row on USING and the NEW row
-- on WITH CHECK, so an operator who owns two cars can satisfy both
-- while moving a range between them. Doing so frees days on one car and
-- blocks them on another in a single statement that reads, in any audit
-- log, as an edit. Delete and re-create instead, where both halves are
-- visible.
--
-- kind is deliberately NOT frozen: turning a blackout into an override
-- is a real correction, and if the flip collides with an existing row
-- of the target kind the EXCLUDE above rejects it. There is no state
-- machine to protect here — unlike rental_payments (0041) or the
-- booking status in 0047, nothing on this table records money that
-- moved.

create or replace function public.rental_availability_enforce_update()
returns trigger as $$
begin
  new.updated_at := now();

  if new.listing_id is distinct from old.listing_id then
    raise exception 'rental_availability: listing_id is immutable (delete and re-create on the other listing)';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists rental_availability_update_guard on public.rental_availability;
create trigger rental_availability_update_guard
  before update on public.rental_availability
  for each row execute function public.rental_availability_enforce_update();

-- ── 5) RLS ──────────────────────────────────────────────────────────
--
-- The three-policy shape 0044 uses on rental_listing_photos: public
-- read through the parent, operator write scoped by is_partner_staff(),
-- admin everything.

alter table public.rental_availability enable row level security;

-- Visibility is inherited, not restated. The subquery is itself subject
-- to rental_listings' RLS, so this returns rows exactly when
-- rental_listings_select_public would return the parent: 'active' cars
-- to anyone including anon, plus every status to the owning operator.
-- A draft listing's calendar therefore stays private while it is being
-- written, and re-stating `status = 'active'` here would only create a
-- second copy of that rule to drift from.
drop policy if exists rental_availability_select_public on public.rental_availability;
create policy rental_availability_select_public
  on public.rental_availability
  for select
  using (
    exists (
      select 1 from public.rental_listings l
      where l.id = rental_availability.listing_id
    )
  );

-- Operators manage their own cars' calendars. WITH CHECK is spelled out
-- in full for the reason 0044 records: on a FOR ALL policy USING gates
-- SELECT/UPDATE/DELETE and WITH CHECK gates INSERT/UPDATE, and omitting
-- it would let an operator black out somebody else's car — a denial of
-- service against a competitor's inventory.
drop policy if exists rental_availability_manage_operator on public.rental_availability;
create policy rental_availability_manage_operator
  on public.rental_availability
  for all
  to authenticated
  using (
    exists (
      select 1 from public.rental_listings l
      where l.id = rental_availability.listing_id
        and public.is_partner_staff(l.partner_id)
    )
  )
  with check (
    exists (
      select 1 from public.rental_listings l
      where l.id = rental_availability.listing_id
        and public.is_partner_staff(l.partner_id)
    )
  );

drop policy if exists rental_availability_admin_all on public.rental_availability;
create policy rental_availability_admin_all
  on public.rental_availability
  for all
  using ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' )
  with check ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' );

-- ── 6) Comments ─────────────────────────────────────────────────────

comment on table public.rental_availability is
  'Per-car calendar overrides. A listing with no rows is fully open inside its operating window; kind=blackout subtracts days, kind=open adds them back. Public SELECT through the parent listing (renters browse pre-auth); writes scoped to approved staff of the owning partner. Confirmed bookings live in rental_bookings, not here.';

comment on column public.rental_availability.kind is
  'blackout subtracts days from the operating window; open re-adds them and wins where the two overlap. Same-kind rows on one listing may not overlap (rental_availability_no_overlap).';

comment on column public.rental_availability.start_date is
  'First blocked/opened day, INCLUSIVE — matching the [] bound in rental_availability_no_overlap and in bookings (0021).';

comment on column public.rental_availability.end_date is
  'Last blocked/opened day, INCLUSIVE. A range occupies (end - start + 1) calendar days and bills (end - start) nights; see src/lib/rental-availability.ts.';

comment on column public.rental_availability.reason is
  'Coarse operator note. A checked vocabulary rather than free text because SELECT on this table is public — anything stored here is renter-visible.';

comment on column public.rental_listings.available_from is
  'First day the operator will rent this car at all. Null means "from today" — the calendar is default-open.';

comment on column public.rental_listings.available_until is
  'Last day the operator will rent this car. Null means "to the end of the booking horizon".';

comment on column public.rental_listings.booking_horizon_days is
  'How far ahead of today a renter may reach. Bounds the default-open calendar; an availability row of kind=open cannot extend past it.';
