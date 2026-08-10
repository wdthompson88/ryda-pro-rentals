-- 0044: rental_listings + rental_listing_photos — the DB spine for the
-- daily-rental marketplace (RYDA_RENTAL_BUILD_LOOP.md, phase 0A).
--
-- Today the /rent grid is rendered from two hard-coded modules:
-- src/lib/market-data.ts (VEHICLES, the 6 co-ownership cars) and
-- src/lib/partner-fleet.ts (PARTNER_VEHICLES, 37 GM LUXE cars), merged
-- at module scope in src/components/rental-listings.tsx. Nothing in the
-- database knows a rentable car exists. This migration creates that
-- knowledge so operators can eventually manage their own fleet
-- (phase 2F) and so availability + bookings (phase 2A/2B) have a real
-- listing_id to hang off. It does NOT change any rendering — the static
-- grid keeps working untouched until a later PR wires the read path.
--
-- Ownership model. A listing belongs to a partner (public.partners,
-- 0041) — the company-keyed OPERATOR row that carries commission terms
-- and the Stripe Express account. It is keyed by partner_id, never by
-- the `name` string: guardrail 3.11 of the build loop calls the
-- existing name-string coupling (partner-fleet.ts, rental_inquiries
-- .partner_name) out as a bug to be migrated away from in 0D, and
-- there is no reason for a new table to inherit it.
--
-- A logged-in human reaches a partner through public.partner_accounts
-- (0042, PK = user_id, with an approval-bridge partner_id). So
-- "is this user allowed to touch this listing?" is a two-hop question,
-- answered once by public.is_partner_staff() below.
--
-- RLS posture (guardrail 3.7 — deliberately the OPPOSITE of the
-- co-ownership calendar, which is members-only):
--   rental_listings        public SELECT of 'active' rows — renters
--                          browse before they have an account at all.
--   rental_listing_photos  same, gated through the parent listing.
--   partners               untouched. Still zero-policy service-role
--                          only; commission_rate and acct_ ids must
--                          never reach a browser.
--
-- Nothing here touches co-ownership: public.bookings (0009/0021),
-- share_holdings, llc_*, and the boats tree are all left exactly as
-- they are. This is a new, parallel spine per guardrail 3.6.
--
-- Storage. Creates the `rental-car-photos` bucket in SQL. Note that
-- 0034_vehicle_handovers.sql claims a bucket "is created via the
-- dashboard or a separate script" — that comment is wrong; `insert
-- into storage.buckets` works fine in a migration, and a bucket that
-- exists only in one project's dashboard is a bucket the next
-- environment does not have. See the storage section for the one real
-- caveat (policy ownership on storage.objects).

-- ── 1) is_partner_staff — the two-hop membership oracle ─────────────
--
-- Security-definer because the body reads public.partner_accounts,
-- which is RLS-restricted (a user sees only their own row). Modelled
-- directly on public.is_llc_member (0035), including the lessons
-- recorded there:
--
--   * No p_user_id argument. The user id comes from auth.uid() inside
--     the function, so a caller can only ever introspect their OWN
--     membership — the function is not a "who works for whom" oracle.
--   * search_path is locked to '' and every reference is fully
--     schema-qualified, so a compromised role cannot shadow a table.
--
-- Only 'approved' accounts count. A 'pending' applicant has not been
-- vetted and a 'suspended' one has been switched off; neither may
-- write a listing. This is the same gate the /partner dashboard uses.
--
-- Unlike is_llc_member, execute is granted to anon as well as
-- authenticated. The public SELECT policy below references this
-- function, and that policy is evaluated for logged-out visitors
-- browsing /rent — without the anon grant every anonymous read would
-- fail with "permission denied for function" instead of returning the
-- active listings. For an anonymous caller auth.uid() is null, so the
-- exists() simply finds nothing and the function returns false.

create or replace function public.is_partner_staff(
  p_partner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_accounts pa
    where pa.user_id = auth.uid()
      and pa.partner_id = p_partner_id
      and pa.status = 'approved'
  );
$$;

revoke all on function public.is_partner_staff(uuid) from public;
grant execute on function public.is_partner_staff(uuid) to authenticated, anon;

-- ── 2) rental_listings ──────────────────────────────────────────────
--
-- One row per car an operator offers for daily rental. The column set
-- deliberately mirrors the shape src/components/rental-listings.tsx
-- already consumes (slug, make, model, year, category, dailyRate,
-- regularRate, market, hero) so a DB-backed read path can produce the
-- existing RentalListing objects without redesigning the card.
--
-- Money is in CENTS here, matching computeRentalFee in src/lib/fees.ts
-- (the rental side of that module is cents; only the co-ownership
-- computeFees works in dollars). The UI's `dailyRate` number is
-- dollars, so the mapper divides by 100 at the boundary — one place,
-- src/lib/rental-listings-db.ts.

create table if not exists public.rental_listings (
  id                  uuid primary key default gen_random_uuid(),

  -- The owning operator. `restrict` rather than `cascade`: deleting an
  -- operator that still has listings should fail loudly, not silently
  -- erase inventory that may carry booking history (same posture as
  -- rental_payments.inquiry_id in 0041).
  partner_id          uuid not null references public.partners(id) on delete restrict,

  -- Route key, e.g. 'lamborghini-huracan-evo'. Unique across the whole
  -- table because it is the /rent/[symbol] path segment — two cars
  -- cannot share a URL. Hand-authored kebab-case today, exactly like
  -- PartnerVehicle.slug.
  slug                text not null unique,

  -- The car's permanent identity. This is the "asset passport" idea:
  -- a VIN identifies a physical vehicle across listings and owners,
  -- where a listing is only the current offer to rent it.
  --
  -- Nullable on purpose — there is no operator UI to collect a VIN yet
  -- (that arrives with the fleet dashboard, 2F), and requiring it now
  -- would make the existing 37-car fleet unlistable. The partial
  -- unique index below is what makes it load-bearing once present.
  vin                 text
                        check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),

  make                text not null,
  model               text not null,
  year                smallint check (year is null or (year >= 1900 and year <= 2100)),

  -- Free text rather than a CHECK list. The TS union PartnerCategory
  -- ('Exotic' | 'Convertible' | 'SUV' | 'Sedan' | '7-Seater' | 'EV')
  -- validates it in app code, so the taxonomy can evolve without a
  -- migration — same reasoning as partner_accounts.fleet_size (0042).
  category            text not null,

  market              text not null default 'Miami',

  daily_rate_cents    integer not null check (daily_rate_cents > 0),
  -- Sticker price, when the operator is showing a discount. The card
  -- renders a "save N%" badge off the difference. Must not be below
  -- the price actually charged.
  regular_rate_cents  integer
                        check (regular_rate_cents is null
                               or regular_rate_cents >= daily_rate_cents),

  -- Per-car rental length, set by the operator (open default O1).
  -- Platform floor 1 night, ceiling 30 — the ceiling is what keeps a
  -- booking inside the Stripe card-authorization window that the
  -- security-deposit hold (D5) depends on.
  min_nights          smallint not null default 1
                        check (min_nights >= 1 and min_nights <= 30),
  max_nights          smallint not null default 30
                        check (max_nights >= 1 and max_nights <= 30),
  constraint rental_listings_nights_ordered
    check (max_nights >= min_nights),

  -- Mileage allowance, e.g. 100. Stored as a number so it can be
  -- compared and priced later; the grid currently hard-codes the
  -- string "100 mi/day".
  miles_included_per_day  smallint
                        check (miles_included_per_day is null
                               or miles_included_per_day > 0),

  -- draft    — being written, invisible to renters
  -- active   — live on /rent and bookable
  -- paused   — temporarily delisted, keeps its history and bookings
  -- archived — retired; terminal
  status              text not null default 'draft'
                        check (status in ('draft','active','paused','archived')),

  -- Explicit cover-photo override, as a bucket-relative path. When
  -- null the cover is the position-0 row in rental_listing_photos.
  -- This mirrors getPartnerHero() exactly: prefer the explicit hero,
  -- else fall back to the first photo.
  hero_photo_path     text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- The cover must live in the owning operator's own folder.
  --
  -- rental_listing_photos gets this same guarantee from its insert
  -- policy (see section 5), but hero_photo_path is a plain text column
  -- on a row the operator already controls: no upload happens, so the
  -- storage-side check never runs, and the policy's WITH CHECK only
  -- proves the LISTING is theirs. Without this an operator could point
  -- their cover at another operator's object — which renders fine
  -- until the other operator deletes the file and breaks a card nobody
  -- can explain.
  --
  -- A CHECK rather than a policy clause so it binds the service-role
  -- routes too. uuid → text renders lowercase, which is why
  -- rental_photo_path_is_own only accepts a lowercase folder: the two
  -- checks have to agree on one canonical form or an upload can
  -- succeed and its database row be rejected.
  constraint rental_listings_hero_own_folder
    check (hero_photo_path is null
           or hero_photo_path like partner_id::text || '/%')
);

create index if not exists rental_listings_partner_id_idx
  on public.rental_listings (partner_id);
create index if not exists rental_listings_status_idx
  on public.rental_listings (status);
-- The browse query: active rows in a market, newest first.
create index if not exists rental_listings_market_status_idx
  on public.rental_listings (market, status);

-- One live listing per physical car. Two operators both listing the
-- same VIN would produce two independent availability calendars for
-- one vehicle — a double-booking the EXCLUDE constraint in 2B cannot
-- catch, because it scopes per listing_id.
--
-- Scoped to non-archived rows so a car can legitimately be retired and
-- re-listed later (by the same operator or a new one) without tripping
-- the constraint. upper() so casing never creates a duplicate.
create unique index if not exists rental_listings_vin_live_idx
  on public.rental_listings (upper(vin))
  where vin is not null and status <> 'archived';

-- ── 3) rental_listing_photos ────────────────────────────────────────
--
-- Gallery for a listing. `position` orders them and position 0 is the
-- cover when hero_photo_path is null.
--
-- storage_path is bucket-relative and follows
--   <partner_id>/<listing_id>/<uuid>.<ext>
-- The first segment being the PARTNER (not the uploading user) is
-- deliberate: several staff accounts can belong to one operator
-- (partner_accounts is many:1 onto partners), and a photo uploaded by
-- one of them must remain manageable by the others.

create table if not exists public.rental_listing_photos (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.rental_listings(id) on delete cascade,
  storage_path  text not null unique,
  position      smallint not null default 0 check (position >= 0),
  created_at    timestamptz not null default now(),

  -- Deterministic cover. Without this two photos can both sit at
  -- position 0 and the cover becomes whatever Postgres returns first.
  constraint rental_listing_photos_unique_position unique (listing_id, position)
);

create index if not exists rental_listing_photos_listing_id_idx
  on public.rental_listing_photos (listing_id);

-- ── 4) Update guard ─────────────────────────────────────────────────
--
-- Guardrail 3.8: enforce state at the database, not just the route.
-- Combines the updated_at bump with the transition rules, the way
-- rental_payments_enforce_status (0041) combines its status guard with
-- its immutability checks.
--
-- Legal transitions:
--   draft    → active | archived
--   active   → paused | archived
--   paused   → active | archived
--   archived → (nothing; terminal)
--
-- Same-status updates always pass so ordinary edits (rate, photos,
-- nights) never trip the guard.
--
-- partner_id is immutable. A listing does not change hands — that is
-- an archive plus a new listing. Enforcing it here also closes the
-- gap a FOR ALL policy leaves open, where an operator could hand their
-- row to someone else on UPDATE.

create or replace function public.rental_listings_enforce_update()
returns trigger as $$
begin
  new.updated_at := now();

  if new.partner_id is distinct from old.partner_id then
    raise exception 'rental_listings: partner_id is immutable (archive and re-list instead)';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'archived'
       or not (
         (old.status = 'draft'  and new.status in ('active','archived'))
         or (old.status = 'active' and new.status in ('paused','archived'))
         or (old.status = 'paused' and new.status in ('active','archived'))
       ) then
      raise exception 'illegal rental_listings status transition: % -> %',
        old.status, new.status;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists rental_listings_update_guard on public.rental_listings;
create trigger rental_listings_update_guard
  before update on public.rental_listings
  for each row execute function public.rental_listings_enforce_update();

-- ── 5) RLS ──────────────────────────────────────────────────────────

alter table public.rental_listings enable row level security;
alter table public.rental_listing_photos enable row level security;

-- Public browse. Anonymous visitors see 'active' rows; an operator
-- additionally sees every listing they own in any status.
--
-- The "or is_partner_staff" half is load-bearing, not a convenience:
-- the photo policies below reach the listing through a subquery, and a
-- subquery inside a policy is itself subject to the target table's
-- RLS. Without it an operator's own draft listing would be invisible
-- to them, and its photos unreadable and unwritable.
--
-- Deliberately NOT joined to public.partners to hide a paused
-- operator's cars: partners has RLS enabled with zero policies, so any
-- reference to it from an anon-evaluated policy returns no rows and
-- would hide the entire grid. Operator pause cascading to listing
-- visibility belongs in the operator-status route (it should flip the
-- listings to 'paused'), or in a definer helper — not here.
drop policy if exists rental_listings_select_public on public.rental_listings;
create policy rental_listings_select_public
  on public.rental_listings
  for select
  using (
    status = 'active'
    or public.is_partner_staff(partner_id)
  );

-- Operators manage their own inventory. WITH CHECK is written out in
-- full: on a FOR ALL policy, USING gates SELECT/UPDATE/DELETE and
-- WITH CHECK gates INSERT/UPDATE, and omitting it would let an
-- operator write a row belonging to somebody else.
drop policy if exists rental_listings_manage_operator on public.rental_listings;
create policy rental_listings_manage_operator
  on public.rental_listings
  for all
  to authenticated
  using (public.is_partner_staff(partner_id))
  with check (public.is_partner_staff(partner_id));

-- Admins see and manage everything — same expression as
-- partner_accounts_admin_all (0042) and llc_entities (0022).
drop policy if exists rental_listings_admin_all on public.rental_listings;
create policy rental_listings_admin_all
  on public.rental_listings
  for all
  using ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' )
  with check ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' );

-- Photos inherit their parent's visibility. Gating on the listing
-- rather than `using (true)` keeps a draft listing's photos private
-- while it is still being written.
drop policy if exists rental_listing_photos_select_public on public.rental_listing_photos;
create policy rental_listing_photos_select_public
  on public.rental_listing_photos
  for select
  using (
    exists (
      select 1 from public.rental_listings l
      where l.id = rental_listing_photos.listing_id
    )
  );

-- Operator writes. The storage_path prefix check is the part that is
-- easy to miss: without it an operator can attach a path pointing into
-- ANOTHER operator's folder to their own listing. The table policy
-- alone only proves the listing is theirs; the storage policy alone
-- only proves the folder is theirs. Nothing checks the two agree
-- unless it is written here.
drop policy if exists rental_listing_photos_manage_operator on public.rental_listing_photos;
create policy rental_listing_photos_manage_operator
  on public.rental_listing_photos
  for all
  to authenticated
  using (
    exists (
      select 1 from public.rental_listings l
      where l.id = rental_listing_photos.listing_id
        and public.is_partner_staff(l.partner_id)
    )
  )
  with check (
    exists (
      select 1 from public.rental_listings l
      where l.id = rental_listing_photos.listing_id
        and public.is_partner_staff(l.partner_id)
        and rental_listing_photos.storage_path like l.partner_id::text || '/%'
    )
  );

drop policy if exists rental_listing_photos_admin_all on public.rental_listing_photos;
create policy rental_listing_photos_admin_all
  on public.rental_listing_photos
  for all
  using ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' )
  with check ( coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' );

-- ── 6) Storage: the rental-car-photos bucket ────────────────────────
--
-- Path convention: <partner_id>/<listing_id>/<uuid>.<ext>
--
-- Public read, because these are the images on a public browse grid.
-- Size and MIME limits are set on the BUCKET so Storage itself
-- enforces them — an <input accept="image/*"> is a hint to a file
-- picker, not a security control.
--
-- CAVEAT, and the reason everything below is wrapped in an exception
-- handler: storage.objects is owned by supabase_storage_admin, and
-- depending on how a project was provisioned the role running
-- migrations may not be permitted to create policies on it. Where that
-- is the case this block raises a NOTICE with the exact SQL to paste
-- into the Supabase SQL editor (which runs with the necessary rights)
-- rather than aborting the whole migration and leaving the tables
-- above unapplied.

create or replace function public.rental_photo_path_is_own(
  p_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folder text;
begin
  -- First path segment is the owning partner's id.
  v_folder := (storage.foldername(p_name))[1];

  -- Validate before casting: an object name whose first segment is not
  -- a uuid would raise 22P02 inside a policy and abort the statement,
  -- so a malformed path must return false rather than throw.
  --
  -- Lowercase only, deliberately. Postgres renders uuid::text in
  -- lowercase, so that is the form the LIKE prefix checks on
  -- rental_listings.hero_photo_path and rental_listing_photos
  -- .storage_path compare against. Accepting an uppercased folder here
  -- would let an upload succeed and then have its database row
  -- rejected — the worst of both.
  if v_folder is null
     or v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    return false;
  end if;

  return public.is_partner_staff(v_folder::uuid);
end;
$$;

revoke all on function public.rental_photo_path_is_own(text) from public;
grant execute on function public.rental_photo_path_is_own(text) to authenticated;

do $$
begin
  -- The bucket. Unlike the ops-editable rows in 0041, the conflict
  -- branch here deliberately OVERWRITES: public/size/MIME are security
  -- controls, not operator preferences, and a bucket hand-made in the
  -- dashboard without limits should be brought up to spec.
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'rental-car-photos',
    'rental-car-photos',
    true,
    10485760,                                    -- 10 MB
    array['image/jpeg','image/png','image/webp','image/avif']
  )
  on conflict (id) do update set
    public            = excluded.public,
    file_size_limit   = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  -- Policies on storage.objects are GLOBAL across every bucket, so
  -- each one must lead with bucket_id or it governs the whole project.
  -- Policy names share a single namespace on that table too, hence the
  -- rental_ prefix and the drop-before-create.
  drop policy if exists rental_car_photos_read on storage.objects;
  create policy rental_car_photos_read
    on storage.objects
    for select
    using (bucket_id = 'rental-car-photos');

  drop policy if exists rental_car_photos_insert on storage.objects;
  create policy rental_car_photos_insert
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'rental-car-photos'
      and public.rental_photo_path_is_own(name)
    );

  drop policy if exists rental_car_photos_update on storage.objects;
  create policy rental_car_photos_update
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'rental-car-photos'
      and public.rental_photo_path_is_own(name)
    )
    with check (
      bucket_id = 'rental-car-photos'
      and public.rental_photo_path_is_own(name)
    );

  drop policy if exists rental_car_photos_delete on storage.objects;
  create policy rental_car_photos_delete
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'rental-car-photos'
      and public.rental_photo_path_is_own(name)
    );
exception
  when insufficient_privilege then
    raise notice
      'rental-car-photos storage setup skipped: the migration role cannot write storage.objects/buckets. Re-run section 6 of 0044_rental_listings.sql in the Supabase SQL editor.';
end $$;

-- ── 7) Comments ─────────────────────────────────────────────────────

comment on table public.rental_listings is
  'Daily-rental inventory: one row per car an operator offers. Public SELECT of active rows (renters browse pre-auth); writes scoped to approved staff of the owning partner.';

comment on column public.rental_listings.vin is
  'Permanent identity of the physical car (asset passport). Nullable until the fleet dashboard collects it; a partial unique index prevents two non-archived listings for the same VIN.';

comment on column public.rental_listings.hero_photo_path is
  'Explicit cover override, bucket-relative. Null means the cover is the position-0 row in rental_listing_photos (mirrors getPartnerHero()).';

comment on table public.rental_listing_photos is
  'Listing gallery. storage_path is <partner_id>/<listing_id>/<uuid>.<ext> in the rental-car-photos bucket; position 0 is the cover when the listing has no hero_photo_path.';

comment on function public.is_partner_staff(uuid) is
  'True when the current user is an APPROVED partner_accounts member of the given operator. Security definer (partner_accounts is RLS-restricted); derives the user from auth.uid() so it cannot be used to introspect other users.';
