// Rental quote — what a set of dates COSTS, decided on the server
// (build loop 2C).
//
// rental-availability.ts answers "may this renter have these days".
// This module answers "and what is the number", and it is the only
// place the two questions are asked together: a price for dates the
// calendar would refuse is a price for a booking that cannot exist, so
// quoteRentalBooking() runs checkRange() FIRST and prices nothing it
// rejects.
//
// Four rules it exists to hold in one place:
//
//   1. THE CLIENT IS NEVER TRUSTED WITH A PRICE. The browser sends
//      dates; the server sends back cents. Nothing in the request body
//      contributes to the arithmetic — not the daily rate the card was
//      rendered with, not a total, not a discount. The frozen quote
//      snapshot on rental_bookings (0047) is what a card is charged
//      against, and this function is what fills it.
//
//   2. FEE MATH LIVES IN fees.ts. Base = daily rate x billable nights
//      happens here because it is the calendar's arithmetic; everything
//      after it — RYDA's cut, the operator's net — is computeRentalFee's
//      and is not restated, not re-rounded, and not second-guessed. The
//      [0, 0.5] commission contract is likewise fees.ts's to own: an
//      out-of-contract rate is caught by CATCHING ITS THROW rather than
//      by copying the bound here, because a copied bound is a bound that
//      drifts (3A widens it).
//
//   3. NIGHTS COME FROM rental-availability.ts. nightsBetween() is the
//      single expression of "the 5th to the 8th is three nights", and it
//      is UTC-anchored for the reason that file's header records — the
//      inquiry form already shipped this bug once. checkRange() returns
//      the figure; this module multiplies it and never recomputes it.
//
//   4. THE RENTER DOES NOT SEE THE COMMISSION. quoteRentalBooking()
//      returns the whole snapshot because a booking row needs all of it;
//      renterFacingQuote() is the projection that may cross the wire,
//      and it withholds exactly the columns 0047's `grant select (...)`
//      block withholds — fee_cents and operator_net_cents, which
//      together ARE the operator's commission (guardrail 3.7).
//
// WHY THE CLIENT-SIDE PIECES ARE ALSO HERE. checkOpenRange() and
// firstBookableRange() work over a pre-computed set of open days — the
// exact array selectableDays() produces and the availability route
// returns — so the calendar UI can decide selectability without a round
// trip per candidate range, using the same precedence and the same
// RangeRejection vocabulary as the server. They live beside the quote
// rather than in their own module because the pairing is the point: the
// UI check and the priced check must reject the same ranges for the same
// stated reason, and its test asserts they do. This module imports no
// Supabase client and no `server-only`, so a client component can import
// it.

import { computeRentalFee, type RentalFeeConfig } from "./fees";
import {
  addUtcDays,
  checkRange,
  expandDays,
  nightsBetween,
  type BookedRange,
  type DayRange,
  type RangeCheck,
  type RangeRejection,
  type RentalAvailabilityRow,
  type RentalListingAvailability,
} from "./rental-availability";

/** Matches rental_bookings.currency's default (0047). */
export const RENTAL_QUOTE_CURRENCY = "usd";

/**
 * Who RYDA's booking fee lands on — rental_bookings.fee_payer (0047,
 * decision D2). 'renter' adds it on top of the base; 'operator' deducts
 * it from the payout.
 */
export type RentalFeePayer = "renter" | "operator";

// RENTAL_FEE_PAYER_CURRENT is gone. It pinned every quote to
// fee_payer = 'operator' and its own note said "'renter' becomes
// representable when 3A generalises computeRentalFee to a config
// object" — 3A has landed (0048), so the payer now comes from the
// operator's row via computeRentalFee's resolved config, and a constant
// asserting one payer would be a second, wrong answer to a question the
// engine already answers.
//
// The refusal it recorded still stands, and is why nothing in this file
// writes `base + fee`: that arithmetic belongs to the fee engine, and
// spelling it out here would put decision D2 in two places.

/** Everything a quote needs from the listing: the calendar plus the price. */
export type RentalQuoteListing = RentalListingAvailability & {
  /** rental_listings.daily_rate_cents (0044) — cents, always. */
  daily_rate_cents: number;
};

