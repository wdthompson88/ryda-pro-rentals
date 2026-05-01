-- Add `context` column to public.contact_messages for CTA-attribution.
-- Many marketing surfaces deep-link to /contact?type=Membership&note=...
-- with the asset/intent encoded in the note (e.g. "Charter request: Wajer 55 S",
-- "Concierge ownership inquiry", "Want LA boats access"). Without persistence
-- the team can't filter or prioritize; the lead reads as generic.
--
-- Run once in Supabase SQL editor.

alter table public.contact_messages
  add column if not exists context text;

create index if not exists contact_messages_context_idx
  on public.contact_messages (context);
