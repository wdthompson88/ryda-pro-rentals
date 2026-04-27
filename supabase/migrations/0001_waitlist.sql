-- Waitlist signups from the homepage form.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  market      text not null check (market in ('Miami','LA','NY','Other')),
  created_at  timestamptz not null default now()
);

-- Lock the table down. The anon key from the browser must NOT be able to
-- read or update existing rows — only insert new ones via the API route.
alter table public.waitlist enable row level security;

-- Allow public inserts (the API route uses the anon key from the browser).
create policy "anon can insert waitlist signups"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- No select / update / delete policies → those operations are blocked for anon.
-- Reads happen in the Supabase dashboard using the service role.