/**
 * The frozen quote snapshot, in the shape 0047 stores. Field-for-field
 * with rental_bookings' money columns so 2D's request route can write it
 * without a translation step that could reorder a pair.
 */
export type RentalQuote = {
  startDate: string;
  endDate: string;
  /** Billable nights — end - start, NOT the number of days occupied. */
  nights: number;
  dailyRateCents: number;
  baseAmountCents: number;
  feeCents: number;
  feePayer: RentalFeePayer;
  depositAmountCents: number;
  renterTotalCents: number;
  operatorNetCents: number;
  currency: string;
};

/**
 * What a browser may be told. The withheld pair is not an oversight —
 * see rule 4 in the header and 0047 section 5.
 */
export type PublicRentalQuote = Pick<
  RentalQuote,
  | "startDate"
  | "endDate"
  | "nights"
  | "dailyRateCents"
  | "baseAmountCents"
  | "depositAmountCents"
  | "renterTotalCents"
  | "feePayer"
  | "currency"
>;

/**
 * Why a quote could not be produced. The calendar's own vocabulary plus
 * two failures that are about the LISTING rather than the dates, so a
 * route can tell "you picked badly" (show the renter a message) from
 * "this car is not priceable" (log it, degrade the surface).
 */
export type RentalQuoteRejection =
  | RangeRejection
  | "invalid_listing"
  | "invalid_fee_config";

export type RentalQuoteResult =
  | { ok: true; quote: RentalQuote }
  | { ok: false; reason: RentalQuoteRejection };

export type RentalQuoteInput = {
  listing: RentalQuoteListing;
  startDate: string;
  endDate: string;
  /** Rows from public.rental_availability for this listing (0046). */
  rows?: readonly RentalAvailabilityRow[];
  /** Bookings on this listing (0047); statuses are honoured. */
  booked?: readonly BookedRange[];
  /** UTC calendar day to treat as "now". Injectable so tests do not race the clock. */
  today?: string;
  /**
   * The owning operator's fee terms (0048), as
   * rentalFeeConfigFromPartner() reads them off the partners row.
   * Omitted → fees.ts's defaults, which are percent / operator-pays and
   * therefore the pre-0048 behaviour. Out-of-contract values are
   * rejected, not clamped.
   *
   * This replaced a bare `commissionRate: number`. The rate alone could
   * not express 0048's other four columns, so a flat fee or a
   * renter-pays operator was silently priced as a percent charged to the
   * operator — the quote and the admin preview disagreeing about the
   * same booking, which is the exact divergence fees.ts exists to stop.
   */
  feeConfig?: RentalFeeConfig;
  /**
   * The security-deposit authorization (D5). Zero until 3C gives an
   * operator somewhere to set it; carried now because it is part of the
   * snapshot 0047 freezes, and adding it later would mean re-quoting
   * every in-flight request.
   */
  depositAmountCents?: number;
};

function isNonNegativeInt(n: unknown): n is number {
  return Number.isSafeInteger(n) && (n as number) >= 0;
}

/**
 * Price a range, or say why it cannot be priced.
 *
 * Order is deliberate: the listing must be priceable, then the dates
 * must be bookable, and only then does money get multiplied. Quoting an
 * unavailable range "for reference" is how a renter ends up looking at a
 * number for days they cannot have.
 */
