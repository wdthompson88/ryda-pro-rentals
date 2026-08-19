// Tests for the server-side rental quote (build loop 2C).
//
// Four things here fail silently and plausibly, so each gets its own
// block:
//
//   * DST. daily rate x nights is only as good as `nights`, and local-time
//     day math loses an hour every March and gains one every November —
//     the bug the inquiry form still carries a comment about. THE WHOLE
//     FILE RUNS IN A DST-OBSERVING ZONE so a regression to local-time
//     math bills the wrong number of nights HERE rather than twice a year
//     in production.
//   * The fee split. A quote that computes RYDA's cut itself instead of
//     asking computeRentalFee is the exact $1,500-vs-5% divergence
//     fees.ts exists to prevent, and it is invisible until an admin
//     preview and a charge disagree. Asserted against fees.ts directly
//     AND against the CHECK constraint 0047 will apply to the row.
//   * Pricing a range the calendar would refuse. A number shown for days
//     that are blacked out or already held is a promise the INSERT then
//     breaks with 23P01.
//   * UI/server drift. checkOpenRange() is what the calendar greys days
//     out with; checkRange() is what the server refuses with. If they
//     ever disagree, a renter clicks a day the API then rejects (or is
//     denied one nobody has taken). The agreement matrix below is the
//     guard, and it is exhaustive over a small window rather than
//     illustrative.

import { describe, it, expect, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { computeRentalFee, RENTAL_COMMISSION_RATE_DEFAULT } from "../fees";
import {
  DEFAULT_BOOKING_HORIZON_DAYS,
  addUtcDays,
  checkRange,
  expandDays,
  operatingWindow,
  selectableDays,
  type AvailabilityInput,
  type BookedRange,
  type RangeRejection,
  type RentalAvailabilityRow,
} from "../rental-availability";
import {

  RENTAL_QUOTE_CURRENCY,
  canStartStay,
  checkOpenRange,
  firstBookableRange,
  quoteRentalBooking,
  renterFacingQuote,
  rentalQuoteMessage,
  type OpenDayRangeInput,
  type RentalQuoteInput,
  type RentalQuoteListing,
  type RentalQuoteRejection,
} from "../rental-quote";

// Run everything in a zone that observes DST. If the implementation ever
// reaches for a local-time accessor, the March and November cases below
// break immediately instead of once the clocks change.
const ORIGINAL_TZ = process.env.TZ;
process.env.TZ = "America/New_York";
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const LISTING_ID = "55555555-5555-4555-8555-555555555555";
const TODAY = "2026-08-05";
const DAILY_RATE_CENTS = 110_500; // the $1,105/day Huracán from 0044's header

function listing(
  overrides: Partial<RentalQuoteListing> = {},
): RentalQuoteListing {
  return {
    available_from: null,
    available_until: null,
    booking_horizon_days: DEFAULT_BOOKING_HORIZON_DAYS,
    min_nights: 1,
    max_nights: 30,
    daily_rate_cents: DAILY_RATE_CENTS,
    ...overrides,
  };
}

function row(overrides: Partial<RentalAvailabilityRow> = {}): RentalAvailabilityRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    listing_id: LISTING_ID,
    kind: "blackout",
    start_date: "2026-08-20",
    end_date: "2026-08-22",
    reason: "maintenance",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function quote(overrides: Partial<RentalQuoteInput> = {}) {
  return quoteRentalBooking({
    listing: listing(),
    startDate: "2026-08-10",
    endDate: "2026-08-13",
    today: TODAY,
    ...overrides,
  });
}

// ── the arithmetic ──────────────────────────────────────────────────

describe("quoteRentalBooking — base", () => {
  it("bills NIGHTS, not days: the 10th to the 13th is three", () => {
    const res = quote();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quote.nights).toBe(3);
    expect(res.quote.baseAmountCents).toBe(DAILY_RATE_CENTS * 3);
    // Four calendar days are occupied even though three are billed.
    expect(expandDays({ start_date: "2026-08-10", end_date: "2026-08-13" })).toHaveLength(4);
  });

  it("carries the rate it priced with, so a receipt can be re-derived", () => {
    const res = quote();
    expect(res.ok && res.quote.dailyRateCents).toBe(DAILY_RATE_CENTS);
  });

  it("refuses a zero-night stay (0047 requires end_date > start_date)", () => {
    const res = quote({ startDate: "2026-08-10", endDate: "2026-08-10", listing: listing({ min_nights: 1 }) });
    expect(res).toEqual({ ok: false, reason: "too_short" });
  });

  it("refuses an inverted range", () => {
    const res = quote({ startDate: "2026-08-13", endDate: "2026-08-10" });
    expect(res).toEqual({ ok: false, reason: "invalid_dates" });
  });

  it("refuses a date that does not exist", () => {
    const res = quote({ startDate: "2026-02-30", endDate: "2026-03-02" });
    expect(res).toEqual({ ok: false, reason: "invalid_dates" });
  });
});

