// Rental listings — the database-backed read path (migration 0044).
//
// Today /rent renders from two hard-coded modules (market-data.ts and
// partner-fleet.ts). Migration 0044 introduces rental_listings +
// rental_listing_photos so operators can eventually own their own
// inventory. This module is the boundary between those rows and the
// RentalListing shape the grid already renders — nothing here queries
// yet; wiring the grid is a later PR (build loop 2C).
//
// Two rules it exists to hold in one place:
//
//   1. CENTS ↔ DOLLARS. The table stores cents (matching
//      computeRentalFee in fees.ts, which is the cents side of that
//      module). RentalListing.dailyRate is dollars. The divide happens
//      here and nowhere else — the same discipline fees.ts documents
//      about its own *100 boundary.
//   2. STORAGE PATH ↔ URL. Rows carry bucket-relative paths; the grid
//      needs an absolute URL. One resolver, so a bucket rename is one
//      edit.
//
// There is no generated Database type in this repo, so rows are typed
// by hand and cast at the query boundary. Keep RENTAL_LISTING_COLS
// next to RentalListingRow — they must drift together, because a
// column-name typo inside a .select() string is not a type error.

import type { RentalListing } from "@/components/rental-listings";

/** Bucket created by migration 0044. Public read, 10 MB, images only. */
export const RENTAL_PHOTO_BUCKET = "rental-car-photos";

export const RENTAL_LISTING_STATUSES = [
  "draft",
  "active",
  "paused",
  "archived",
] as const;
export type RentalListingStatus = (typeof RENTAL_LISTING_STATUSES)[number];

/** Row shape of public.rental_listings (migration 0044). */
export type RentalListingRow = {
  id: string;
  partner_id: string;
  slug: string;
  vin: string | null;
  make: string;
  model: string;
  year: number | null;
  category: string;
  market: string;
  daily_rate_cents: number;
  regular_rate_cents: number | null;
  min_nights: number;
  max_nights: number;
  miles_included_per_day: number | null;
  status: RentalListingStatus;
  hero_photo_path: string | null;
  created_at: string;
  updated_at: string;
};

/** Select list for RentalListingRow. Must match the type above. */
export const RENTAL_LISTING_COLS =
  "id, partner_id, slug, vin, make, model, year, category, market, " +
  "daily_rate_cents, regular_rate_cents, min_nights, max_nights, " +
  "miles_included_per_day, status, hero_photo_path, created_at, updated_at";

/** Row shape of public.rental_listing_photos (migration 0044). */
export type RentalListingPhotoRow = {
  id: string;
  listing_id: string;
  storage_path: string;
  position: number;
  created_at: string;
};

export const RENTAL_LISTING_PHOTO_COLS =
  "id, listing_id, storage_path, position, created_at";

/**
 * Bucket-relative object path for a listing photo:
 * `<partner_id>/<listing_id>/<file>`.
 *
 * The leading segment is the PARTNER, not the uploading user — several
 * staff accounts can belong to one operator, and 0044's storage policy
 * authorises writes by checking that first segment against
 * is_partner_staff(). A path built any other way will be rejected by
 * Storage and by the rental_listing_photos insert policy.
 */
export function rentalPhotoPath(
  partnerId: string,
  listingId: string,
  fileName: string,
): string {
  return `${partnerId}/${listingId}/${fileName}`;
}

/**
 * Absolute URL for a bucket-relative path. Returns undefined when the
 * path is empty or Supabase is not configured, so a missing bucket
 * degrades to "no image" rather than a broken <img>.
 *
 * Built by hand rather than via storage.getPublicUrl() so it stays a
 * pure function — callable from a server component, a test, or a
 * static render without a Supabase client.
 */
export function rentalPhotoUrl(
  path: string | null | undefined,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | undefined {
  if (!path || !supabaseUrl) return undefined;
  const base = supabaseUrl.replace(/\/+$/, "");
  const clean = path.replace(/^\/+/, "");
  if (!clean) return undefined;
  return `${base}/storage/v1/object/public/${RENTAL_PHOTO_BUCKET}/${clean}`;
}

/**
 * Cover photo for a listing, as a bucket-relative path.
 *
 * Prefers the explicit hero_photo_path, else the lowest-position
 * photo. This mirrors getPartnerHero() in partner-fleet.ts, which
 * prefers an explicit `hero` and falls back to the first scraped
 * photo — same rule, different storage.
 *
 * Photos are sorted defensively rather than trusting query order.
 */
export function rentalCoverPath(
  row: Pick<RentalListingRow, "hero_photo_path">,
  photos: readonly RentalListingPhotoRow[] = [],
): string | undefined {
  if (row.hero_photo_path) return row.hero_photo_path;
  if (photos.length === 0) return undefined;
  const first = [...photos].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  )[0];
  return first?.storage_path ?? undefined;
}

/**
 * Map a database row onto the shape the /rent grid renders.
 *
 * Every DB listing is `kind: "partner"` and `isCoOwnable: false`:
 * decision D7 of the build loop is that rental inventory belongs to
 * partner operators, and a "RYDA rents its own fleet" path is
 * explicitly deferred. The co-ownable cars still come from
 * market-data.ts.
 *
 * Note what is NOT carried across: partner_id, vin, and the operator's
 * identity never enter this object. D6 keeps operators anonymous until
 * a booking is confirmed, and the existing grid already enforces that
 * by omission — partnerToListing() drops the partner fields too.
 */
export function rowToRentalListing(
  row: RentalListingRow,
  photos: readonly RentalListingPhotoRow[] = [],
  supabaseUrl?: string,
): RentalListing {
  return {
    slug: row.slug,
    kind: "partner",
    make: row.make,
    model: row.model,
    year: row.year ?? undefined,
    category: row.category,
    dailyRate: centsToDollars(row.daily_rate_cents),
    regularRate:
      row.regular_rate_cents === null
        ? undefined
        : centsToDollars(row.regular_rate_cents),
    market: row.market,
    hero: rentalPhotoUrl(rentalCoverPath(row, photos), supabaseUrl),
    isCoOwnable: false,
  };
}

/**
 * Cents → dollars, the one place the rental boundary is crossed on the
 * read path. Rates are authored in whole dollars (a $1,105/day Huracán
 * is 110_500 cents), so the result is normally an integer. Math.round
 * only defends against a non-integer reaching the function; it does
 * not round to whole dollars, because throwing away real cents would
 * be worse than displaying them.
 */
function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}