export function quoteRentalBooking(input: RentalQuoteInput): RentalQuoteResult {
  const { listing } = input;

  // A rate of 0 or a non-integer cent value is a broken listing, not a
  // free rental. rental_listings_daily_rate (0044) checks > 0, so this
  // fires for a hand-built object or a row from a future schema.
  if (!Number.isSafeInteger(listing.daily_rate_cents) || listing.daily_rate_cents <= 0) {
    return { ok: false, reason: "invalid_listing" };
  }

  const depositAmountCents = input.depositAmountCents ?? 0;
  if (!isNonNegativeInt(depositAmountCents)) {
    return { ok: false, reason: "invalid_listing" };
  }

  const check = checkRange(input.startDate, input.endDate, {
    listing,
    rows: input.rows,
    booked: input.booked,
    today: input.today,
  });
  if (!check.ok) return { ok: false, reason: check.reason };

  // A zero-night "rental" is legal arithmetic and an illegal booking:
  // rental_bookings_nights_bounded (0047) requires end_date > start_date,
  // and base_amount_cents > 0 could not be satisfied anyway. Reported as
  // too_short because that is what it is — the same word the renter is
  // shown for a stay under min_nights.
  if (check.nights < 1) return { ok: false, reason: "too_short" };

  const baseAmountCents = listing.daily_rate_cents * check.nights;
  if (!Number.isSafeInteger(baseAmountCents) || baseAmountCents <= 0) {
    return { ok: false, reason: "invalid_listing" };
  }

  // fees.ts owns the commission contract, including its bounds and its
  // rounding. A rate outside [0, 0.5] throws there; catching it keeps
  // that bound in exactly one file while still degrading to an honest
  // rejection instead of a 500 on a public route.
  let fee;
  try {
    fee = computeRentalFee(baseAmountCents, input.feeConfig ?? {});
  } catch {
    return { ok: false, reason: "invalid_fee_config" };
  }

  // EVERY money field comes straight out of the engine, including which
  // side pays. This used to hardcode fee_payer = 'operator' and read
  // amountCents as the renter's total — true only while the operator
  // always carried the fee. Under payer = 'renter' the fee is added on
  // top, so renterTotalCents is base + fee and the two differ; taking
  // the engine's own fields is what makes the arithmetic follow the
  // payer instead of being re-derived here under an assumption.
  //
  // 0047's rental_bookings_quote_consistent CHECK re-derives these same
  // numbers from fee_payer, so a snapshot built from any other pairing
  // is rejected at the insert.
  return {
    ok: true,
    quote: {
      startDate: input.startDate,
      endDate: input.endDate,
      nights: check.nights,
      dailyRateCents: listing.daily_rate_cents,
      baseAmountCents,
      feeCents: fee.feeCents,
      feePayer: fee.feePayer,
      depositAmountCents,
      renterTotalCents: fee.renterTotalCents,
      operatorNetCents: fee.operatorNetCents,
      currency: RENTAL_QUOTE_CURRENCY,
    },
  };
}

/**
 * The projection that may cross the wire to a browser.
 *
 * Written as an explicit object rather than a destructuring rest so that
 * ADDING a field to RentalQuote does not silently publish it: a new
 * money column has to be named here on purpose, which is the same
 * posture 0047's column grant takes ("a column not named here is
 * unreadable from a browser at any status").
 */
export function renterFacingQuote(quote: RentalQuote): PublicRentalQuote {
  return {
    startDate: quote.startDate,
    endDate: quote.endDate,
    nights: quote.nights,
    dailyRateCents: quote.dailyRateCents,
    baseAmountCents: quote.baseAmountCents,
    depositAmountCents: quote.depositAmountCents,
    // Granted to authenticated by 0047: which SIDE pays the fee is on the
    // renter's receipt, the AMOUNT of it is not.
    feePayer: quote.feePayer,
    renterTotalCents: quote.renterTotalCents,
    currency: quote.currency,
  };
}

/**
 * The frozen quote in the column names public.rental_bookings actually
 * uses (0047) — the write-side projection, as renterFacingQuote() is the
 * read-side one.
 *
 * It exists so that inserting a booking is a SPREAD rather than a
 * hand-mapping. Two routes write a rental_bookings row (2D's request and
 * the counter-offer its decision route can answer with), and a
 * hand-written `{ base_amount_cents: quote.baseAmountCents, … }` in each
 * is nine chances per route to transpose a pair. The dangerous pair is
 * renter_total_cents / operator_net_cents: both are "a number of cents
 * about this booking", so swapping them type-checks perfectly and pays
 * the operator the renter's gross. RentalBookingRow is declared as an
 * intersection with this type, so the columns a route writes and the row
 * it reads back are the same nine fields by construction — a field added
 * to the snapshot cannot land in one and not the other.
 */
export type RentalQuoteColumns = {
  start_date: string;
  end_date: string;
  base_amount_cents: number;
  fee_cents: number;
  fee_payer: RentalFeePayer;
  deposit_amount_cents: number;
  renter_total_cents: number;
  operator_net_cents: number;
  currency: string;
};

