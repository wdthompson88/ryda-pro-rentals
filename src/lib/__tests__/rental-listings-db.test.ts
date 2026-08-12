// Tests for the rental_listings read boundary (migration 0044).
//
// These cover the two things that silently corrupt a listing grid: a
// cents/dollars slip (the fleet is priced in the four figures, so a
// factor-of-100 error renders as a plausible number rather than an
// obvious one) and a wrong cover photo (the storage path convention is
// what 0044's storage RLS authorises against, so a malformed path is
// an upload that Storage rejects).

import { describe, it, expect } from "vitest";
import {
  RENTAL_LISTING_COLS,
  RENTAL_PHOTO_BUCKET,
  rentalCoverPath,
  rentalPhotoPath,
  rentalPhotoUrl,
  rowToRentalListing,
  type RentalListingPhotoRow,
  type RentalListingRow,
} from "../rental-listings-db";

const SUPABASE_URL = "https://abcdefghijklmnop.supabase.co";
const PARTNER_ID = "11111111-1111-4111-8111-111111111111";
const LISTING_ID = "22222222-2222-4222-8222-222222222222";

/** A Huracán EVO at GM LUXE's real rate: $1,105/day off $1,300 sticker. */
function row(overrides: Partial<RentalListingRow> = {}): RentalListingRow {
  return {
    id: LISTING_ID,
    partner_id: PARTNER_ID,
    slug: "lamborghini-huracan-evo",
    vin: null,
    make: "Lamborghini",
    model: "Huracán EVO",
    year: 2022,
    category: "Exotic",
    market: "Miami",
    daily_rate_cents: 110_500,
    regular_rate_cents: 130_000,
    min_nights: 1,
    max_nights: 30,
    miles_included_per_day: 100,
    status: "active",
    hero_photo_path: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function photo(
  position: number,
  file: string,
  createdAt = "2026-08-01T00:00:00.000Z",
): RentalListingPhotoRow {
  return {
    id: `photo-${position}`,
    listing_id: LISTING_ID,
    storage_path: rentalPhotoPath(PARTNER_ID, LISTING_ID, file),
    position,
    created_at: createdAt,
  };
}

describe("rentalPhotoPath", () => {
  it("puts the partner id first, which is what the storage policy checks", () => {
    // 0044's rental_car_photos_insert policy resolves
    // (storage.foldername(name))[1] and passes it to is_partner_staff().
    // Any other leading segment is rejected by Storage.
    const path = rentalPhotoPath(PARTNER_ID, LISTING_ID, "front.jpg");
    expect(path).toBe(`${PARTNER_ID}/${LISTING_ID}/front.jpg`);
    expect(path.split("/")[0]).toBe(PARTNER_ID);
  });

  it("matches the prefix both owning-folder checks require", () => {
    // Two SQL checks compare against this prefix, and they are
    // LIKE-based so the casing has to be exact:
    //   rental_listing_photos_manage_operator WITH CHECK
    //     storage_path like l.partner_id::text || '/%'
    //   rental_listings_hero_own_folder CHECK
    //     hero_photo_path like partner_id::text || '/%'
    // uuid::text renders lowercase, and rental_photo_path_is_own only
    // accepts a lowercase folder, so an uppercased id here would pass
    // neither.
    const path = rentalPhotoPath(PARTNER_ID, LISTING_ID, "a.webp");
    expect(path).toMatch(new RegExp(`^${PARTNER_ID}/`));
    expect(path.split("/")[0]).toBe(path.split("/")[0].toLowerCase());
  });
});

describe("rentalPhotoUrl", () => {
  it("builds the public object URL for the 0044 bucket", () => {
    expect(rentalPhotoUrl(`${PARTNER_ID}/${LISTING_ID}/a.jpg`, SUPABASE_URL)).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/${RENTAL_PHOTO_BUCKET}/${PARTNER_ID}/${LISTING_ID}/a.jpg`,
    );
  });

  it("tolerates a trailing slash on the project URL and a leading slash on the path", () => {
    expect(rentalPhotoUrl(`/${PARTNER_ID}/a.jpg`, `${SUPABASE_URL}/`)).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/${RENTAL_PHOTO_BUCKET}/${PARTNER_ID}/a.jpg`,
    );
  });

  it("returns undefined rather than a broken URL when unconfigured", () => {
    // CI runs with no Supabase env by design; a listing must degrade to
    // "no image", never to an <img> pointing at "undefined/...".
    expect(rentalPhotoUrl("a.jpg", undefined)).toBeUndefined();
    expect(rentalPhotoUrl(null, SUPABASE_URL)).toBeUndefined();
    expect(rentalPhotoUrl("", SUPABASE_URL)).toBeUndefined();
    expect(rentalPhotoUrl("/", SUPABASE_URL)).toBeUndefined();
  });
});

describe("rentalCoverPath", () => {
  it("prefers an explicit hero_photo_path over the gallery", () => {
    const explicit = rentalPhotoPath(PARTNER_ID, LISTING_ID, "hero.jpg");
    expect(
      rentalCoverPath({ hero_photo_path: explicit }, [photo(0, "other.jpg")]),
    ).toBe(explicit);
  });

  it("falls back to the lowest-position photo regardless of array order", () => {
    const photos = [photo(2, "c.jpg"), photo(0, "a.jpg"), photo(1, "b.jpg")];
    expect(rentalCoverPath({ hero_photo_path: null }, photos)).toBe(
      rentalPhotoPath(PARTNER_ID, LISTING_ID, "a.jpg"),
    );
  });

  it("breaks a position tie by created_at so the cover is deterministic", () => {
    // 0044 has a unique (listing_id, position) constraint, so a tie
    // should be impossible in the database — this is the guard for
    // rows read across a reorder.
    const photos = [
      photo(0, "later.jpg", "2026-08-02T00:00:00.000Z"),
      photo(0, "earlier.jpg", "2026-08-01T00:00:00.000Z"),
    ];
    expect(rentalCoverPath({ hero_photo_path: null }, photos)).toBe(
      rentalPhotoPath(PARTNER_ID, LISTING_ID, "earlier.jpg"),
    );
  });

  it("returns undefined for a listing with no photos at all", () => {
    expect(rentalCoverPath({ hero_photo_path: null }, [])).toBeUndefined();
    expect(rentalCoverPath({ hero_photo_path: null })).toBeUndefined();
  });

  it("does not mutate the caller's photo array", () => {
    const photos = [photo(2, "c.jpg"), photo(0, "a.jpg")];
    rentalCoverPath({ hero_photo_path: null }, photos);
    expect(photos[0].position).toBe(2);
  });
});

describe("rowToRentalListing", () => {
  it("converts cents to dollars for both rates", () => {
    const listing = rowToRentalListing(row(), [], SUPABASE_URL);
    expect(listing.dailyRate).toBe(1105); // 110_500 cents
    expect(listing.regularRate).toBe(1300); // 130_000 cents
  });

  it("leaves regularRate undefined when the operator sets no sticker price", () => {
    // The card only renders a savings badge when regularRate exists;
    // a 0 here would print "save 100%".
    const listing = rowToRentalListing(
      row({ regular_rate_cents: null }),
      [],
      SUPABASE_URL,
    );
    expect(listing.regularRate).toBeUndefined();
  });

  it("carries no RYDA-fleet fields — there is one rail (D7)", () => {
    // The RYDA-owned rail was removed in Aug 2026: RentalListing has no
    // `kind` discriminator and no co-ownership fields for a row to set,
    // and re-adding either would mean re-adding a fleet RYDA does not
    // own.
    const listing = rowToRentalListing(row(), [], SUPABASE_URL) as Record<
      string,
      unknown
    >;
    expect(listing.kind).toBeUndefined();
    expect(listing.isCoOwnable).toBeUndefined();
    expect(listing.sharesAvailable).toBeUndefined();
  });

  it("never leaks operator identity into the browse shape (D6)", () => {
    // Operators stay anonymous until a booking is confirmed. The grid
    // enforces this by omission, so assert the fields are absent.
    const listing = rowToRentalListing(row(), [], SUPABASE_URL) as Record<
      string,
      unknown
    >;
    expect(listing.partner_id).toBeUndefined();
    expect(listing.partnerId).toBeUndefined();
    expect(listing.vin).toBeUndefined();
    expect(JSON.stringify(listing)).not.toContain(PARTNER_ID);
  });

  it("resolves the cover photo through the gallery", () => {
    const listing = rowToRentalListing(
      row(),
      [photo(1, "b.jpg"), photo(0, "a.jpg")],
      SUPABASE_URL,
    );
    expect(listing.hero).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/${RENTAL_PHOTO_BUCKET}/${PARTNER_ID}/${LISTING_ID}/a.jpg`,
    );
  });

  it("maps a null year to undefined rather than 0", () => {
    expect(rowToRentalListing(row({ year: null }), [], SUPABASE_URL).year)
      .toBeUndefined();
  });

  it("uses the slug as the route key", () => {
    expect(rowToRentalListing(row(), [], SUPABASE_URL).slug).toBe(
      "lamborghini-huracan-evo",
    );
  });
});

describe("RENTAL_LISTING_COLS", () => {
  it("selects exactly the keys of RentalListingRow", () => {
    // There is no generated Database type in this repo, so a typo in
    // the select string is not a compile error. This is the check that
    // catches it.
    const selected = RENTAL_LISTING_COLS.split(",").map((c) => c.trim());
    const expected = Object.keys(row()).sort();
    expect([...selected].sort()).toEqual(expected);
  });
});
