// Tests for the per-car availability math (migration 0046).
//
// Three things here are worth a test each because each of them fails
// SILENTLY and plausibly:
//
//   * Nights vs. days. Off by one in either direction produces a number
//     that looks like a price. Under-count and RYDA sells a night for
//     free; over-count and the return day is billed as a night nobody
//     had the car.
//   * DST. Local-time day math loses an hour every March and gains one
//     every November, so a 30-night rental silently becomes 29.958 and
//     trips a max-nights guard — the exact bug the inquiry form already
//     carries a comment about. THE WHOLE FILE RUNS IN A DST-OBSERVING
//     TIMEZONE (see below) so a regression to local-time math fails here
//     rather than in production twice a year.
//   * Overlap scoping. rental_availability_no_overlap is keyed by kind,
//     which is what makes an open-override representable at all. A JS
//     pre-check that forgets `kind` rejects the override the operator is
//     entitled to write; one that forgets to skip the row's own id
//     rejects every edit.

import { describe, it, expect, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  DEFAULT_BOOKING_HORIZON_DAYS,
  MAX_EXPAND_DAYS,
  RENTAL_AVAILABILITY_COLS,
  RENTAL_AVAILABILITY_KINDS,
  RENTAL_BOOKING_RESERVING_STATUSES,
  RENTAL_OPERATING_WINDOW_COLS,
  SAME_DAY_SLACK_DAYS,
  addUtcDays,
  availabilityConflict,
  checkRange,
  expandDays,
  isDayOpen,
  nightsBetween,
  occupiedDays,
  operatingWindow,
  parseUtcDay,
  rangesOverlap,
  reservingRanges,
  selectableDays,
  utcDayOf,
  type AvailabilityInput,
  type BookedRange,
  type DayRange,
  type RentalAvailabilityRow,
  type RentalListingAvailability,
  type RentalOperatingWindowRow,
} from "../rental-availability";
import {
  RENTAL_BOOKING_STATUSES,
  reservesRentalDates,
  type RentalBookingStatus,
} from "../rental-booking-status";

// Run everything in a zone that observes DST. If the implementation ever
// reaches for a local-time accessor, the March and November cases below
// break immediately instead of once the clocks change.
const ORIGINAL_TZ = process.env.TZ;
process.env.TZ = "America/New_York";
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const LISTING_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_LISTING_ID = "44444444-4444-4444-8444-444444444444";
const TODAY = "2026-08-05";

function listing(
  overrides: Partial<RentalListingAvailability> = {},
): RentalListingAvailability {
  return {
    available_from: null,
    available_until: null,
    booking_horizon_days: DEFAULT_BOOKING_HORIZON_DAYS,
    min_nights: 1,
    max_nights: 30,
    ...overrides,
  };
}

