-- First-class Open Generative AI / MuAPI creative-generation metadata.
--
-- content_queue remains the publishing source of truth. These columns
-- let RYDA track the upstream creative job separately from publish
-- status so generated media can be reviewed, regenerated, and audited
-- before a row is approved/scheduled.

alter table public.content_queue
  add column if not exists generation_vendor text,
  add column if not exists generation_type text check (
    generation_type is null or generation_type in (
      'image',
      'image-to-image',
      'video',
      'image-to-video',
      'lip-sync',
      'workflow'
    )
  ),
  add column if not exists generation_model text,
  add column if not exists generation_request_id text,
  add column if not exists generation_status text check (
    generation_status is null or generation_status in (
      'queued',
      'submitted',
      'polling',
      'completed',
      'failed'
    )
  ),
  add column if not exists generation_output_url text,
  add column if not exists generation_error text,
  add column if not exists generated_asset_path text,
  add column if not exists generation_metadata jsonb default '{}'::jsonb;

create index if not exists content_queue_generation_status_idx
  on public.content_queue (generation_status, updated_at desc)
  where generation_status is not null;

create index if not exists content_queue_generation_vendor_idx
  on public.content_queue (generation_vendor, updated_at desc)
  where generation_vendor is not null;
