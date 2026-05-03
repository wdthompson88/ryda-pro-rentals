-- Share holdings — the durable record of who owns which LLC shares
-- right now. Populated by the share-purchase webhook on checkout
-- success and updated by member-to-member transfers (post-launch).
--
-- This is the "source of truth" for member-area pages — /my-cars,
-- /my-boats, /portfolio all derive their displays from this table.
-- share_purchases is the transactional log; share_holdings is the
-- current-state projection.
--
-- Run once in Supabase SQL editor.

create table if not exists public.share_holdings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  vehicle_symbol  text,
  boat_slug       text,
  shares          integer not null check (shares >= 1 and shares <= 10),
  -- The purchase that created this holding. Lets us reconstruct the
  -- chain of ownership for an LLC's shares.
  purchase_id     uuid references public.share_purchases(id) on delete set null,
  acquired_at     timestamptz not null default now(),
  -- Set when the share is transferred away. NULL = currently held.
  transferred_at  timestamptz,
  transferred_to_user_id uuid references auth.users(id) on delete set null,

  constraint asset_xor check (
    (vehicle_symbol is not null and boat_slug is null)
    or (vehicle_symbol is null and boat_slug is not null)
  )
);

create index if not exists share_holdings_user_idx on public.share_holdings (user_id);
create index if not exists share_holdings_vehicle_idx on public.share_holdings (vehicle_symbol)
  where vehicle_symbol is not null;
create index if not exists share_holdings_boat_idx on public.share_holdings (boat_slug)
  where boat_slug is not null;
create index if not exists share_holdings_active_idx on public.share_holdings (user_id, transferred_at)
  where transferred_at is null;

alter table public.share_holdings enable row level security;

create policy "users can read own holdings"
  on public.share_holdings
  for select
  to authenticated
  using (user_id = auth.uid());

-- Writes go through the API only (service-role key bypasses RLS).
