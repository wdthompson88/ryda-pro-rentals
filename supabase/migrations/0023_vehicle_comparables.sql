-- Hand-curated comparable sales for the vehicle listings.
--
-- The valuation moat: no API can credibly answer "what's a 2024
-- Ferrari 296 GTB worth right now?" KBB caps near $200K, Marketcheck's
-- dealer-listing comps are statistically noisy at exotic price points,
-- and the providers that DO have good data (classic.com, BaT, Hagerty)
-- don't expose public APIs.
--
-- Solution: hand-curate 3-5 named comparable sales per listing,
-- refresh quarterly. Display them on the listing page with full
-- attribution (auction house + lot # + sale date + source URL).
-- Curatable by an admin or a contracted specialist; ~5 hrs per
-- quarter at 30 listings.
--
-- The display block on /markets/[symbol] reads from this table
-- server-side and renders alongside the existing asset-anatomy
-- sections (provenance timeline, originality grid, press quote).
-- Nothing renders if there are no rows for a vehicle — graceful
-- degradation, same pattern as the optional Vehicle.* fields.

create table if not exists public.vehicle_comparables (
  id uuid primary key default gen_random_uuid(),

  -- Vehicle this comp is illustrative for. Matches VEHICLES[].symbol
  -- in market-data.ts. Not a FK because vehicle data lives in code,
  -- not the DB — but the join column makes it cheap to look up.
  vehicle_symbol text not null,

  -- The actual sale
  sale_date date not null,
  year_make_model text not null,           -- "2024 Ferrari 296 GTB"
  trim_notes text,                          -- "Assetto Fiorano, 9,200 mi"
  sale_price_cents bigint not null check (sale_price_cents > 0),

  -- Provenance — these three power the credibility of the display
  source_name text not null,                -- "RM Sotheby's", "Bring a Trailer"
  source_url text not null,                 -- direct link
  lot_number text,                          -- "Lot 174", "BaT #128456"

  notes text,                               -- optional curator commentary

  -- Audit
  curated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicle_comparables_vehicle_idx
  on public.vehicle_comparables (vehicle_symbol, sale_date desc);

create index if not exists vehicle_comparables_sale_date_idx
  on public.vehicle_comparables (sale_date desc);

-- updated_at maintenance
create or replace function public.touch_vehicle_comparables_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_vehicle_comparables_updated_at
  on public.vehicle_comparables;
create trigger trg_vehicle_comparables_updated_at
  before update on public.vehicle_comparables
  for each row execute function public.touch_vehicle_comparables_updated_at();

-- RLS: anyone can read (powers public listing pages),
-- only admins can write.
alter table public.vehicle_comparables enable row level security;

drop policy if exists vehicle_comparables_public_read on public.vehicle_comparables;
create policy vehicle_comparables_public_read on public.vehicle_comparables
  for select
  using (true);

drop policy if exists vehicle_comparables_admin_write on public.vehicle_comparables;
create policy vehicle_comparables_admin_write on public.vehicle_comparables
  for all
  using (
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) = 'admin'
  )
  with check (
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

comment on table public.vehicle_comparables is
  'Hand-curated comparable sales for each vehicle. Display block on /markets/[symbol] cites these with source attribution. Curated quarterly from classic.com, Bring a Trailer, RM Sotheby''s, Mecum, etc.';
