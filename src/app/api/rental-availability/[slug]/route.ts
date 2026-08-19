// GET /api/rental-availability/[slug] — the public calendar for one car,
// and (with ?start & ?end) the server's price for a range.
// (RYDA_RENTAL_BUILD_LOOP.md phase 2C.)
//
// Public and unauthenticated by design: renters browse open days before
// they have an account, which is the RLS posture 0046 takes on
// rental_availability (guardrail 3.7) and the opposite of the
// co-ownership calendar. Rate-limited per IP because it is the one
// rental read a script can hammer.
//
// WHAT IT WILL NOT TELL YOU (decision D6). Operators stay anonymous
// through browse and request; the reveal happens after confirmation and
// it happens in a route, not in RLS. So the RESPONSE carries no operator
// identity, no vin, no partner_id and no commercial term, and the quote
// crosses the wire through renterFacingQuote(), which withholds the same
// two commission columns 0047's `grant select (...)` withholds.
//
// It does now READ partner_id and the operator's fee terms, which it did
// not before 0048. Pricing needs them: under fee_payer = 'renter' the fee
// is added on top of the base, so a route that cannot resolve the terms
// publishes a renter total the booking would refuse to honour. The
// distinction the guardrail draws is about what reaches a BROWSER, not
// which columns a server may join on — and the projection that decides
// what reaches the browser is an explicit nine-field list, so a column
// read here cannot leak by being forgotten.
//
// It also does not say WHY a day is closed. openDays is a flat set: a
// blackout, a confirmed booking and a day past the horizon are
// indistinguishable in the payload. That is deliberate — "the 14th is
// taken" published against a named car is another renter's booking, and
// the renter's next action is the same whatever the reason.
//
// EVERY FAILURE DEGRADES. 0046 and 0047 are written but not applied, so
// the pre-migration window is the NORMAL case today: a missing table or
// column answers `{ available: false, reason: 'not_configured' }` with a
// 200 and the inquiry form falls back to its plain date inputs, exactly
// as the rental-inquiry route drops an optional column rather than
// losing the lead. The one thing this route may never do is fail OPEN —
// an availability read that errors reports closed, because the cost of a
// wrongly-hidden day is a lost request and the cost of a wrongly-offered
// one is two renters at one car.

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { isColumnMissing } from "@/lib/partner-resolution";
import {
  PARTNER_FEE_SELECT,
  rentalFeeConfigFromPartner,
  type PartnerFeeColumns,
  type RentalFeeConfig,
} from "@/lib/fees";
import {
  RENTAL_AVAILABILITY_COLS,
  RENTAL_BOOKING_RESERVING_STATUSES,
  operatingWindow,
  selectableDays,
  utcDayOf,
  type BookedRange,
  type RentalAvailabilityRow,
} from "@/lib/rental-availability";
import {
  RENTAL_QUOTE_CURRENCY,
  quoteRentalBooking,
  renterFacingQuote,
  rentalQuoteMessage,
  type PublicRentalQuote,
  type RentalAvailabilityResponse,
  type RentalAvailabilityUnavailableReason,
  type RentalQuoteListing,
  type RentalQuoteRejection,
} from "@/lib/rental-quote";

export const runtime = "nodejs";

// A calendar is read on every car page and on every month flip, so the
// ceiling is higher than the 5/min the inquiry POST allows — this write
// costs nothing and creates nothing.
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

// rental_listings.slug is hand-authored kebab-case (0044); RYDA-fleet
// symbols reach this route too, through the shared /rent/[symbol] page.
// Anything else is a probe, and rejecting it here keeps a wildcard out
// of a LIKE-free equality filter's way.
const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,80}$/i;

// The listing columns this route may read. `vin` is still not here (D6),
// and no operator contact detail is. 0046's three window columns arrive
// on rental_listings, so a pre-0046 database fails this select and lands
// in the not_configured branch below — which is the correct answer, since
// without a window there is no calendar to serve.
//
// partner_id IS here, and it was not before. Pricing a range now needs
// the operator's fee terms (0048): under fee_payer = 'renter' the fee is
// added on top, so a route that cannot resolve the terms publishes a
// renter total the booking will not honour. partner_id is the key that
// reaches them.
//
// It is read and never returned. The response body is built field by
// field below and carries no partner_id, and the quote crosses the wire
// through renterFacingQuote(), whose projection names nine fields and
// omits feeCents and operatorNetCents — the pair that together ARE the
// commission. Guardrail 3.7 is about what reaches a browser, not about
// which columns a server route may join on.
const LISTING_COLS =
  "id, partner_id, slug, status, daily_rate_cents, min_nights, max_nights, " +
  "available_from, available_until, booking_horizon_days";

