-- LLC amendments — generated when share_purchases.status flips to
-- 'paid'. One row per generated PDF (welcome packet, member-register
-- amendment, etc.). The PDF is rendered server-side and emailed to
-- the buyer; we keep the row for audit + the team's records.
--
-- Run once in Supabase SQL editor.

create table if not exists public.llc_amendments (
  id              uuid primary key default gen_random_uuid(),
  purchase_id     uuid not null references public.share_purchases(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  -- Document type lets us extend (welcome_packet, member_register,
  -- amendment, etc.) without re-migrating.
  document_type   text not null check (document_type in (
    'welcome_packet',
    'member_register_amendment',
    'operating_agreement_signed'
  )),
  -- Whether the doc was emailed successfully (Resend pipeline).
  emailed         boolean not null default false,
  email_attempted_at timestamptz,
  -- Snapshot fields so a row tells the whole story without joining
  -- back to share_purchases (which could mutate).
  vehicle_symbol  text,
  boat_slug       text,
  shares          integer not null,
  member_name     text not null,
  member_email    text not null,
  -- Optional storage path — if/when we wire Supabase Storage for
  -- archival, this points at the rendered PDF. Until then it's null
  -- and the PDF only lives in the buyer's email + the Resend logs.
  storage_path    text,
  created_at      timestamptz not null default now()
);

create index if not exists llc_amendments_purchase_idx on public.llc_amendments (purchase_id);
create index if not exists llc_amendments_user_idx on public.llc_amendments (user_id);

alter table public.llc_amendments enable row level security;

create policy "users can read own amendments"
  on public.llc_amendments
  for select
  to authenticated
  using (user_id = auth.uid());
