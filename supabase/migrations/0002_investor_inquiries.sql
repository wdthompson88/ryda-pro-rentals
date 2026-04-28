-- Investor inquiries from the /investors page form.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists public.investor_inquiries (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text not null,
  firm        text,
  check_size  text check (check_size in ('$25K–$50K','$50K–$250K','$250K–$1M','$1M+')),
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists investor_inquiries_email_idx on public.investor_inquiries (email);
create index if not exists investor_inquiries_created_at_idx on public.investor_inquiries (created_at desc);

alter table public.investor_inquiries enable row level security;

create policy "anon can insert investor inquiries"
  on public.investor_inquiries
  for insert
  to anon
  with check (true);

-- No select / update / delete policies → anon cannot read existing rows.