type ListingRow = {
  id: string;
  /** Server-side only — never enters the response. */
  partner_id: string;
  slug: string;
  status: string;
  daily_rate_cents: number;
  min_nights: number;
  max_nights: number;
  available_from: string | null;
  available_until: string | null;
  booking_horizon_days: number;
};

type QueryError = { message?: string; code?: string } | null;

// "No such table" detection, same predicate the payment-link route and
// the connect webhook use. PostgREST reports a missing relation as a
// schema-cache miss or as a plain "does not exist" depending on where it
// fails, hence both spellings.
function isTableMissing(error: QueryError, table: string): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  if (error?.code === "42P01") return true;
  return (
    msg.includes(table) &&
    (msg.includes("schema cache") || msg.includes("does not exist"))
  );
}

/** A migration this database has not taken yet — table or column. */
function isSchemaMissing(
  error: QueryError,
  table: string,
  columns: readonly string[],
): boolean {
  if (isTableMissing(error, table)) return true;
  return columns.some((column) => isColumnMissing(error, column));
}

const UNAVAILABLE_COPY: Record<RentalAvailabilityUnavailableReason, string> = {
  not_listed: "This car isn't on the live booking calendar yet.",
  not_configured: "Live availability isn't set up for this car yet.",
  closed: "This car isn't taking dates right now.",
  unavailable: "We couldn't load this car's calendar. Try again shortly.",
};

