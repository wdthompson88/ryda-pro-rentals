-- 0053: rental_handovers — the pickup and the return, and the two
-- transitions that close a booking's life.
-- (RYDA_RENTAL_BUILD_LOOP.md phase 4C. Claims 0053; 0052 is partner
-- payout readiness.)
--
-- WHY A NEW TABLE RATHER THAN REPOINTING vehicle_handovers.
--
-- 0034 built exactly this for co-ownership, and the build loop's 4C
-- describes it as a rewire: change the FK from public.bookings to
-- rental_bookings and re-scope the RLS. That is no longer the smaller
-- change. The co-ownership strip removed the handover ROUTE and the
-- handover COMPONENT from the tree; only the migration survived, because
-- applied migrations are never deleted. So there is no working flow left
-- to preserve — repointing would migrate a table whose only consumers
-- are gone.
--
-- And guardrail 6 is explicit: never reuse co-ownership tables for
-- rentals. vehicle_handovers.booking_id references public.bookings, which
-- is share-entitlement scoped; its RLS reads through bookings.user_id.
-- Repointing that FK would silently change what every existing policy on
-- it means. 0046 and 0047 both took the new-table road for this reason,
-- and this follows them. vehicle_handovers is left exactly as it is.
--
-- ── WHAT A HANDOVER IS FOR ──────────────────────────────────────────
--
-- Two records per booking, and each one is the evidence behind a state
-- change that money depends on:
--
--   checkin  the operator hands over the keys. Booking → in_progress.
--            The odometer and fuel readings here are the BASELINE that a
--            mileage overage or a fuel charge is measured against, and
--            the photos are what an operator points at if the car comes
--            back damaged.
--   return   the car comes back. Booking → completed, which is what makes
--            the operator's payout payable (D4, decidePayout's first
--            check) and what releases the deposit hold (D5, 3C).
--
-- So a handover is not a form; it is the thing that turns a rental into
-- money moving. That is why the status change is a TRIGGER here rather
-- than a second statement in a route: a handover row that exists while
-- the booking never advanced would leave an operator unpayable with
-- physical evidence that the trip happened, and no route retry can be
-- trusted to have run.