/**
 * A quote as the columns that store it.
 *
 * Written out field by field for the same reason renterFacingQuote() is:
 * an explicit object means a new money column has to be named here on
 * purpose. The difference is which way the omission fails — forgetting a
 * field in the renter's projection withholds a number, forgetting one
 * here writes a booking whose snapshot is missing it.
 */
export function rentalQuoteColumns(quote: RentalQuote): RentalQuoteColumns {
  return {
    start_date: quote.startDate,
    end_date: quote.endDate,
    base_amount_cents: quote.baseAmountCents,
    fee_cents: quote.feeCents,
    fee_payer: quote.feePayer,
    deposit_amount_cents: quote.depositAmountCents,
    renter_total_cents: quote.renterTotalCents,
    operator_net_cents: quote.operatorNetCents,
    currency: quote.currency,
  };
}

// ── The open-day-set twin of checkRange ─────────────────────────────

export type OpenDayRangeInput = {
  /** The days a renter may select — selectableDays() output. */
  openDays: Iterable<string> | ReadonlySet<string>;
  minNights: number;
  maxNights: number;
  /**
   * The listing's operating window, when the caller has it. Present, it
   * lets this function tell "not offered then" from "already taken" so
   * the rejection matches checkRange()'s word for word; absent, both
   * collapse to `unavailable` — a day outside the window is simply not
   * in the set.
   */
  window?: DayRange | null;
};

function asDaySet(
  days: Iterable<string> | ReadonlySet<string>,
): ReadonlySet<string> {
  return days instanceof Set ? days : new Set(days);
}

/**
 * Whether a range is selectable against a PRE-COMPUTED set of open days,
 * with checkRange()'s precedence and vocabulary.
 *
 * This is not a second copy of the availability rules: the set it reads
 * was produced by selectableDays(), which shares isDayOpenIn() with
 * checkRange(), so blackouts, open overrides, reserving bookings and the
 * window are all already baked into membership. What is restated is only
 * the ORDER of the rejections and the two night bounds — and the test
 * asserts, over a matrix of listings and ranges, that this function and
 * checkRange() agree on every one.
 */
export function checkOpenRange(
  startDate: string,
  endDate: string,
  input: OpenDayRangeInput,
): RangeCheck {
  const open = asDaySet(input.openDays);

  // nightsBetween first, expandDays after the bounds — the same order
  // checkRange uses, and for the same reason: expandDays THROWS on an
  // absurd span rather than truncating it, so the night ceiling has to
  // be applied before anything is expanded. A five-year range typed into
  // a URL is a rejection, not a RangeError.
  const nights = nightsBetween(startDate, endDate);
  if (nights === null) return { ok: false, reason: "invalid_dates" };

  const window = input.window;
  if (window !== undefined) {
    if (!window) return { ok: false, reason: "outside_window" };
    if (startDate < window.start_date || endDate > window.end_date) {
      return { ok: false, reason: "outside_window" };
    }
  }

  if (nights < input.minNights) return { ok: false, reason: "too_short" };
  if (nights > input.maxNights) return { ok: false, reason: "too_long" };

  // Inclusive of both ends: the return day is occupied too, which is what
  // 0047's '[]' EXCLUDE enforces on the booking itself.
  for (const day of expandDays({ start_date: startDate, end_date: endDate })) {
    if (!open.has(day)) return { ok: false, reason: "unavailable" };
  }
  return { ok: true, nights };
}

/**
 * Whether a stay can BEGIN on this day.
 *
 * The shortest legal stay is the only one worth testing: a range of
 * min_nights that hits a closed day is contained in every longer range
 * from the same start, so if the minimum fails, all of them fail. That
 * is what lets the calendar grey out a day sitting one night before a
 * blackout instead of letting a renter click into a dead end.
 */
export function canStartStay(day: string, input: OpenDayRangeInput): boolean {
  const nights = Math.max(1, input.minNights);
  const end = addUtcDays(day, nights);
  if (end === null) return false;
  return checkOpenRange(day, end, input).ok;
}