function unavailable(
  reason: RentalAvailabilityUnavailableReason,
  status = 200,
): NextResponse {
  const body: RentalAvailabilityResponse = {
    available: false,
    reason,
    message: UNAVAILABLE_COPY[reason],
  };
  // A degraded calendar is a snapshot of a database state that a
  // migration can change at any moment; caching it would strand the
  // funnel on "not configured" after 0046 lands.
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAllowed(`rental-availability:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { slug: rawSlug } = await params;
  const slug = (rawSlug ?? "").trim().toLowerCase();
  if (!slug || !SLUG_RE.test(slug)) {
    return unavailable("not_listed", 404);
  }

  const admin = supabaseAdmin();
  if (!admin) {
    // Preview deploys and misconfigured environments. Honest 503 rather
    // than a fabricated empty calendar — an empty openDays would read as
    // "this car is fully booked".
    return unavailable("unavailable", 503);
  }

  // ── the listing ───────────────────────────────────────────────────
  const listingRes = await admin
    .from("rental_listings")
    .select(LISTING_COLS)
    .eq("slug", slug)
    .maybeSingle();

  if (listingRes.error) {
    if (
      isSchemaMissing(listingRes.error, "rental_listings", [
        "available_from",
        "available_until",
        "booking_horizon_days",
      ])
    ) {
      // Pre-0044 (no table) or pre-0046 (no window columns). Both mean
      // "there is no calendar yet", and both are expected states of this
      // branch until an operator applies the migrations.
      return unavailable("not_configured");
    }
    console.error("[rental-availability · listing]", listingRes.error);
    return unavailable("unavailable", 503);
  }

  const listing = listingRes.data as ListingRow | null;
  // Only 'active' listings are public — the same rule 0044's
  // rental_listings_select_public applies, restated here because this
  // route holds the service-role client and RLS is not enforcing it.
  // A RYDA-fleet symbol also lands here: it has no listing row at all,
  // which is not an error, it is a car this calendar does not cover.
  if (!listing || listing.status !== "active") {
    return unavailable("not_listed");
  }

  const quoteListing: RentalQuoteListing = {
    available_from: listing.available_from,
    available_until: listing.available_until,
    booking_horizon_days: listing.booking_horizon_days,
    min_nights: listing.min_nights,
    max_nights: listing.max_nights,
    daily_rate_cents: listing.daily_rate_cents,
  };

  // ── the operator's calendar overrides (0046) ──────────────────────
  const rowsRes = await admin
    .from("rental_availability")
    .select(RENTAL_AVAILABILITY_COLS)
    .eq("listing_id", listing.id);

  if (rowsRes.error) {
    // Fails CLOSED, and the reasoning matters: the window columns above
    // came back, so 0046 IS applied and this table exists. An error here
    // is a real failure, and treating it as "no blackouts" would offer
    // every day the operator has blocked.
    console.error("[rental-availability · rows]", rowsRes.error);
    return unavailable("unavailable", 503);
  }
  const rows = (rowsRes.data ?? []) as RentalAvailabilityRow[];

  // ── the days bookings already hold (0047) ─────────────────────────
  const bookedRes = await admin
    .from("rental_bookings")
    .select("start_date, end_date, status")
    .eq("listing_id", listing.id)
    // Filtered here as well as by reservingRanges() downstream: this is
    // the narrow index the EXCLUDE constraint's WHERE clause matches, and
    // the list is the one 0047 itself uses.
    .in("status", [...RENTAL_BOOKING_RESERVING_STATUSES]);

  let booked: BookedRange[] = [];
  if (bookedRes.error) {
    if (isTableMissing(bookedRes.error, "rental_bookings")) {
      // 0047 not applied. Failing OPEN is exact rather than optimistic
      // here: a table that does not exist holds no rows, so no booking
      // can be holding a day. (Contrast rental_availability above, where
      // the table exists and an error hides real blackouts.)
      booked = [];
    } else {
      console.error("[rental-availability · bookings]", bookedRes.error);
      return unavailable("unavailable", 503);
    }
  } else {
    booked = (bookedRes.data ?? []) as BookedRange[];
  }

  // ── the calendar ──────────────────────────────────────────────────
  const today = utcDayOf();
  const window = operatingWindow(quoteListing, today);
  if (!window) {
    // available_until already past, or a bound that will not parse. The
    // car is closed, not broken.
    return unavailable("closed");
  }

  const availability = { listing: quoteListing, rows, booked, today };
  const openDays = selectableDays(availability);

  // ── the optional quote ────────────────────────────────────────────
  //
  // Same rules as the calendar, from the same functions: a range the UI
  // could not have selected is rejected here with the same word. The
  // client never sends a price and nothing it sends contributes to one —
  // only the two dates are read.
  const url = req.nextUrl;
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  let quote: PublicRentalQuote | null = null;
  let quoteError: { reason: RentalQuoteRejection; message: string } | null = null;

  if (start !== null || end !== null) {
    // The operator's fee terms, resolved only when a quote is actually
    // being asked for — a bare calendar read costs no extra query.
    //
    // Best-effort, and the failure mode is deliberate: a partners row
    // that cannot be read falls through to fees.ts's defaults (percent /
    // operator-pays), which is what every operator is on until an admin
    // says otherwise, and which is the behaviour this route had before
    // 0048 existed. Refusing to quote because a commission lookup
    // flickered would take a car off sale over a number the renter is
    // never shown.
    let feeConfig: RentalFeeConfig | undefined;
    const partnerRes = await admin
      .from("partners")
      .select(PARTNER_FEE_SELECT)
      .eq("id", listing.partner_id)
      .maybeSingle();
    if (partnerRes.error) {
      console.warn("[rental-availability · fee terms]", partnerRes.error.message);
    } else if (partnerRes.data) {
      feeConfig = rentalFeeConfigFromPartner(
        partnerRes.data as unknown as PartnerFeeColumns,
      );
    }

    const priced = quoteRentalBooking({
      ...availability,
      startDate: start ?? "",
      endDate: end ?? "",
      // 3A HAS LANDED, SO THE FEE TERMS ARE RESOLVED HERE NOW.
      //
      // This used to pass nothing, on the reasoning that under
      // fee_payer = 'operator' the renter's total is the base regardless
      // of the rate — true, and the note said in as many words that when
      // 'renter' became representable THIS was the line that had to
      // change. 0048 made it representable: under payer = 'renter' the
      // fee is added on top, so renterTotalCents is base + fee and a
      // route that cannot see the terms publishes a total the booking
      // will not honour.
      //
      // READING THE TERMS IS NOT PUBLISHING THEM. Guardrail 3.7 keeps
      // commission_rate and the fee columns out of the BROWSER, not out
      // of a server route — this file already reads partner-owned rows
      // (the listing itself). What crosses the wire is
      // renterFacingQuote()'s explicit projection, which names nine
      // fields and omits feeCents and operatorNetCents: the pair that
      // together ARE the commission, and the same pair 0047's column
      // grant withholds. So the fee is computed here and never returned,
      // exactly as the booking row computes it and never returns it.
      feeConfig,
    });
    if (priced.ok) {
      quote = renterFacingQuote(priced.quote);
    } else {
      quoteError = {
        reason: priced.reason,
        message: rentalQuoteMessage(priced.reason, {
          minNights: listing.min_nights,
          maxNights: listing.max_nights,
        }),
      };
    }
  }

  const body: RentalAvailabilityResponse = {
    available: true,
    listing: {
      listingId: listing.id,
      slug: listing.slug,
      dailyRateCents: listing.daily_rate_cents,
      minNights: listing.min_nights,
      maxNights: listing.max_nights,
      currency: RENTAL_QUOTE_CURRENCY,
    },
    window: { startDate: window.start_date, endDate: window.end_date },
    openDays,
    today,
    quote,
    quoteError,
  };

  return NextResponse.json(body, {
    // A calendar goes stale the moment an operator approves a request.
    // No shared cache: a CDN copy would keep offering days that are now
    // held, and the 23P01 that follows is a booking failing at the door.
    headers: { "Cache-Control": "no-store" },
  });
}
