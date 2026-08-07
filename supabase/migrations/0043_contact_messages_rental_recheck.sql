-- 0043: re-assert contact_messages.inquiry_type allows 'Rental'.
--
-- WHY THIS EXISTS (it is deliberately a duplicate of 0038):
-- 0038_partner_accounts.sql shipped on feat/dt-partner-signup and was
-- renumbered to 0042 during branch reconciliation. On any machine that
-- applied it, version "0038" is recorded — but in the merged tree 0038
-- is a completely different file, 0038_contact_messages_allow_rental.sql.
-- A version-keyed apply (supabase db push, or an ops sheet keyed on the
-- number) sees 0038 as done and SKIPS the contact-messages fix, so
-- contact_messages_inquiry_type_check never gains 'Rental' and every
-- rental contact submission fails its insert with a check-constraint
-- violation and shows the customer "Could not save" — exactly the bug
-- 0038 was written to fix, silently reintroduced.
--
-- Renumbering either 0038 would be worse (both meanings have been
-- applied somewhere, and AGENTS.md forbids renumbering an applied
-- migration), so the fix is re-asserted here under a fresh number.
-- Fully idempotent: safe whether or not 0038_contact_messages_allow_rental
-- already ran.
--
-- Note the constraint is dropped by NAME. 0003 created it inline, so
-- Postgres auto-named it contact_messages_inquiry_type_check; the
-- `if exists` makes a differently-named or absent constraint a no-op
-- rather than an error. Verify before applying:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.contact_messages'::regclass and contype = 'c';

alter table public.contact_messages
  drop constraint if exists contact_messages_inquiry_type_check;

alter table public.contact_messages
  add constraint contact_messages_inquiry_type_check
  check (inquiry_type in ('Membership','Rental','Press','Partnership','Investor','Other'));
