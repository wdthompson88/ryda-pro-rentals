-- 0038: allow 'Rental' in contact_messages.inquiry_type
-- The contact API (src/app/api/contact/route.ts) has accepted "Rental" since the
-- /rent pages shipped, but 0003's check constraint never included it, so every
-- rental inquiry fails the insert and the customer sees "Could not save."
-- Additive only. Verify the auto-generated constraint name before applying:
--   select conname from pg_constraint
--   where conrelid = 'public.contact_messages'::regclass and contype = 'c';
--
-- NUMBER COLLISION: an earlier branch shipped a DIFFERENT
-- 0038_partner_accounts.sql (since renumbered to 0042), so a machine
-- that applied that one has version 0038 recorded and a version-keyed
-- apply will skip this file entirely.
-- 0043_contact_messages_rental_recheck.sql re-asserts the same
-- constraint idempotently under a fresh number so the fix lands either
-- way. Do not renumber this file — both meanings of 0038 have been
-- applied somewhere.

alter table public.contact_messages
  drop constraint if exists contact_messages_inquiry_type_check;

alter table public.contact_messages
  add constraint contact_messages_inquiry_type_check
  check (inquiry_type in ('Membership','Rental','Press','Partnership','Investor','Other'));