create table if not exists public.rental_handovers (
  id                uuid primary key default gen_random_uuid(),

  -- `restrict`, matching rental_bookings' own posture on listings: a
  -- handover is the record of a physical event and carries the readings
  -- a later dispute is argued from. Deleting the booking out from under
  -- it should fail loudly.
  booking_id        uuid not null
                      references public.rental_bookings(id) on delete restrict,

  type              text not null check (type in ('checkin', 'return')),

  -- Readings. Required on both types, because their value is entirely in
  -- the COMPARISON — a return with no odometer cannot substantiate a
  -- mileage charge, and a checkin with no odometer makes every later
  -- return unarguable.
  odometer_miles    integer not null check (odometer_miles >= 0),
  fuel_level_pct    smallint not null
                      check (fuel_level_pct >= 0 and fuel_level_pct <= 100),

  condition_notes   text check (condition_notes is null or length(condition_notes) <= 4000),

  -- Storage paths, not URLs. Same posture as rental_listing_photos
  -- (0044): the bucket and its access rules decide who can see a photo,
  -- and a stored URL would outlive whatever signed it.
  photo_paths       text[] not null default array[]::text[],

  -- BOTH PARTIES SIGN, and neither is required at insert. A handover
  -- happens at a kerb, on a phone, and demanding two signatures before
  -- the row exists means the row does not get written — the readings and
  -- the photos, which are the parts that cannot be reconstructed later,
  -- are lost to a signature flow. They are recorded and can be signed
  -- after; the trigger below does not wait for them.
  renter_signed_at    timestamptz,
  renter_signed_name  text,
  operator_signed_at  timestamptz,
  operator_signed_name text,

  -- Who submitted it. Nullable on account deletion rather than cascading:
  -- the handover is evidence about a CAR, and it stays true when the
  -- person who typed it closes their account.
  recorded_by_user_id uuid references auth.users(id) on delete set null,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ONE CHECKIN AND ONE RETURN PER BOOKING. The state machine makes a
-- second one meaningless — the transition it would drive is already
-- spent, and 0047's trigger would reject it — but rejecting it HERE
-- gives a duplicate submit a 23505 instead of a P0001 raised from two
-- tables away, and stops a retry writing a second set of readings that
-- silently disagrees with the first.
create unique index if not exists rental_handovers_one_per_type
  on public.rental_handovers (booking_id, type);

create index if not exists rental_handovers_booking_idx
  on public.rental_handovers (booking_id, created_at);

-- ── The transition ──────────────────────────────────────────────────
--
-- Guardrail 3.8: enforce state at the database. A handover INSERT drives
-- the booking's status, in the same transaction, so the two cannot
-- diverge. If 0047's own status trigger refuses the move — the booking
-- was cancelled, the return is arriving on a booking that never started —
-- that exception aborts the INSERT too, and no handover row is left
-- claiming an event the booking does not agree happened.
--
-- Deliberately NOT a route's second statement. A route that inserts the
-- handover and then updates the booking has a window between them, and
-- the failure mode is the expensive direction: evidence exists, booking
-- never advanced, operator unpayable (decidePayout's first check is
-- exactly `status !== 'completed'`).
--
-- The ORDERING RULE lives here too. A return may only follow a checkin,
-- and the status machine nearly enforces it — in_progress is reachable
-- only through checkin — but "nearly" is doing real work: an operator
-- recording a return on a still-`confirmed` booking would otherwise get
-- 0047's generic illegal-transition message, which names no cause. This
-- says what is actually wrong.

create or replace function public.rental_handovers_advance_booking()
returns trigger as $$
declare
  current_status text;
begin
  select status into current_status
  from public.rental_bookings
  where id = new.booking_id
  for update;

  if current_status is null then
    raise exception 'rental_handovers: booking % not found', new.booking_id;
  end if;

  if new.type = 'checkin' then
    if current_status <> 'confirmed' then
      raise exception
        'rental_handovers: cannot check in a booking that is %, expected confirmed',
        current_status;
    end if;
    update public.rental_bookings
      set status = 'in_progress'
      where id = new.booking_id;

  elsif new.type = 'return' then
    if current_status <> 'in_progress' then
      raise exception
        'rental_handovers: cannot record a return on a booking that is %, expected in_progress (check in first)',
        current_status;
    end if;
    update public.rental_bookings
      set status = 'completed'
      where id = new.booking_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists rental_handovers_advance on public.rental_handovers;
create trigger rental_handovers_advance
  after insert on public.rental_handovers
  for each row execute function public.rental_handovers_advance_booking();

-- Readings are write-once; signatures are not.
--
-- The split is the point. An odometer that can be edited after the fact
-- is not evidence — the whole value of the checkin reading is that it was
-- taken before the trip and could not be revised once the mileage was
-- known. Signatures move in one direction only (unsigned → signed),
-- because a handover signed and then un-signed is a record of a dispute,
-- not a correction.
create or replace function public.rental_handovers_enforce_update()
returns trigger as $$
begin
  new.updated_at := now();

  if new.booking_id is distinct from old.booking_id
     or new.type is distinct from old.type
     or new.odometer_miles is distinct from old.odometer_miles
     or new.fuel_level_pct is distinct from old.fuel_level_pct then
    raise exception 'rental_handovers: readings are write-once';
  end if;

  if old.renter_signed_at is not null
     and new.renter_signed_at is distinct from old.renter_signed_at then
    raise exception 'rental_handovers: a signature cannot be withdrawn';
  end if;
  if old.operator_signed_at is not null
     and new.operator_signed_at is distinct from old.operator_signed_at then
    raise exception 'rental_handovers: a signature cannot be withdrawn';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists rental_handovers_update_guard on public.rental_handovers;
create trigger rental_handovers_update_guard
  before update on public.rental_handovers
  for each row execute function public.rental_handovers_enforce_update();

-- ── RLS ─────────────────────────────────────────────────────────────
--
-- The two parties to the booking and nobody else. NOT public, unlike
-- rental_availability: a handover carries odometer readings, condition
-- notes and photographs of a specific car on a specific date, and the
-- renter who was driving it is identifiable from the booking it hangs
-- off. Writes go through the service-role route, which enforces the same
-- rule in code (guardrail 3.7); these policies are the backstop.

alter table public.rental_handovers enable row level security;

drop policy if exists rental_handovers_select_renter on public.rental_handovers;
create policy rental_handovers_select_renter
  on public.rental_handovers
  for select
  to authenticated
  using (
    exists (
      select 1 from public.rental_bookings b
      where b.id = rental_handovers.booking_id
        and b.renter_user_id = auth.uid()
    )
  );

drop policy if exists rental_handovers_select_operator on public.rental_handovers;
create policy rental_handovers_select_operator
  on public.rental_handovers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rental_bookings b
      join public.rental_listings l on l.id = b.listing_id
      where b.id = rental_handovers.booking_id
        and public.is_partner_staff(l.partner_id)
    )
  );

drop policy if exists rental_handovers_admin_all on public.rental_handovers;
create policy rental_handovers_admin_all
  on public.rental_handovers
  for all
  using ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' )
  with check ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' );

-- ── Comments ────────────────────────────────────────────────────────

comment on table public.rental_handovers is
  'Pickup and return records for a rental booking. Each row drives a status transition via rental_handovers_advance: checkin -> in_progress, return -> completed. New table rather than a repoint of vehicle_handovers (0034), which is co-ownership scoped — guardrail 6.';

comment on column public.rental_handovers.odometer_miles is
  'Write-once. The checkin reading is the baseline a mileage overage is measured against; a reading editable after the trip is not evidence.';

comment on column public.rental_handovers.renter_signed_at is
  'Nullable at insert and one-directional thereafter. A handover happens at a kerb — demanding signatures before the row exists loses the readings and photos, which are the parts that cannot be reconstructed later.';

comment on column public.rental_handovers.photo_paths is
  'Storage paths, not URLs — the bucket decides who may see a photo, and a stored URL would outlive whatever signed it.';