/**
 * The first range a renter could actually book, for seeding the picker.
 *
 * Prefers the earliest bookable start on or after `preferred` (the
 * form's "two weeks out" default), then falls back to the earliest
 * bookable start at all — a car whose only open days are next week
 * should open on next week, not on an empty calendar. Null when nothing
 * in the set can start a legal stay.
 */
export function firstBookableRange(
  input: OpenDayRangeInput,
  preferred?: string,
): { startDate: string; endDate: string } | null {
  const nights = Math.max(1, input.minNights);
  const days = [...asDaySet(input.openDays)].sort();

  const pick = (candidates: readonly string[]) => {
    for (const day of candidates) {
      if (!canStartStay(day, input)) continue;
      const end = addUtcDays(day, nights);
      if (end !== null) return { startDate: day, endDate: end };
    }
    return null;
  };

  if (preferred) {
    const fromPreferred = pick(days.filter((d) => d >= preferred));
    if (fromPreferred) return fromPreferred;
  }
  return pick(days);
}

// ── Renter-facing copy ──────────────────────────────────────────────

/**
 * One sentence per rejection, written for the renter and shared by the
 * route and the form so a client-side refusal and a server-side one read
 * identically — the same discipline
 * assertRentalBookingTransition() applies to the trigger's wording.
 *
 * `unavailable` deliberately does not say WHY a day is closed.
 * Distinguishing "the operator blocked it" from "somebody else booked
 * it" would publish another renter's booking against a named car, and
 * the renter's next action is the same either way.
 */
export function rentalQuoteMessage(
  reason: RentalQuoteRejection,
  bounds: { minNights?: number; maxNights?: number } = {},
): string {
  const nights = (n: number) => `${n} night${n === 1 ? "" : "s"}`;
  switch (reason) {
    case "invalid_dates":
      return "Pick a pickup and a return date.";
    case "outside_window":
      return "This car isn't offered on those dates.";
    case "too_short":
      return bounds.minNights
        ? `This car books for ${nights(bounds.minNights)} or more.`
        : "That stay is shorter than this car allows.";
    case "too_long":
      return bounds.maxNights
        ? `This car books for up to ${nights(bounds.maxNights)}. For longer, contact us.`
        : "That stay is longer than this car allows.";
    case "unavailable":
      return "Some of those days aren't available. Pick another range.";
    case "invalid_listing":
      return "This car isn't priced for online booking yet.";
    case "invalid_fee_config":
      return "We can't price this car right now — send the request and we'll follow up.";
  }
}

// ── The availability route's wire contract ──────────────────────────
//
// Declared here, next to the quote, so the route and the components that
// read it are type-checked against ONE definition. A component importing
// a type from a route file would work (types erase) but would invite an
// accidental value import of server code into the browser bundle.

/** Why a listing has no live calendar. Every one degrades, none 500s. */
export type RentalAvailabilityUnavailableReason =
  /** No active rental_listings row for this slug (e.g. a RYDA-fleet symbol). */
  | "not_listed"
  /** 0046 / 0047 are written but not applied — the pre-migration window. */
  | "not_configured"
  /** The operator's window is empty or past: the car is closed, not broken. */
  | "closed"
  /** A backend failure. Honest, and still not a crash for the caller. */
  | "unavailable";

export type RentalAvailabilityListing = {
  listingId: string;
  slug: string;
  dailyRateCents: number;
  minNights: number;
  maxNights: number;
  currency: string;
};

export type RentalAvailabilityResponse =
  | {
      available: false;
      reason: RentalAvailabilityUnavailableReason;
      message: string;
    }
  | {
      available: true;
      listing: RentalAvailabilityListing;
      /** The operating window, clipped to the booking horizon. */
      window: { startDate: string; endDate: string };
      /** Every selectable day, ascending. The set the UI enforces against. */
      openDays: string[];
      /** The server's UTC "today", so the grid and the server agree on it. */
      today: string;
      /** Present only when the request carried ?start&end and they priced. */
      quote: PublicRentalQuote | null;
      /** Present only when they did not. */
      quoteError: { reason: RentalQuoteRejection; message: string } | null;
    };
