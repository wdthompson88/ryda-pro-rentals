-- Contact form submissions from /contact (and any future contact surface).
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists public.contact_messages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  phone         text,
  inquiry_type  text not null check (inquiry_type in ('Membership','Press','Partnership','Investor','Other')),
  market        text not null check (market in ('Miami','Los Angeles','New York','Not sure')),
  message       text not null,
  created_at    timestamptz not null default now()
);

create index if not exists contact_messages_email_idx on public.contact_messages (email);
create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_inquiry_type_idx on public.contact_messages (inquiry_type);

alter table public.contact_messages enable row level security;

create policy "anon can insert contact messages"
  on public.contact_messages
  for insert
  to anon
  with check (true);

-- No select / update / delete policies → anon cannot read existing rows.
