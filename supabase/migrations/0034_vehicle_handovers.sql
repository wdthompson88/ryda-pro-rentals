-- Vehicle handovers — checkin (start of booking) + return (end of
-- booking) condition records.
--
-- Why now (per /how-it-works concierge section + the audit's
-- "before launch" list): the existing /bookings/[id]/checkin and
-- /return pages are 22-line stubs. When a member arrives to pick
-- up a Ferrari, the concierge needs:
--   - Pre-drive condition log (paint, wheels, interior, fluids,
--     fuel level, odometer)
--   - Photo capture
--   - Member signs off acknowledging baseline
-- And on return, the same with a delta.
--
-- DESIGN
-- One row per handover (NOT one row per booking with checkin+return
-- columns). Why: cleaner audit trail, supports edge cases (handover
-- twice if first is incomplete, partial returns, etc.), and the
-- two flows have different fields they need.
--
-- Photos are stored in Supabase Storage (private bucket
-- 'vehicle-handovers') and referenced here by an array of paths.
-- The actual upload happens in the API route; this table just
-- records the paths.
--
-- The condition log is a JSONB column rather than a flat schema
-- because the fields are stable but additive (we'll add e.g.
-- "tire pressure" later and don't want a migration per check).
-- Caller validates the JSON shape against a TS type.
--
-- RLS: members can read handovers for their own bookings (via the
-- bookings.user_id chain). Admin/ops via service role.

create table if not exists public.vehicle_handovers (
  id                uuid primary key default gen_random_uuid(),

  booking_id        uuid not null references public.bookings(id) on delete cascade,

  -- Type discriminator. 'checkin' fires when ops hands the car to
  -- the member; 'return' when the member hands it back.
  type              text not null check (type in ('checkin', 'return')),

  -- Operational data captured at handover.
  odometer_miles    integer not null check (odometer_miles >= 0),
  fuel_level_pct    smallint not null check (fuel_level_pct >= 0 and fuel_level_pct <= 100),

  -- Free-text condition notes from the concierge (paint
  -- observations, mechanical sounds, anything off the JSONB
  -- structured fields).
  condition_notes   text,

  -- Structured condition data — exterior_state, interior_state,
  -- tire_state, fluid_state, glass_state, etc. Each enum-like
  -- value: 'good' | 'minor_issue' | 'damage' | 'unchecked'.
  -- Populated client-side from the condition checklist UI; shape
  -- evolves without schema migrations.
  condition_data    jsonb not null default '{}'::jsonb,

  -- Photos uploaded to the 'vehicle-handovers' bucket. Array of
  -- bucket-relative paths so the renderer can build signed URLs
  -- on demand. Empty array OK if photos aren't required.
  photo_paths       text[] not null default array[]::text[],

  -- Both parties sign off. Member signature is the timestamp at
  -- which the member typed/clicked their acknowledgement; ops
  -- signature is the same for the concierge / RYDA rep.
  member_signed_at  timestamptz,
  member_signed_name text,
  ops_signed_at     timestamptz,
  ops_signed_name   text,

  -- Audit
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now()
);

create index if not exists vehicle_handovers_booking_idx
  on public.vehicle_handovers (booking_id);

create index if not exists vehicle_handovers_type_idx
  on public.vehicle_handovers (booking_id, type);

-- Storage bucket. The Supabase migration system runs SQL only —
-- the bucket itself is created via the dashboard or a separate
-- script. We document it here for the next reader rather than
-- assume it's been done. Create with:
--   insert into storage.buckets (id, name, public)
--   values ('vehicle-handovers', 'vehicle-handovers', false);
-- Then storage.objects RLS policies allow:
--   - members to read photos linked to their own handovers
--   - service-role bypasses RLS for upload via the API route

alter table public.vehicle_handovers enable row level security;

-- Members can read handovers for bookings they own. Co-owners on
-- the same LLC don't read each other's handover details
-- (privacy: who scratched what isn't broadcast).
drop policy if exists "members read own handovers" on public.vehicle_handovers;
create policy "members read own handovers"
  on public.vehicle_handovers
  for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = vehicle_handovers.booking_id
        and b.user_id = auth.uid()
    )
  );

-- Writes go through API only (service-role bypasses RLS).
revoke insert, update, delete on public.vehicle_handovers from authenticated;

comment on table public.vehicle_handovers is
  'Checkin (start of booking) + return (end of booking) condition records. One row per handover, joined to bookings.id.';
