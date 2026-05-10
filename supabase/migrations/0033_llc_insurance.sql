-- Insurance + storage facility metadata on the llc_entities table.
--
-- Why now: every LLC's named members need an insurance certificate
-- showing them as named insured, downloadable from /account/documents.
-- Today the certificate generator can't generate anything because
-- the policy data has nowhere to live. This migration adds the
-- fields, with sensible NULL defaults so existing rows aren't
-- forced to re-populate (the data appears only once binding is
-- complete; pre-binding the certificate renders with explicit
-- "binding pending" placeholders).
--
-- Insurance is bound by an A-rated US carrier with the LLC named
-- as primary insured per /member-protection. Acceptable carriers
-- per existing policy: Hagerty / CHUBB / Travelers Marine.
-- All columns NULLABLE because:
--   - draft / submitted / filed LLCs don't have insurance yet
--   - "completed" LLCs have it; we set the columns at that point
--   - admin-uploaded certs (rare cases) backfill via /admin/llc/[id]
--
-- RLS: no change to llc_entities policies. Members read insurance
-- data via the API route (which checks share_holdings membership)
-- not via direct table access.

alter table public.llc_entities
  add column if not exists insurance_carrier text
    check (insurance_carrier in ('Hagerty', 'CHUBB', 'Travelers', 'Other')
      or insurance_carrier is null),
  add column if not exists insurance_policy_number text,
  add column if not exists insurance_agreed_value_cents bigint
    check (insurance_agreed_value_cents is null or insurance_agreed_value_cents > 0),
  add column if not exists insurance_deductible_cents bigint
    check (insurance_deductible_cents is null or insurance_deductible_cents >= 0),
  add column if not exists insurance_effective_date date,
  add column if not exists insurance_expiration_date date,
  add column if not exists insurance_broker text,
  add column if not exists storage_facility_name text,
  add column if not exists storage_facility_address text;

-- Sanity constraint: if effective and expiration are both set,
-- expiration must be after effective. Simple guardrail against
-- typos when ops backfills via admin UI.
alter table public.llc_entities
  drop constraint if exists llc_insurance_date_order;
alter table public.llc_entities
  add constraint llc_insurance_date_order check (
    insurance_effective_date is null
    or insurance_expiration_date is null
    or insurance_expiration_date > insurance_effective_date
  );

comment on column public.llc_entities.insurance_carrier is
  'A-rated US carrier per /member-protection. NULL until binding completes.';
comment on column public.llc_entities.insurance_agreed_value_cents is
  'Stored as cents per money-column convention. 340000 USD = 34000000000 cents (Ferrari 296 example).';
