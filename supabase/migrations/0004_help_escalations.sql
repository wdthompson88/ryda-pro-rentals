-- Captures requests to "talk to a human" from the help chat widget.
-- Run this once in the Supabase SQL editor.

create table if not exists public.help_escalations (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  note            text,
  trigger_message text,
  conversation    jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists help_escalations_email_idx on public.help_escalations (email);
create index if not exists help_escalations_created_at_idx on public.help_escalations (created_at desc);

alter table public.help_escalations enable row level security;

create policy "anon can insert help escalations"
  on public.help_escalations
  for insert
  to anon
  with check (true);

-- No select / update / delete policies — anon cannot read existing rows.
