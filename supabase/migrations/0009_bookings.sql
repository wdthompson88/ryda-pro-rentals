-- Bookings — the "smart calendar" backbone. Every reservation a member
-- makes against an LLC's calendar lands here. Conflict detection runs
-- in the API route (overlap-on-the-same-asset query before insert).
--
-- Run once in Supabase SQL editor.

create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  vehicle_symbol  text,
  boat_slug       text,
  -- Booking mode mirrors the BOOKING_POLICY in /lib/market-data:
  --   short-notice = within 7 days of start, low-friction
  --   planned      = >7 days advance, fair-use rules apply
  mode            text not null check (mode in ('short-notice', 'planned')),
  -- Date range. start_date and end_date are inclusive; days = the
  -- count actually billed against the share's annual entitlement.
  start_date      date not null,
  end_date        date not null,
  days            integer not null check (days >= 1 and days <= 30),
  -- 'standard' = public-road drive, 'event' = special event (wedding,
  -- gala, photo shoot — adds a $250 surcharge). Track-day was retired.
  type            text not null default 'standard' check (type in ('standard', 'event')),
  -- 'delivery' = white-glove drop-off, 'pickup' = self-collect at
  -- partner facility.
  handover        text not null default 'delivery' check (handover in ('delivery', 'pickup')),
  -- Free-form member notes shown to the proposal coordinator.
  notes           text,
  status          text not null default 'pending' check (
    status in ('pending', 'confirmed', 'in-progress', 'completed', 'canceled')
  ),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint asset_xor check (
    (vehicle_symbol is not null and boat_slug is null)
    or (vehicle_symbol is null and boat_slug is not null)
  ),
  constraint date_order check (start_date <= end_date)
);

create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_vehicle_idx on public.bookings (vehicle_symbol)
  where vehicle_symbol is not null;
create index if not exists bookings_boat_idx on public.bookings (boat_slug)
  where boat_slug is not null;
-- Conflict detection: overlapping date ranges on the same asset.
-- The API runs this query before insert; the index makes it cheap.
create index if not exists bookings_asset_dates_idx on public.bookings
  (coalesce(vehicle_symbol, boat_slug), start_date, end_date)
  where status in ('pending', 'confirmed', 'in-progress');
create index if not exists bookings_status_idx on public.bookings (status);

alter table public.bookings enable row level security;

-- Members can read bookings on assets they have shares in. Doing
-- the membership check via subquery against share_holdings keeps
-- the policy declarative.
create policy "users can read bookings on assets they hold"
  on public.bookings
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.share_holdings h
      where h.user_id = auth.uid()
      and h.transferred_at is null
      and (
        (bookings.vehicle_symbol is not null and h.vehicle_symbol = bookings.vehicle_symbol)
        or (bookings.boat_slug is not null and h.boat_slug = bookings.boat_slug)
      )
    )
  );

-- Member can cancel their own pending/confirmed bookings.
create policy "users can cancel own bookings"
  on public.bookings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'canceled');

-- Inserts go through the API only (service-role key bypasses RLS).
