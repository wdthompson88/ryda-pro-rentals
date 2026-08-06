-- 0039: structured rental lead capture for the rentals-first funnel.
-- Dates, explicit marketing consent, vehicle/partner attribution, and a status
-- column so the future lead-pipeline admin (new → sent → booked → lost) needs
-- no schema change. RLS mirrors 0003: anon can insert, nobody anon can read.

create table if not exists public.rental_inquiries (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null,
  phone             text,
  vehicle_slug      text not null,
  vehicle_label     text not null,
  fleet             text not null check (fleet in ('ryda','partner')),
  partner_name      text,
  market            text not null default 'Miami',
  start_date        date not null,
  end_date          date not null,
  message           text,
  marketing_opt_in  boolean not null default false,
  status            text not null default 'new' check (status in ('new','sent','booked','lost')),
  -- Client-generated idempotency token (one per form mount) so a double
  -- tap / retry can't create duplicate leads. Nullable for fallback rows.
  client_token      text,
  created_at        timestamptz not null default now()
);

create unique index if not exists rental_inquiries_client_token_idx
  on public.rental_inquiries (client_token)
  where client_token is not null;

create index if not exists rental_inquiries_email_idx on public.rental_inquiries (email);
create index if not exists rental_inquiries_created_at_idx on public.rental_inquiries (created_at desc);
create index if not exists rental_inquiries_status_idx on public.rental_inquiries (status);

alter table public.rental_inquiries enable row level security;

create policy "anon can insert rental inquiries"
  on public.rental_inquiries
  for insert
  to anon
  with check (true);

-- No select / update / delete policies → anon cannot read existing rows.
