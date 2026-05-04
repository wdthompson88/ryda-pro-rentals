-- Prevent double-booking via a database-enforced exclusion constraint.
--
-- Current state: src/app/api/bookings/route.ts does a read-then-insert
-- conflict check (line 126 SELECT, line 149 INSERT). Two parallel
-- requests for the same asset and overlapping dates can both pass
-- the SELECT and both INSERT — TOCTOU race that double-books a car.
-- The bookings_asset_dates_idx (migration 0009) is just an index;
-- it doesn't enforce non-overlap. Codex round-3 catch.
--
-- Fix: a Postgres EXCLUDE constraint using daterange + && (overlap)
-- operator, scoped to active statuses (pending / confirmed / in-progress)
-- and to the asset key (vehicle_symbol if not null else boat_slug).
-- Conflicting INSERTs fail with 23P01 exclusion_violation.
--
-- The application code remains: the explicit conflict check stays
-- (it gives a friendlier 409 with the conflicting row's details);
-- this constraint is the safety net for the race window between
-- check and insert.
--
-- Requires the btree_gist extension for combining GiST with the
-- text equality side of the EXCLUDE.

create extension if not exists btree_gist;

-- The EXCLUDE clause needs a single asset-identity column. Use a
-- generated column that coalesces vehicle_symbol and boat_slug so
-- the constraint can scope by it without complicating the data shape.
do $$
begin
  alter table public.bookings
    add column asset_key text generated always as (
      coalesce(vehicle_symbol, boat_slug)
    ) stored;
exception when duplicate_column then
  null;
end $$;

-- Backfill is implicit (generated column).

-- The EXCLUDE constraint. Postgres can't easily filter by a
-- multi-value status set in EXCLUDE WHERE, so we use a partial
-- constraint that fires only on active statuses. Two rows can't
-- coexist if asset_key matches AND date ranges overlap AND both
-- are in an active status.
do $$
begin
  alter table public.bookings
    add constraint bookings_no_overlap
    exclude using gist (
      asset_key with =,
      daterange(start_date, end_date, '[]') with &&
    )
    where (status in ('pending', 'confirmed', 'in-progress'));
exception when duplicate_object then
  null;
end $$;

-- The supporting index for the existing application-level conflict
-- check (migration 0009) stays — it's a performance index, the new
-- EXCLUDE provides correctness.
