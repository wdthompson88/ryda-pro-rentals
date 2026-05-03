-- Document signatures — one row per Dropbox-Sign signature request.
-- The DocumentsStep in the BuyFlow opens an embedded signing flow
-- and the webhook flips the row to 'signed' when the buyer finishes.
-- Each share purchase typically produces 2 rows (Operating Agreement
-- + Management Services Agreement); the join key is purchase_id.
--
-- Run once in Supabase SQL editor.

create table if not exists public.document_signatures (
  id                  uuid primary key default gen_random_uuid(),
  purchase_id         uuid not null references public.share_purchases(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  -- Which doc this row tracks. Two rows per purchase by default.
  document_type       text not null check (document_type in (
    'operating_agreement',
    'management_services_agreement',
    'subscription_agreement'
  )),
  -- Dropbox Sign correlation. signature_request_id comes back from
  -- create(); the webhook lookups happen by this column.
  hellosign_request_id text not null unique,
  -- The embed URL we hand to the iframe in DocumentsStep. Expires
  -- after a short window per Dropbox Sign's policy; the API route
  -- regenerates one per request.
  embed_url           text,
  status              text not null default 'pending' check (status in (
    'pending',
    'sent',
    'viewed',
    'signed',
    'declined',
    'canceled'
  )),
  signed_at           timestamptz,
  signed_pdf_url      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists docsig_purchase_idx on public.document_signatures (purchase_id);
create index if not exists docsig_user_idx on public.document_signatures (user_id);
create index if not exists docsig_status_idx on public.document_signatures (status);

alter table public.document_signatures enable row level security;

create policy "users can read own document signatures"
  on public.document_signatures
  for select
  to authenticated
  using (user_id = auth.uid());
