-- 0054: a PRIVATE bucket for handover photos.
-- (RYDA_RENTAL_BUILD_LOOP.md phase 4C, the media half. Claims 0054;
-- 0053 is rental_handovers.)
--
-- WHY NOT rental-car-photos, the bucket that already exists.
--
-- Two reasons, and either alone would be enough:
--
--   IT IS PUBLIC. 0044 made it public deliberately — listing photos are
--   marketing, served on a browse page to anonymous visitors. A handover
--   photo is the opposite: a specific car, on a specific date, damaged or
--   not, belonging to a booking whose renter is identifiable from the row
--   it hangs off. Publishing that by default is a privacy failure that
--   would look exactly like a working feature.
--
--   ITS RLS IS FOLDER-PER-OPERATOR. 0044 scopes writes to
--   `partner_id/...`, because operators own their listings' media. A
--   handover is written by EITHER PARTY (0053's route accepts both — the
--   operator handing over keys, or the renter collecting from a lockbox),
--   so a renter uploading a return photo has no operator folder to write
--   into and would be refused by a policy that is correct for listings.
--
-- So: a second bucket, private, scoped by BOOKING rather than by operator.
--
-- PATH CONVENTION, which the policies below depend on:
--
--     <booking_id>/<checkin|return>/<filename>
--
-- The first segment is the booking's uuid, which is what every policy
-- matches on. It is not guessable and it is not enumerable, but neither
-- fact is load-bearing — the policies check membership, not obscurity.

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'rental-handover-photos',
    'rental-handover-photos',
    -- PRIVATE. Reads go through a signed URL minted by a route that has
    -- already checked the caller is a party to the booking.
    false,
    10485760,                                    -- 10 MB, matching 0044
    array['image/jpeg','image/png','image/webp','image/avif','image/heic']
  )
  on conflict (id) do update set
    public            = excluded.public,
    file_size_limit   = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
exception when insufficient_privilege then
  -- Same caveat 0044 records: on a hosted project the migration role may
  -- not own storage.buckets. The bucket is then created once from the
  -- dashboard with these settings, and this block is a no-op. Failing the
  -- whole migration over it would block the tables that DO apply.
  raise notice '0054: cannot write storage.buckets from this role — create rental-handover-photos manually (private, 10MB, image mime types)';
end $$;

-- ── Policies on storage.objects ─────────────────────────────────────
--
-- Wrapped for the same ownership reason. A hosted project may refuse
-- policy creation on storage.objects to the migration role; the notice
-- says what to create by hand rather than leaving a silent gap.
--
-- The predicate is the same on all three: the first path segment names a
-- booking the caller is a party to. `storage.foldername(name)` returns
-- the path segments as an array, so [1] is the booking id — Postgres
-- arrays being 1-indexed, which is the off-by-one this policy would
-- otherwise ship with.

do $$
begin
  -- READ: renter, operator staff, or admin.
  drop policy if exists rental_handover_photos_read on storage.objects;
  create policy rental_handover_photos_read
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'rental-handover-photos'
      and exists (
        select 1
        from public.rental_bookings b
        join public.rental_listings l on l.id = b.listing_id
        where b.id::text = (storage.foldername(name))[1]
          and (
            b.renter_user_id = auth.uid()
            or public.is_partner_staff(l.partner_id)
            or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
          )
      )
    );

  -- WRITE: the same membership, and nothing else. Deliberately no UPDATE
  -- policy — a handover photo that can be replaced after the fact is
  -- worth as much as an odometer reading that can be edited, which 0053
  -- refuses for the same reason.
  drop policy if exists rental_handover_photos_insert on storage.objects;
  create policy rental_handover_photos_insert
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'rental-handover-photos'
      and exists (
        select 1
        from public.rental_bookings b
        join public.rental_listings l on l.id = b.listing_id
        where b.id::text = (storage.foldername(name))[1]
          and (
            b.renter_user_id = auth.uid()
            or public.is_partner_staff(l.partner_id)
          )
      )
    );

  -- DELETE: admin only. A party removing their own evidence after a
  -- dispute opens is precisely the thing this bucket exists to prevent.
  drop policy if exists rental_handover_photos_delete on storage.objects;
  create policy rental_handover_photos_delete
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'rental-handover-photos'
      and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    );
exception when insufficient_privilege then
  raise notice '0054: cannot manage policies on storage.objects from this role — create the three rental_handover_photos policies by hand (see this migration)';
end $$;
