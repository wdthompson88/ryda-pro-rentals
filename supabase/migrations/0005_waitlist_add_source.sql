-- Add `source` column to public.waitlist for lead attribution.
-- The signup flow tags each row with where the lead came from
-- (e.g. "signup:rent", "signup:buy", "signup:checkout", or "signup")
-- so we can compare conversion across CTAs.
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

alter table public.waitlist
  add column if not exists source text;

create index if not exists waitlist_source_idx
  on public.waitlist (source);
