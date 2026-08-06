-- 0038: allow 'Rental' in contact_messages.inquiry_type
-- The contact API (src/app/api/contact/route.ts) has accepted "Rental" since the
-- /rent pages shipped, but 0003's check constraint never included it, so every
-- rental inquiry fails the insert and the customer sees "Could not save."
-- Additive only. Verify the auto-generated constraint name before applying:
--   select conname from pg_constraint
--   where conrelid = 'public.contact_messages'::regclass and contype = 'c';

alter table public.contact_messages
  drop constraint contact_messages_inquiry_type_check;

alter table public.contact_messages
  add constraint contact_messages_inquiry_type_check
  check (inquiry_type in ('Membership','Rental','Press','Partnership','Investor','Other'));