function row(
  overrides: Partial<RentalAvailabilityRow> = {},
): RentalAvailabilityRow {
  return {
    id: "row-1",
    listing_id: LISTING_ID,
    kind: "blackout",
    start_date: "2026-08-10",
    end_date: "2026-08-12",
    reason: "maintenance",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

/** An eleven-day window, small enough to assert day-by-day. */
function shortWindow(
  overrides: Partial<AvailabilityInput> = {},
): AvailabilityInput {
  return {
    listing: listing({
      available_from: "2026-08-05",
      available_until: "2026-08-15",
    }),
    today: TODAY,
    ...overrides,
  };
}

describe("nights vs. days — the billing rule", () => {
  it("bills the 5th to the 8th as three nights", () => {
    // The single number the server quote multiplies by the daily rate.
    expect(nightsBetween("2026-08-05", "2026-08-08")).toBe(3);
  });

  it("occupies four calendar days for those same three nights", () => {
    // Inclusive of both ends, matching daterange(start, end, '[]') in
    // 0046's EXCLUDE and 0021's: the car is not handed to the next
    // renter on its return day.
    expect(occupiedDays({ start_date: "2026-08-05", end_date: "2026-08-08" })).toEqual([
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
    ]);
  });

  it("holds days === nights + 1 for every span in a month", () => {
    for (let n = 0; n <= 30; n += 1) {
      const end = addUtcDays("2026-08-01", n);
      expect(end).not.toBeNull();
      const nights = nightsBetween("2026-08-01", end as string);
      expect(nights).toBe(n);
      expect(
        occupiedDays({ start_date: "2026-08-01", end_date: end as string }),
      ).toHaveLength(n + 1);
    }
  });

  it("treats a same-day pickup and return as zero nights, one day", () => {
    expect(nightsBetween("2026-08-05", "2026-08-05")).toBe(0);
    expect(
      occupiedDays({ start_date: "2026-08-05", end_date: "2026-08-05" }),
    ).toEqual(["2026-08-05"]);
  });

  it("refuses to price an inverted range rather than returning a negative", () => {
    expect(nightsBetween("2026-08-08", "2026-08-05")).toBeNull();
    expect(
      expandDays({ start_date: "2026-08-08", end_date: "2026-08-05" }),
    ).toEqual([]);
  });
});

describe("nights arithmetic agrees with the booking table (0046 ↔ 0047)", () => {
  // "Nights" is defined in three places that no compiler relates: this
  // module, 0047's rental_bookings_nights_bounded, and 0044's per-car
  // min/max. All three must mean `end_date - start_date`. If 0047 ever
  // switched to an exclusive end (nights = end - start - 1, or a '[)'
  // range) every quote in the system would be off by one night and the
  // only symptom would be money.
  //
  // So these read the migrations rather than a comment about them.
  const MIGRATIONS = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../supabase/migrations",
  );

  /** A migration with `--` line comments removed, so prose about a bound
   *  is never mistaken for the bound. */
  function sqlOf(file: string): string {
    return readFileSync(path.join(MIGRATIONS, file), "utf8").replace(
      /--[^\n]*/g,
      "",
    );
  }

  const SQL_0044 = sqlOf("0044_rental_listings.sql");
  const SQL_0047 = sqlOf("0047_rental_bookings.sql");

  /** The platform-wide night ceiling, read out of 0047's own CHECK. */
  function platformMaxNights(): number {
    const match =
      /check\s*\(end_date\s*>\s*start_date\s+and\s+end_date\s*-\s*start_date\s*<=\s*(\d+)\)/.exec(
        SQL_0047,
      );
    expect(
      match,
      "rental_bookings_nights_bounded not found in 0047 — has the constraint been renamed or reshaped?",
    ).not.toBeNull();
    return Number(match![1]);
  }

  it("measures a night the same way 0047 does", () => {
    // SQL `end_date - start_date` on two dates is an integer day count.
    // nightsBetween must return that same number for the same pair, at
    // the boundary where a disagreement would first bite.
    const max = platformMaxNights();
    const end = addUtcDays("2026-08-05", max) as string;
    expect(nightsBetween("2026-08-05", end)).toBe(max);

    // …and occupancy is one longer, which is the '[]' bound both
    // EXCLUDE constraints use. Nights bill; days block.
    expect(
      occupiedDays({ start_date: "2026-08-05", end_date: end }),
    ).toHaveLength(max + 1);
  });

  it("never lets a car's max_nights exceed the platform ceiling", () => {
    // checkRange() gates a request on listing.max_nights alone. If 0044
    // permitted a larger value than 0047's backstop, the calendar would
    // green-light a range the INSERT then rejects with 23514 — the same
    // class of bug as offering a booked date, one table over.
    const match = /check\s*\(max_nights\s*>=\s*1\s+and\s+max_nights\s*<=\s*(\d+)\)/.exec(
      SQL_0044,
    );
    expect(match, "max_nights CHECK not found in 0044").not.toBeNull();
    expect(Number(match![1])).toBeLessThanOrEqual(platformMaxNights());
  });

  it("agrees that a zero-night stay is not a booking", () => {
    // Here it is 0 nights / 1 occupied day; there `end_date >
    // start_date` refuses the row outright, and 0044's min_nights >= 1
    // makes checkRange call it too_short before it ever gets that far.
    expect(nightsBetween("2026-08-05", "2026-08-05")).toBe(0);
    expect(SQL_0047).toContain("end_date > start_date");
    expect(SQL_0044).toContain("min_nights >= 1");
  });
});

describe("parseUtcDay", () => {
  it("rejects a day that does not exist", () => {
    // V8 accepts new Date('2026-02-31T00:00:00.000Z') and rolls it to
    // March 2nd. The round-trip is the only thing that catches it.
    expect(parseUtcDay("2026-02-31")).toBeNull();
    expect(parseUtcDay("2026-13-01")).toBeNull();
  });

  it("rejects anything that is not a zero-padded ISO day", () => {
    for (const bad of ["2026-8-1", "8/1/2026", "", "2026-08-05T00:00:00Z", "  2026-08-05"]) {
      expect(parseUtcDay(bad)).toBeNull();
    }
  });

  it("anchors a valid day at UTC midnight", () => {
    expect(parseUtcDay("2026-08-05")).toBe(Date.UTC(2026, 7, 5));
  });

  it("reads a Date as its UTC day, never its local one", () => {
    // 2026-08-06T02:00Z is still the 5th in New York. The calendar is
    // UTC, so this must be the 6th.
    expect(utcDayOf(new Date("2026-08-06T02:00:00.000Z"))).toBe("2026-08-06");
  });
});

describe("UTC anchoring across a DST change", () => {
  // US DST in 2026: forward Sun 8 March, back Sun 1 November.
  it("is running in a zone that actually observes DST", () => {
    // Guards the tests below from passing vacuously on a UTC machine.
    expect(new Date(Date.UTC(2026, 0, 15)).getTimezoneOffset()).not.toBe(
      new Date(Date.UTC(2026, 6, 15)).getTimezoneOffset(),
    );
  });

  it("counts three nights across the spring-forward, where local math counts 2.958", () => {
    expect(nightsBetween("2026-03-07", "2026-03-10")).toBe(3);
    // The bug this exists to prevent, spelled out: the local-time
    // constructor loses the 23-hour day.
    const naive =
      (new Date(2026, 2, 10).getTime() - new Date(2026, 2, 7).getTime()) / 86_400_000;
    expect(naive).not.toBe(3);
    expect(Number.isInteger(naive)).toBe(false);
  });

  it("counts three nights across the fall-back, where local math counts 3.042", () => {
    expect(nightsBetween("2026-10-31", "2026-11-03")).toBe(3);
    const naive =
      (new Date(2026, 10, 3).getTime() - new Date(2026, 9, 31).getTime()) / 86_400_000;
    expect(Number.isInteger(naive)).toBe(false);
  });

  it("still counts a full 30-night rental that straddles the spring-forward", () => {
    // 30 is max_nights (0044). A 29.958 here rounds down and rejects a
    // legal booking at the length boundary — silent, and only in March.
    expect(nightsBetween("2026-02-25", "2026-03-27")).toBe(30);
    expect(addUtcDays("2026-02-25", 30)).toBe("2026-03-27");
  });

  it("expands the spring-forward week into consecutive days with no gap or repeat", () => {
    const days = expandDays({ start_date: "2026-03-06", end_date: "2026-03-10" });
    expect(days).toEqual([
      "2026-03-06",
      "2026-03-07",
      "2026-03-08", // the 23-hour local day
      "2026-03-09",
      "2026-03-10",
    ]);
    expect(new Set(days).size).toBe(days.length);
  });

  it("expands the fall-back week into consecutive days with no gap or repeat", () => {
    const days = expandDays({ start_date: "2026-10-30", end_date: "2026-11-03" });
    expect(days).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01", // the 25-hour local day
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(new Set(days).size).toBe(days.length);
  });

  it("keeps blackout days stable across the boundary", () => {
    const days = selectableDays({
      listing: listing({ available_from: "2026-03-06", available_until: "2026-03-10" }),
      today: "2026-03-06",
      rows: [row({ start_date: "2026-03-08", end_date: "2026-03-08" })],
    });
    expect(days).toEqual(["2026-03-06", "2026-03-07", "2026-03-09", "2026-03-10"]);
  });
});

describe("expandDays refuses to truncate", () => {
  it("throws rather than returning a short list", () => {
    // A truncated list marks the days it never examined as OPEN, and
    // the failure mode of that is two renters at one car.
    expect(() =>
      expandDays({ start_date: "2026-01-01", end_date: "2031-01-01" }),
    ).toThrow(RangeError);
  });

  it("expands exactly up to the cap", () => {
    const end = addUtcDays("2026-01-01", MAX_EXPAND_DAYS - 1) as string;
    expect(expandDays({ start_date: "2026-01-01", end_date: end })).toHaveLength(
      MAX_EXPAND_DAYS,
    );
    expect(() =>
      expandDays({ start_date: "2026-01-01", end_date: addUtcDays(end, 1) as string }),
    ).toThrow(RangeError);
  });
});

describe("rangesOverlap — the JS twin of daterange(..., '[]') &&", () => {
  const base: DayRange = { start_date: "2026-08-10", end_date: "2026-08-12" };

  it("overlaps on a shared endpoint", () => {
    expect(rangesOverlap(base, { start_date: "2026-08-12", end_date: "2026-08-14" })).toBe(true);
    expect(rangesOverlap(base, { start_date: "2026-08-08", end_date: "2026-08-10" })).toBe(true);
  });

  it("does not overlap when merely adjacent", () => {
    // Postgres canonicalises [a, b] to [a, b+1), so the 13th abuts the
    // 12th without colliding. Splitting a month into two blackouts is
    // not an operator error.
    expect(rangesOverlap(base, { start_date: "2026-08-13", end_date: "2026-08-20" })).toBe(false);
    expect(rangesOverlap(base, { start_date: "2026-08-01", end_date: "2026-08-09" })).toBe(false);
  });

  it("overlaps on containment in either direction", () => {
    expect(rangesOverlap(base, { start_date: "2026-08-11", end_date: "2026-08-11" })).toBe(true);
    expect(rangesOverlap(base, { start_date: "2026-01-01", end_date: "2026-12-31" })).toBe(true);
  });
});

describe("availabilityConflict — the no-overlap constraint, pre-flighted", () => {
  it("rejects a second blackout overlapping the first", () => {
    // The acceptance criterion for 2A, and what 23P01 would say.
    const existing = row({ start_date: "2026-08-10", end_date: "2026-08-12" });
    const hit = availabilityConflict(
      {
        listing_id: LISTING_ID,
        kind: "blackout",
        start_date: "2026-08-12",
        end_date: "2026-08-14",
      },
      [existing],
    );
    expect(hit).toBe(existing);
  });

  it("rejects a second open override overlapping the first", () => {
    const existing = row({ id: "row-open", kind: "open" });
    expect(
      availabilityConflict(
        { listing_id: LISTING_ID, kind: "open", start_date: "2026-08-11", end_date: "2026-08-11" },
        [existing],
      ),
    ).toBe(existing);
  });

  it("ALLOWS an open override on top of a blackout — that pairing is the override", () => {
    // The EXCLUDE is scoped by kind precisely so this is representable.
    expect(
      availabilityConflict(
        { listing_id: LISTING_ID, kind: "open", start_date: "2026-08-11", end_date: "2026-08-11" },
        [row()],
      ),
    ).toBeNull();
  });

  it("is scoped per listing", () => {
    expect(
      availabilityConflict(
        {
          listing_id: OTHER_LISTING_ID,
          kind: "blackout",
          start_date: "2026-08-10",
          end_date: "2026-08-12",
        },
        [row()],
      ),
    ).toBeNull();
  });

  it("does not let a row conflict with itself on edit", () => {
    // An UPDATE is never checked against the row being updated; without
    // this every save of an existing blackout would report a collision.
    expect(
      availabilityConflict(
        {
          id: "row-1",
          listing_id: LISTING_ID,
          kind: "blackout",
          start_date: "2026-08-10",
          end_date: "2026-08-13",
        },
        [row()],
      ),
    ).toBeNull();
  });

  it("allows a flush adjacent blackout", () => {
    expect(
      availabilityConflict(
        {
          listing_id: LISTING_ID,
          kind: "blackout",
          start_date: "2026-08-13",
          end_date: "2026-08-20",
        },
        [row()],
      ),
    ).toBeNull();
  });
});

describe("operatingWindow", () => {
  it("defaults to open from today through the booking horizon", () => {
    const window = operatingWindow(listing(), TODAY);
    expect(window).toEqual({
      // One day of slack: Miami evenings are already tomorrow in UTC, and
      // validateRentalInquiry() grants the same day. The two must agree
      // or the calendar and the POST disagree about "today".
      start_date: addUtcDays(TODAY, -SAME_DAY_SLACK_DAYS),
      end_date: addUtcDays(TODAY, DEFAULT_BOOKING_HORIZON_DAYS),
    });
  });

  it("clips the start to a future available_from", () => {
    expect(operatingWindow(listing({ available_from: "2026-09-01" }), TODAY)?.start_date)
      .toBe("2026-09-01");
  });

  it("clips the end to available_until", () => {
    expect(operatingWindow(listing({ available_until: "2026-08-20" }), TODAY)?.end_date)
      .toBe("2026-08-20");
  });

  it("closes a listing whose season has already ended", () => {
    expect(operatingWindow(listing({ available_until: "2026-07-01" }), TODAY)).toBeNull();
  });

  it("closes a listing whose season starts beyond the horizon", () => {
    expect(
      operatingWindow(
        listing({ available_from: "2028-01-01", booking_horizon_days: 30 }),
        TODAY,
      ),
    ).toBeNull();
  });

  it("closes rather than opens when a bound will not parse", () => {
    // Fails closed. Ignoring an unparseable available_until would OPEN
    // days the operator deliberately closed.
    expect(operatingWindow(listing({ available_until: "not-a-date" }), TODAY)).toBeNull();
    expect(operatingWindow(listing({ available_from: "2026-02-31" }), TODAY)).toBeNull();
  });

  it("honours a short horizon", () => {
    expect(operatingWindow(listing({ booking_horizon_days: 7 }), TODAY)?.end_date)
      .toBe("2026-08-12");
  });
});

describe("selectableDays", () => {
  it("returns the whole window when the operator has said nothing", () => {
    // Absence of availability rows is OPEN, not closed — the default-open
    // posture 0046 documents.
    expect(selectableDays(shortWindow())).toEqual([
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
    ]);
  });

  it("spans the full horizon for a listing with no season set", () => {
    const days = selectableDays({ listing: listing(), today: TODAY });
    expect(days[0]).toBe(addUtcDays(TODAY, -SAME_DAY_SLACK_DAYS));
    expect(days[days.length - 1]).toBe(addUtcDays(TODAY, DEFAULT_BOOKING_HORIZON_DAYS));
    expect(days).toHaveLength(DEFAULT_BOOKING_HORIZON_DAYS + SAME_DAY_SLACK_DAYS + 1);
  });

  it("removes exactly the blacked-out days and nothing else", () => {
    // Phase 2A's acceptance check: an operator blackout removes those
    // days from the car's public calendar.
    const days = selectableDays(shortWindow({ rows: [row()] }));
    expect(days).not.toContain("2026-08-10");
    expect(days).not.toContain("2026-08-11");
    expect(days).not.toContain("2026-08-12");
    expect(days).toContain("2026-08-09");
    expect(days).toContain("2026-08-13");
    expect(days).toHaveLength(8);
  });

  it("restores days an open override carves out of a blackout", () => {
    const days = selectableDays(
      shortWindow({
        rows: [
          row(),
          row({ id: "row-open", kind: "open", start_date: "2026-08-11", end_date: "2026-08-11" }),
        ],
      }),
    );
    expect(days).toContain("2026-08-11");
    expect(days).not.toContain("2026-08-10");
    expect(days).not.toContain("2026-08-12");
  });

  it("lets a confirmed booking beat an open override", () => {
    // Precedence (d) in 0046: real money against a physical car. No
    // operator row un-blocks it.
    const days = selectableDays(
      shortWindow({
        rows: [row({ id: "row-open", kind: "open", start_date: "2026-08-01", end_date: "2026-08-31" })],
        booked: [{ start_date: "2026-08-08", end_date: "2026-08-09" }],
      }),
    );
    expect(days).not.toContain("2026-08-08");
    expect(days).not.toContain("2026-08-09");
    expect(days).toContain("2026-08-07");
    expect(days).toContain("2026-08-10");
  });

  it("does not let an open override reach past the season", () => {
    // Precedence (a): to rent outside the window, move the window.
    const days = selectableDays(
      shortWindow({
        rows: [row({ id: "row-open", kind: "open", start_date: "2026-08-01", end_date: "2026-09-30" })],
      }),
    );
    expect(days[days.length - 1]).toBe("2026-08-15");
  });

  it("returns nothing for a closed listing", () => {
    expect(
      selectableDays({ listing: listing({ available_until: "2026-01-01" }), today: TODAY }),
    ).toEqual([]);
  });

  it("ignores rows of an unknown kind rather than guessing", () => {
    // A value the CHECK constraint would have refused. It blocks nothing
    // and opens nothing.
    const rogue = { ...row(), kind: "sabbatical" } as unknown as RentalAvailabilityRow;
    expect(selectableDays(shortWindow({ rows: [rogue] }))).toHaveLength(11);
  });
});

describe("the 0047 seam — a booking blocks a day iff its status reserves", () => {
  // THE PROPERTY THIS FILE EXISTS TO PROTECT, stated once: the calendar
  // must hide exactly the days rental_bookings_no_overlap would refuse.
  // Hide fewer and the UI offers a date the INSERT rejects with 23P01,
  // after the renter has filled in the form. Hide more and a car sits
  // idle because a request nobody accepted is squatting on its week.
  //
  // The status list is NOT restated here. It is reached through
  // reservesRentalDates(), whose constant rental-booking-status.test.ts
  // checks against the WHERE clause in 0047 itself — so this suite is
  // the last link of a chain that starts at the migration text.
  const TRIP: DayRange = { start_date: "2026-08-08", end_date: "2026-08-09" };

  function daysWithBooking(status: RentalBookingStatus): string[] {
    return selectableDays(shortWindow({ booked: [{ ...TRIP, status }] }));
  }

  it.each(RENTAL_BOOKING_STATUSES)(
    "a '%s' booking hides its days exactly when it reserves them",
    (status) => {
      const days = daysWithBooking(status);
      const shouldBeHidden = reservesRentalDates(status);

      expect(days.includes("2026-08-08"), `${status} / 08-08`).toBe(
        !shouldBeHidden,
      );
      expect(days.includes("2026-08-09"), `${status} / 08-09`).toBe(
        !shouldBeHidden,
      );
      // Never more than the trip's own days, whichever way it fell.
      expect(days).toContain("2026-08-07");
      expect(days).toContain("2026-08-10");
    },
  );

  it("does not hide a week that is merely REQUESTED (D3)", () => {
    // Request-to-book: several renters may be asking for the same dates
    // and the operator picks. A calendar that greys them out on the
    // first click silently locks out every competing renter — and every
    // expired request would strand the car until a sweep ran.
    expect(daysWithBooking("requested")).toContain("2026-08-08");
    expect(checkRange("2026-08-08", "2026-08-09", shortWindow({
      booked: [{ ...TRIP, status: "requested" }],
    }))).toEqual({ ok: true, nights: 1 });
  });

  it("hides a confirmed week from both the day list and checkRange", () => {
    expect(daysWithBooking("confirmed")).not.toContain("2026-08-08");
    expect(checkRange("2026-08-08", "2026-08-09", shortWindow({
      booked: [{ ...TRIP, status: "confirmed" }],
    }))).toEqual({ ok: false, reason: "unavailable" });
  });

  it("frees the dates again once the booking is cancelled or declined", () => {
    // Releasing the dates IS what those statuses mean (0047 §3).
    for (const status of ["cancelled", "declined", "expired", "completed"] as const) {
      expect(daysWithBooking(status), status).toContain("2026-08-08");
    }
  });

  it("treats a range with NO status as already filtered, and blocks it", () => {
    // A caller that narrowed in the query (`.in("status", …)`) passes
    // bare ranges; those must still block. This is also the shape every
    // pre-seam test in this file uses.
    const days = selectableDays(shortWindow({ booked: [TRIP] }));
    expect(days).not.toContain("2026-08-08");
    expect(days).not.toContain("2026-08-09");
  });

  it("blocks a status it does not recognise rather than opening the day", () => {
    // A value from a newer migration than this build knows about — say
    // 0047's rejected 'paid'. Rule 3: a wrongly-closed day is a lost
    // request; a wrongly-open day is two renters at one car.
    const rogue = { ...TRIP, status: "paid" } as unknown as BookedRange;
    expect(selectableDays(shortWindow({ booked: [rogue] }))).not.toContain(
      "2026-08-08",
    );
  });

  it("keeps the reserving rows and drops the rest", () => {
    const rows: BookedRange[] = RENTAL_BOOKING_STATUSES.map((status) => ({
      start_date: "2026-08-08",
      end_date: "2026-08-09",
      status,
    }));
    expect(reservingRanges(rows)).toHaveLength(
      RENTAL_BOOKING_RESERVING_STATUSES.length,
    );
  });

  it("re-exports one list, not a second copy of it", () => {
    // Both directions, so neither a dropped nor an extra member slips
    // past: the re-export and reservesRentalDates() must describe the
    // same set, and that set is the migration's.
    for (const status of RENTAL_BOOKING_RESERVING_STATUSES) {
      expect(reservesRentalDates(status), status).toBe(true);
    }
    for (const status of RENTAL_BOOKING_STATUSES) {
      expect(
        (RENTAL_BOOKING_RESERVING_STATUSES as readonly string[]).includes(status),
        status,
      ).toBe(reservesRentalDates(status));
    }
  });

  it("still counts the turnaround day, whatever the status", () => {
    // The '[]' bound and the status filter are independent rules; a
    // confirmed booking returning on the 9th occupies the 9th.
    const booked = shortWindow({
      booked: [{ start_date: "2026-08-06", end_date: "2026-08-09", status: "in_progress" }],
    });
    expect(checkRange("2026-08-09", "2026-08-11", booked)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(checkRange("2026-08-10", "2026-08-11", booked)).toEqual({
      ok: true,
      nights: 1,
    });
  });
});

describe("isDayOpen", () => {
  it("agrees with selectableDays day for day", () => {
    const input = shortWindow({
      rows: [row()],
      booked: [{ start_date: "2026-08-06", end_date: "2026-08-07" }],
    });
    const days = selectableDays(input);
    for (const day of expandDays({ start_date: "2026-08-05", end_date: "2026-08-15" })) {
      expect(isDayOpen(day, input)).toBe(days.includes(day));
    }
  });
});

describe("checkRange", () => {
  it("accepts a clean three-night range and returns the billable nights", () => {
    expect(checkRange("2026-08-06", "2026-08-09", shortWindow())).toEqual({
      ok: true,
      nights: 3,
    });
  });

  it("rejects a same-day request as too short, not as zero nights", () => {
    expect(checkRange("2026-08-06", "2026-08-06", shortWindow())).toEqual({
      ok: false,
      reason: "too_short",
    });
  });

  it("rejects a stay longer than the car's max_nights", () => {
    const input: AvailabilityInput = {
      listing: listing({ max_nights: 3 }),
      today: TODAY,
    };
    expect(checkRange("2026-08-06", "2026-08-10", input)).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("rejects a range that leaves the operating window", () => {
    expect(checkRange("2026-08-14", "2026-08-18", shortWindow())).toEqual({
      ok: false,
      reason: "outside_window",
    });
  });

  it("rejects a range that touches a blackout", () => {
    expect(checkRange("2026-08-09", "2026-08-11", shortWindow({ rows: [row()] }))).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("counts the return day as occupied, so a stay ending inside a blackout is rejected", () => {
    // Inclusive ends: the 10th is blacked out, so a stay returning on the
    // 10th still occupies it. This is 0021's '[]' rule, and it is why a
    // renter cannot be handed the car on a day it is not free.
    expect(checkRange("2026-08-08", "2026-08-10", shortWindow({ rows: [row()] }))).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(checkRange("2026-08-08", "2026-08-09", shortWindow({ rows: [row()] }))).toEqual({
      ok: true,
      nights: 1,
    });
  });

  it("blocks a pickup on another booking's return day", () => {
    // The turnaround trap. A booking of the 5th → the 8th occupies the
    // 8th, so the next renter starts on the 9th at the earliest —
    // exactly what the EXCLUDE on rental_bookings will enforce.
    const booked = shortWindow({ booked: [{ start_date: "2026-08-05", end_date: "2026-08-08" }] });
    expect(checkRange("2026-08-08", "2026-08-10", booked)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(checkRange("2026-08-09", "2026-08-11", booked)).toEqual({
      ok: true,
      nights: 2,
    });
  });

  it("reports an unparseable date before anything else", () => {
    // Precedence is fixed so callers can map a reason to copy:
    // invalid_dates → outside_window → too_short → too_long → unavailable.
    expect(checkRange("2026-02-31", "2026-08-09", shortWindow())).toEqual({
      ok: false,
      reason: "invalid_dates",
    });
    expect(checkRange("2026-08-09", "2026-08-06", shortWindow())).toEqual({
      ok: false,
      reason: "invalid_dates",
    });
  });

  it("prefers outside_window over a length complaint when both are true", () => {
    const input: AvailabilityInput = {
      listing: listing({ available_until: "2026-08-15", max_nights: 2 }),
      today: TODAY,
    };
    expect(checkRange("2026-08-14", "2026-08-25", input)).toEqual({
      ok: false,
      reason: "outside_window",
    });
  });
});

describe("select-list constants", () => {
  it("RENTAL_AVAILABILITY_COLS selects exactly the keys of RentalAvailabilityRow", () => {
    // There is no generated Database type in this repo, so a typo inside
    // a .select() string is not a compile error. This is the check that
    // catches it.
    const selected = RENTAL_AVAILABILITY_COLS.split(",").map((c) => c.trim());
    expect([...selected].sort()).toEqual(Object.keys(row()).sort());
  });

  it("RENTAL_OPERATING_WINDOW_COLS selects exactly the 0046 columns", () => {
    const sample: RentalOperatingWindowRow = {
      available_from: null,
      available_until: null,
      booking_horizon_days: DEFAULT_BOOKING_HORIZON_DAYS,
    };
    const selected = RENTAL_OPERATING_WINDOW_COLS.split(",").map((c) => c.trim());
    expect([...selected].sort()).toEqual(Object.keys(sample).sort());
  });

  it("RENTAL_AVAILABILITY_KINDS matches the CHECK constraint in 0046", () => {
    expect([...RENTAL_AVAILABILITY_KINDS]).toEqual(["blackout", "open"]);
  });
});