describe("quoteRentalBooking — DST", () => {
  // 2026 US transitions: forward Mar 8, back Nov 1. In America/New_York
  // a local-time span across either is 23 or 25 hours, so a naive
  // (end - start) / 86_400_000 yields 2.958 or 3.042 nights.
  it("bills 3 nights across the spring-forward weekend", () => {
    const res = quote({
      startDate: "2026-03-06",
      endDate: "2026-03-09",
      today: "2026-03-01",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quote.nights).toBe(3);
    expect(res.quote.baseAmountCents).toBe(DAILY_RATE_CENTS * 3);
  });

  it("bills 3 nights across the fall-back weekend", () => {
    const res = quote({
      startDate: "2026-10-30",
      endDate: "2026-11-02",
      today: "2026-10-01",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quote.nights).toBe(3);
    expect(res.quote.baseAmountCents).toBe(DAILY_RATE_CENTS * 3);
  });

  it("prices an exactly-30-night stay that spans a transition", () => {
    // A local-time span would come to 29.958 and trip max_nights.
    const res = quote({
      startDate: "2026-10-20",
      endDate: "2026-11-19",
      today: "2026-10-01",
      listing: listing({ max_nights: 30 }),
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quote.nights).toBe(30);
  });
});

// ── the fee split ───────────────────────────────────────────────────

describe("quoteRentalBooking — fees come from fees.ts", () => {
  it("matches computeRentalFee to the cent at the default rate", () => {
    const res = quote();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const expected = computeRentalFee(res.quote.baseAmountCents);
    expect(res.quote.feeCents).toBe(expected.applicationFeeCents);
    expect(res.quote.operatorNetCents).toBe(expected.operatorNetCents);
    expect(res.quote.renterTotalCents).toBe(expected.amountCents);
  });

  it("honours a per-operator commission rate", () => {
    const res = quote({ feeConfig: { rate: 0.2 } });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const base = DAILY_RATE_CENTS * 3;
    expect(res.quote.feeCents).toBe(Math.round(base * 0.2));
    expect(res.quote.operatorNetCents).toBe(base - Math.round(base * 0.2));
  });

  it("uses fees.ts's default when no rate is supplied", () => {
    const res = quote();
    expect(res.ok && res.quote.feeCents).toBe(
      Math.round(DAILY_RATE_CENTS * 3 * RENTAL_COMMISSION_RATE_DEFAULT),
    );
  });

  it("rejects an out-of-contract rate instead of clamping or throwing", () => {
    expect(quote({ feeConfig: { rate: 0.9 } })).toEqual({
      ok: false,
      reason: "invalid_fee_config",
    });
    expect(quote({ feeConfig: { rate: -0.1 } })).toEqual({
      ok: false,
      reason: "invalid_fee_config",
    });
    expect(quote({ feeConfig: { rate: Number.NaN } })).toEqual({
      ok: false,
      reason: "invalid_fee_config",
    });
  });

  it("satisfies rental_bookings_quote_consistent for fee_payer = operator", () => {
    for (const rate of [0, 0.05, 0.15, 0.3, 0.5]) {
      for (const nights of [1, 2, 7, 30]) {
        const res = quote({
          feeConfig: { rate },
          startDate: "2026-08-10",
          endDate: addUtcDays("2026-08-10", nights)!,
        });
        expect(res.ok).toBe(true);
        if (!res.ok) continue;
        const q = res.quote;
        // The exact CHECK from 0047, in TypeScript:
        //   operator → renter_total = base and operator_net = base - fee
        expect(q.feePayer).toBe("operator");
        expect(q.renterTotalCents).toBe(q.baseAmountCents);
        expect(q.operatorNetCents).toBe(q.baseAmountCents - q.feeCents);
        // ...and the column CHECKs that sit beside it.
        expect(q.baseAmountCents).toBeGreaterThan(0);
        expect(q.feeCents).toBeGreaterThanOrEqual(0);
        expect(q.renterTotalCents).toBeGreaterThan(0);
        expect(q.operatorNetCents).toBeGreaterThanOrEqual(0);
        expect(q.depositAmountCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // ── fee_payer = 'renter' (D2, 0048) ───────────────────────────────
  //
  // The half this module could not express before 0048. Until the fee
  // config replaced a bare commissionRate, every quote was priced as
  // operator-pays regardless of the operator's actual terms — so a
  // renter-pays operator's fee was silently deducted from their payout
  // instead of added to the renter's card, and the admin preview and the
  // frozen snapshot disagreed about the same booking.

  it("adds the fee ON TOP for a renter-pays operator", () => {
    const res = quote({ feeConfig: { payer: "renter", rate: 0.2 } });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const base = DAILY_RATE_CENTS * 3;
    const fee = Math.round(base * 0.2);
    expect(res.quote.feePayer).toBe("renter");
    expect(res.quote.baseAmountCents).toBe(base);
    expect(res.quote.feeCents).toBe(fee);
    // The renter pays base + fee; the operator keeps the whole base.
    expect(res.quote.renterTotalCents).toBe(base + fee);
    expect(res.quote.operatorNetCents).toBe(base);
  });

  it("satisfies rental_bookings_quote_consistent for fee_payer = renter", () => {
    for (const rate of [0, 0.05, 0.15, 0.3, 0.5]) {
      for (const nights of [1, 2, 7, 30]) {
        const res = quote({
          feeConfig: { payer: "renter", rate },
          startDate: "2026-08-10",
          endDate: addUtcDays("2026-08-10", nights)!,
        });
        expect(res.ok).toBe(true);
        if (!res.ok) continue;
        const q = res.quote;
        // The other branch of 0047's CHECK:
        //   renter → renter_total = base + fee and operator_net = base
        expect(q.feePayer).toBe("renter");
        expect(q.renterTotalCents).toBe(q.baseAmountCents + q.feeCents);
        expect(q.operatorNetCents).toBe(q.baseAmountCents);
        expect(q.renterTotalCents).toBeGreaterThan(0);
        expect(q.operatorNetCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("prices a flat fee, under either payer", () => {
    const flat = 7_500;
    const base = DAILY_RATE_CENTS * 3;

    const operatorPays = quote({
      feeConfig: { mode: "flat", flatCents: flat, payer: "operator" },
    });
    expect(operatorPays.ok).toBe(true);
    if (operatorPays.ok) {
      expect(operatorPays.quote.feeCents).toBe(flat);
      expect(operatorPays.quote.renterTotalCents).toBe(base);
      expect(operatorPays.quote.operatorNetCents).toBe(base - flat);
    }

    const renterPays = quote({
      feeConfig: { mode: "flat", flatCents: flat, payer: "renter" },
    });
    expect(renterPays.ok).toBe(true);
    if (renterPays.ok) {
      expect(renterPays.quote.feeCents).toBe(flat);
      expect(renterPays.quote.renterTotalCents).toBe(base + flat);
      expect(renterPays.quote.operatorNetCents).toBe(base);
    }
  });

  it("honours a floor and a cap", () => {
    const base = DAILY_RATE_CENTS * 3;

    const floored = quote({ feeConfig: { rate: 0, floorCents: 5_000 } });
    expect(floored.ok && floored.quote.feeCents).toBe(5_000);

    const capped = quote({ feeConfig: { rate: 0.5, capCents: 1_000 } });
    expect(capped.ok && capped.quote.feeCents).toBe(1_000);
    // A cap still leaves the operator whole-minus-fee, not whole-minus-raw.
    expect(capped.ok && capped.quote.operatorNetCents).toBe(base - 1_000);
  });

  it("never lets a fee exceed the base under operator-pays", () => {
    // operator_net_cents >= 0 is a 0047 column CHECK, so a floor larger
    // than the whole rental must not produce a negative payout row.
    const base = DAILY_RATE_CENTS * 3;
    const res = quote({
      feeConfig: { rate: 0, floorCents: base * 2, payer: "operator" },
    });
    if (res.ok) {
      expect(res.quote.operatorNetCents).toBeGreaterThanOrEqual(0);
    } else {
      expect(res.reason).toBe("invalid_fee_config");
    }
  });

  it("carries a deposit without adding it to the renter total (D5)", () => {
    const res = quote({ depositAmountCents: 200_000 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.quote.depositAmountCents).toBe(200_000);
    // A hold is authorized, not charged — adding it to the total would
    // double-charge the renter on the receipt (0047's column comment).
    expect(res.quote.renterTotalCents).toBe(res.quote.baseAmountCents);
  });

  it("rejects an unusable listing rather than pricing it", () => {
    expect(quote({ listing: listing({ daily_rate_cents: 0 }) })).toEqual({
      ok: false,
      reason: "invalid_listing",
    });
    expect(quote({ listing: listing({ daily_rate_cents: -1 }) })).toEqual({
      ok: false,
      reason: "invalid_listing",
    });
    expect(quote({ listing: listing({ daily_rate_cents: 1105.5 }) })).toEqual({
      ok: false,
      reason: "invalid_listing",
    });
    expect(quote({ depositAmountCents: -1 })).toEqual({
      ok: false,
      reason: "invalid_listing",
    });
  });
});

// ── the calendar gate ───────────────────────────────────────────────

describe("quoteRentalBooking — never prices what the calendar refuses", () => {
  it("refuses a range covering a blackout", () => {
    const res = quote({
      startDate: "2026-08-19",
      endDate: "2026-08-21",
      rows: [row()],
    });
    expect(res).toEqual({ ok: false, reason: "unavailable" });
  });

  it("prices a blackout that an open override re-opens", () => {
    const res = quote({
      startDate: "2026-08-19",
      endDate: "2026-08-21",
      rows: [
        row(),
        row({
          id: "22222222-2222-4222-8222-222222222222",
          kind: "open",
          start_date: "2026-08-20",
          end_date: "2026-08-22",
        }),
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("refuses days held by a confirmed booking", () => {
    const booked: BookedRange[] = [
      { start_date: "2026-08-11", end_date: "2026-08-12", status: "confirmed" },
    ];
    expect(quote({ booked })).toEqual({ ok: false, reason: "unavailable" });
  });

  it("STILL prices days a merely requested booking is asking for (D3)", () => {
    const booked: BookedRange[] = [
      { start_date: "2026-08-11", end_date: "2026-08-12", status: "requested" },
    ];
    // 'requested' is absent from rental_bookings_no_overlap on purpose:
    // several renters may be asking for the same week and the operator
    // picks. A calendar that hid those days would make request-to-book
    // first-click-wins.
    expect(quote({ booked }).ok).toBe(true);
  });

  it("refuses dates outside the operator's window", () => {
    const res = quote({
      listing: listing({ available_until: "2026-08-12" }),
      startDate: "2026-08-10",
      endDate: "2026-08-13",
    });
    expect(res).toEqual({ ok: false, reason: "outside_window" });
  });

  it("refuses a stay under min_nights and over max_nights", () => {
    expect(
      quote({
        listing: listing({ min_nights: 3 }),
        startDate: "2026-08-10",
        endDate: "2026-08-12",
      }),
    ).toEqual({ ok: false, reason: "too_short" });
    expect(
      quote({
        listing: listing({ max_nights: 2 }),
        startDate: "2026-08-10",
        endDate: "2026-08-13",
      }),
    ).toEqual({ ok: false, reason: "too_long" });
  });
});

// ── what may cross the wire ─────────────────────────────────────────

describe("renterFacingQuote", () => {
  it("withholds the commission columns 0047 withholds", () => {
    const res = quote();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const publicQuote = renterFacingQuote(res.quote);
    const keys = Object.keys(publicQuote);
    expect(keys).not.toContain("feeCents");
    expect(keys).not.toContain("operatorNetCents");
    // Serialized shape, not just the type: a JSON round trip is what the
    // browser actually receives.
    const wire = JSON.parse(JSON.stringify(publicQuote));
    expect(Object.keys(wire).sort()).toEqual(
      [
        "baseAmountCents",
        "currency",
        "dailyRateCents",
        "depositAmountCents",
        "endDate",
        "feePayer",
        "nights",
        "renterTotalCents",
        "startDate",
      ].sort(),
    );
  });

  it("still tells the renter what they pay", () => {
    const res = quote();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(renterFacingQuote(res.quote).renterTotalCents).toBe(
      res.quote.renterTotalCents,
    );
  });
});

// ── the UI/server agreement ─────────────────────────────────────────

describe("checkOpenRange agrees with checkRange", () => {
  // A deliberately awkward listing: a short window with a blackout, an
  // open override inside it, a confirmed booking and a requested one.
  const input: AvailabilityInput & { listing: RentalQuoteListing } = {
    listing: listing({
      available_from: "2026-08-10",
      available_until: "2026-08-25",
      min_nights: 2,
      max_nights: 5,
    }),
    rows: [
      row({ start_date: "2026-08-14", end_date: "2026-08-17" }),
      row({
        id: "22222222-2222-4222-8222-222222222222",
        kind: "open",
        start_date: "2026-08-16",
        end_date: "2026-08-16",
      }),
    ],
    booked: [
      { start_date: "2026-08-21", end_date: "2026-08-22", status: "confirmed" },
      { start_date: "2026-08-12", end_date: "2026-08-13", status: "requested" },
    ],
    today: TODAY,
  };

  const window = operatingWindow(input.listing, TODAY);
  const openDays = selectableDays(input);
  const uiInput: OpenDayRangeInput = {
    openDays,
    minNights: input.listing.min_nights,
    maxNights: input.listing.max_nights,
    window,
  };

  it("agrees on every range in and around the window", () => {
    const probe: string[] = [];
    for (let i = 0; i < 28; i += 1) probe.push(addUtcDays("2026-08-06", i)!);

    let agreements = 0;
    let rejections = 0;
    for (const start of probe) {
      for (const end of probe) {
        const server = checkRange(start, end, input);
        const ui = checkOpenRange(start, end, uiInput);
        expect({ start, end, ...ui }).toEqual({ start, end, ...server });
        agreements += 1;
        if (!server.ok) rejections += 1;
      }
    }
    // Guard against a vacuous pass: the matrix must actually exercise
    // both outcomes.
    expect(agreements).toBe(probe.length * probe.length);
    expect(rejections).toBeGreaterThan(0);
    expect(rejections).toBeLessThan(agreements);
  });

  it("reports outside_window as unavailable when no window is supplied", () => {
    const withoutWindow: OpenDayRangeInput = { ...uiInput, window: undefined };
    // 2026-08-08 is before available_from, so it is simply not in the set.
    expect(checkOpenRange("2026-08-08", "2026-08-10", withoutWindow)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("rejects an absurd span instead of throwing", () => {
    // expandDays() THROWS past MAX_EXPAND_DAYS rather than truncating, so
    // the night ceiling has to be applied before anything is expanded —
    // a five-year range typed into a URL is a rejection, not a RangeError.
    // Both with a window (which catches it first, exactly as checkRange
    // does) and without one (where the ceiling is the only guard).
    expect(checkOpenRange("2026-08-10", "2031-08-10", uiInput)).toEqual({
      ok: false,
      reason: "outside_window",
    });
    const withoutWindow: OpenDayRangeInput = { ...uiInput, window: undefined };
    expect(() =>
      checkOpenRange("2026-08-10", "2031-08-10", withoutWindow),
    ).not.toThrow();
    expect(checkOpenRange("2026-08-10", "2031-08-10", withoutWindow)).toEqual({
      ok: false,
      reason: "too_long",
    });
  });
});

describe("canStartStay / firstBookableRange", () => {
  const openDays = [
    // A two-day island, then a longer run.
    "2026-09-01",
    "2026-09-02",
    "2026-09-10",
    "2026-09-11",
    "2026-09-12",
    "2026-09-13",
  ];

  it("greys out a day that cannot fit the minimum stay", () => {
    const two: OpenDayRangeInput = { openDays, minNights: 2, maxNights: 5 };
    // Sep 1 → Sep 3 needs the 3rd, which is closed.
    expect(canStartStay("2026-09-01", two)).toBe(false);
    expect(canStartStay("2026-09-10", two)).toBe(true);
    // The last day of a run can never start a stay.
    expect(canStartStay("2026-09-13", two)).toBe(false);
  });

  it("allows a one-night stay on the first day of the island", () => {
    const one: OpenDayRangeInput = { openDays, minNights: 1, maxNights: 5 };
    expect(canStartStay("2026-09-01", one)).toBe(true);
    expect(canStartStay("2026-09-02", one)).toBe(false);
  });

  it("seeds the earliest bookable range at or after the preferred day", () => {
    const two: OpenDayRangeInput = { openDays, minNights: 2, maxNights: 5 };
    expect(firstBookableRange(two)).toEqual({
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    });
    expect(firstBookableRange(two, "2026-09-11")).toEqual({
      startDate: "2026-09-11",
      endDate: "2026-09-13",
    });
    // Preferred day past everything bookable → fall back to the earliest.
    expect(firstBookableRange(two, "2026-12-01")).toEqual({
      startDate: "2026-09-10",
      endDate: "2026-09-12",
    });
  });

  it("returns null when nothing in the set can start a legal stay", () => {
    expect(
      firstBookableRange({ openDays: ["2026-09-01"], minNights: 1, maxNights: 5 }),
    ).toBeNull();
    expect(
      firstBookableRange({ openDays: [], minNights: 1, maxNights: 5 }),
    ).toBeNull();
  });
});

// ── copy ────────────────────────────────────────────────────────────

describe("rentalQuoteMessage", () => {
  const REASONS: RentalQuoteRejection[] = [
    "invalid_dates",
    "outside_window",
    "too_short",
    "too_long",
    "unavailable",
    "invalid_listing",
    "invalid_fee_config",
  ];

  it("has a sentence for every rejection", () => {
    for (const reason of REASONS) {
      const msg = rentalQuoteMessage(reason, { minNights: 2, maxNights: 14 });
      expect(msg.length).toBeGreaterThan(10);
      expect(msg.trim()).toBe(msg);
    }
  });

  it("names the bound when it knows it, and stays grammatical at 1", () => {
    expect(rentalQuoteMessage("too_short", { minNights: 1 })).toContain("1 night");
    expect(rentalQuoteMessage("too_short", { minNights: 1 })).not.toContain("1 nights");
    expect(rentalQuoteMessage("too_short", { minNights: 3 })).toContain("3 nights");
    expect(rentalQuoteMessage("too_long", { maxNights: 14 })).toContain("14 nights");
  });

  it("never says WHY a day is closed (another renter's booking is not public)", () => {
    const msg = rentalQuoteMessage("unavailable").toLowerCase();
    expect(msg).not.toContain("booked");
    expect(msg).not.toContain("blackout");
    expect(msg).not.toContain("operator");
  });

  it("covers every RangeRejection rental-availability can produce", () => {
    // Compile-time exhaustiveness is enforced by the switch; this is the
    // runtime half — a rejection added to RangeRejection without a
    // sentence here would return undefined.
    const fromAvailability: RangeRejection[] = [
      "invalid_dates",
      "outside_window",
      "too_short",
      "too_long",
      "unavailable",
    ];
    for (const reason of fromAvailability) {
      expect(typeof rentalQuoteMessage(reason)).toBe("string");
    }
  });
});

// ── the migration seam ──────────────────────────────────────────────

describe("0047 agreement", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    path.join(here, "../../../supabase/migrations/0047_rental_bookings.sql"),
    "utf8",
  );

  it("prices in the currency the column defaults to", () => {
    const match = sql.match(/currency\s+text not null default '([a-z]+)'/i);
    expect(match?.[1]).toBe(RENTAL_QUOTE_CURRENCY);
  });

  it("uses a fee_payer the CHECK constraint accepts", () => {
    const match = sql.match(/check\s*\(fee_payer in \(([^)]*)\)\)/i);
    expect(match).not.toBeNull();
    const allowed = (match?.[1] ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""));
    // Both payers are now quotable — RENTAL_FEE_PAYER_CURRENT is gone
    // and the payer comes from the operator's 0048 row.
    expect(allowed).toContain("operator");
    expect(allowed).toContain("renter");
    // The union in rental-quote.ts must be exactly the column's domain —
    // a value added in SQL without one here silently becomes unquotable.
    expect(allowed.sort()).toEqual(["operator", "renter"]);
  });
});
