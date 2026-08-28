// POST /api/rental-bookings — a renter asks for specific dates on a car.
// GET  /api/rental-bookings — the caller's own bookings (renter, or
//                             ?role=operator for the request inbox).
//
// This is step 1 of the money flow in RYDA_RENTAL_BUILD_LOOP §2, and the
// two things it does NOT do are the point of it:
//
//   IT DOES NOT RESERVE THE DATES. Request-to-book (D3) means several
//   renters may be asking for the same week at once and the operator
//   picks. 0047's EXCLUDE constraint is scoped to confirmed/in_progress
//   precisely so a request holds nothing; this route therefore never
//   writes `status`, letting the column default to 'requested'. (0047's
//   trigger also refuses an INSERT straight into a reserving status
//   without re-checking the calendar — not writing the column at all is
//   the simplest way to stay on the right side of that.)
//
//   IT DOES NOT CHARGE. Money moves at confirmation (step 3), and the
//   rail that moves it is phase 3B. Nothing here touches Stripe, and the
//   response says so rather than implying a hold that does not exist.
//
// THE PRICE IS THE SERVER'S. The body carries a listing and two dates.
// Everything with a currency on it is recomputed here from the listing
// row via quoteRentalBooking() (2C) and frozen onto the booking, because
// the frozen snapshot is what a card is charged against later. A total in
// the request body would be ignored; there is deliberately nowhere to put
// one.
//
// D6: the response names no operator. A request is pre-confirmation by
// definition, so the operator block is always the anonymous label — and
// it is built by discloseOperator() rather than by omission here, so the
// rule holds in one place for every route.
//
// Pre-migration window: 0046 and 0047 are written but not applied to any
// database yet. Every query below degrades — the list returns an empty
// history (the truthful degraded state, mirroring /api/rental-inquiry's
// GET), the create returns an honest 503 — rather than 500ing.

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { isColumnMissing } from "@/lib/partner-resolution";
import {
  PARTNER_FEE_SELECT,
  rentalFeeConfigFromPartner,
  type PartnerFeeColumns,
  type RentalFeeConfig,
} from "@/lib/fees";
import {
  DEFAULT_BOOKING_HORIZON_DAYS,
  RENTAL_AVAILABILITY_COLS,
  RENTAL_BOOKING_RESERVING_STATUSES,
  parseUtcDay,
  type BookedRange,
  type RentalAvailabilityRow,
} from "@/lib/rental-availability";
import {
  RENTAL_BOOKING_STATUS,
  reservesRentalDates,
} from "@/lib/rental-booking-status";
import {
  quoteRentalBooking,
  rentalQuoteColumns,
  rentalQuoteMessage,
  renterFacingQuote,
} from "@/lib/rental-quote";
import {
  RENTAL_BOOKING_COLS,
  discloseOperator,
  loadPartnerStaffIds,
  projectRentalBooking,
  rentalBookingAccess,
  rentalBookingSubject,
  type RentalBookingCaller,
  type RentalBookingInsert,
  type RentalBookingListingSummary,
  type RentalBookingRow,
  type RentalOperatorIdentity,
} from "@/lib/rental-booking-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateRenterDetails } from "@/lib/renter-details";

export const runtime = "nodejs";

// Contact-form-shaped limits: a request is a considered action, not a
// stream. Both keys are checked — the IP key stops one host hammering
// the quote path, the user key stops one account doing it from many.
const CREATE_IP_LIMIT = 10;
const CREATE_USER_LIMIT = 6;
const READ_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

/** Open default O5: an unanswered request auto-declines after 24 hours. */
const REQUEST_EXPIRY_HOURS = 24;

/** Bookings returned by one GET. A renter's history is small; this is a
 *  backstop against an operator inbox growing unbounded. */
const LIST_LIMIT = 200;

/**
 * WHICH 200, and why the two roles do not agree on it.
 *
 * A renter reads a HISTORY, so latest pickup first is the right order
 * and the cap is theoretical — nobody has 200 bookings.
 *
 * An operator reads an INBOX, and ordering that by start_date descending
 * makes the cap actively harmful: a partner whose fleet has accumulated
 * more than 200 rows, weighted toward confirmed bookings months out,
 * loses the rows with the NEAREST pickup dates first. A renter's fresh
 * request for next week sorts below a stack of far-future confirmations
 * and is dropped server-side — so BookingRequestList groups a list it
 * never received, countOperatorRequests() badges /partner with a count
 * that does not include it, and the request auto-expires at 24h having
 * been shown to nobody. The payload is a bare `{bookings: […]}` with no
 * total, so neither surface could even warn.
 *
 * created_at descending is what makes the truncation harmless: the rows
 * that fall off the end are the OLDEST, which are the decided ones, and
 * a request that has just arrived is always in the window it needs to be
 * in — the one where somebody can still answer it.
 */
const LIST_ORDER = {
  renter: "start_date",
  operator: "created_at",
} as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "No such table" detection — rental_bookings and rental_availability
// arrive with migrations 0047 and 0046, both of which need explicit
// operator approval to apply. Same predicate the payment-link route uses
// for the 0041 window.
function isTableMissing(
  error: { message?: string } | null,
  table: string,
): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    msg.includes(table) &&
    (msg.includes("schema cache") || msg.includes("does not exist"))
  );
}

// ── the listing ─────────────────────────────────────────────────────

/** What a quote and a payload need from rental_listings (0044 + 0046). */
type BookableListing = {
  id: string;
  partner_id: string;
  slug: string;
  market: string;
  make: string;
  model: string;
  year: number | null;
  status: string;
  daily_rate_cents: number;
  min_nights: number;
  max_nights: number;
  available_from: string | null;
  available_until: string | null;
  booking_horizon_days: number;
};

const LISTING_BASE_COLS =
  "id, partner_id, slug, market, make, model, year, status, " +
  "daily_rate_cents, min_nights, max_nights";
const LISTING_WINDOW_COLS =
  "available_from, available_until, booking_horizon_days";

/**
 * The car, as the payload may describe it. No partner_id — see D6.
 *
 * The return type is ANNOTATED, not inferred: RentalBookingListingSummary
 * is the declaration the three client surfaces read this block through,
 * so a field added here that they do not know about — or dropped here
 * while they still render it — is a compile error rather than an
 * `undefined` on a screen.
 */
function listingSummary(listing: {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number | null;
  market: string;
}): RentalBookingListingSummary {
  return {
    id: listing.id,
    slug: listing.slug,
    make: listing.make,
    model: listing.model,
    year: listing.year,
    market: listing.market,
  };
}

/**
 * Load a listing, tolerating the pre-0046 window.
 *
 * The operating-window columns arrive with 0046; until it is applied the
 * select errors on them. Retrying without them and defaulting to
 * "open, 180-day horizon" is exactly what those columns default to in
 * 0046 itself, so the calendar behaves identically either side of the
 * migration instead of the route 500ing.
 */
/**
 * The renter's own user_profiles row against validateRenterDetails.
 * Returns the sentence to refuse with, or null when they may proceed.
 *
 * Fails closed: a row we cannot read is a profile that is not complete.
 * Field-level sentences are for a form with fields; here a missing or
 * malformed value collapses to one line telling the renter where to fix
 * it, and only the under-age verdict keeps its own words — that one is a
 * fact about the renter, not about a box.
 */
async function checkRenterDetails(
  db: SupabaseClient,
  userId: string,
  pickupDate: string,
): Promise<string | null> {
  const res = await db
    .from("user_profiles")
    .select("full_name, phone, date_of_birth")
    .eq("user_id", userId)
    .maybeSingle();
  if (res.error) {
    console.warn("[rental-bookings · profile read]", res.error.message);
    return "Add your name, phone and date of birth to your profile before requesting.";
  }
  const row = (res.data ?? null) as {
    full_name?: unknown;
    phone?: unknown;
    date_of_birth?: unknown;
  } | null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const problem = validateRenterDetails(
    {
      fullName: str(row?.full_name),
      phone: str(row?.phone),
      dateOfBirth: str(row?.date_of_birth),
    },
    pickupDate,
  );
  if (!problem) return null;
  return problem.kind === "under_age"
    ? problem.message
    : "Add your name, phone and date of birth to your profile before requesting.";
}

async function loadListing(
  db: SupabaseClient,
  listingId: string,
): Promise<
  | { ok: true; listing: BookableListing }
  | { ok: false; reason: "not_found" | "not_configured" | "error" }
> {
  const withWindow = await db
    .from("rental_listings")
    .select(`${LISTING_BASE_COLS}, ${LISTING_WINDOW_COLS}`)
    .eq("id", listingId)
    .maybeSingle();

  let data = withWindow.data as Partial<BookableListing> | null;

  if (withWindow.error) {
    // COLUMN CHECK FIRST, and the order is the whole point. Postgres
    // reports a missing column as `column rental_listings.available_from
    // does not exist` — a message that contains the table name AND "does
    // not exist", so isTableMissing() matches it too. Asking that
    // question first answered "not_configured" for every car in exactly
    // the pre-0046 window the retry below exists to survive. The decision
    // route's loadListing has always ordered these the other way round;
    // this is the two of them agreeing about one database state again.
    const windowMissing =
      isColumnMissing(withWindow.error, "available_from") ||
      isColumnMissing(withWindow.error, "available_until") ||
      isColumnMissing(withWindow.error, "booking_horizon_days");
    if (!windowMissing) {
      if (isTableMissing(withWindow.error, "rental_listings")) {
        return { ok: false, reason: "not_configured" };
      }
      console.error("[rental-bookings · listing]", withWindow.error);
      return { ok: false, reason: "error" };
    }
    const bare = await db
      .from("rental_listings")
      .select(LISTING_BASE_COLS)
      .eq("id", listingId)
      .maybeSingle();
    if (bare.error) {
      console.error("[rental-bookings · listing]", bare.error);
      return { ok: false, reason: "error" };
    }
    data = bare.data as Partial<BookableListing> | null;
  }

  if (!data) return { ok: false, reason: "not_found" };

  return {
    ok: true,
    listing: {
      id: String(data.id),
      partner_id: String(data.partner_id),
      slug: String(data.slug ?? ""),
      market: String(data.market ?? ""),
      make: String(data.make ?? ""),
      model: String(data.model ?? ""),
      year: data.year ?? null,
      status: String(data.status ?? ""),
      daily_rate_cents: Number(data.daily_rate_cents),
      min_nights: Number(data.min_nights),
      max_nights: Number(data.max_nights),
      available_from: data.available_from ?? null,
      available_until: data.available_until ?? null,
      booking_horizon_days:
        typeof data.booking_horizon_days === "number"
          ? data.booking_horizon_days
          : DEFAULT_BOOKING_HORIZON_DAYS,
    },
  };
}

/**
 * Blackout / open rows for a listing, or a refusal to guess.
 *
 * The two failures are NOT the same failure, and collapsing them is how a
 * blacked-out week gets booked. A missing table is exact: pre-0046 there
 * are no availability rows anywhere, so an empty list is not a
 * degradation, it is the truth. Any OTHER error means the rows exist and
 * we could not read them — and treating that as "no blackouts" would
 * price and accept every day the operator has blocked.
 *
 * The availability route this POST has to agree with (2C) already fails
 * closed on exactly this read, with exactly this reasoning. A calendar
 * that hides a day the POST would have taken costs a request; a POST that
 * takes a day the calendar hides costs the operator their car.
 */
async function loadAvailabilityRows(
  db: SupabaseClient,
  listingId: string,
): Promise<{ ok: true; rows: RentalAvailabilityRow[] } | { ok: false }> {
  const { data, error } = await db
    .from("rental_availability")
    .select(RENTAL_AVAILABILITY_COLS)
    .eq("listing_id", listingId);
  if (error) {
    if (isTableMissing(error, "rental_availability")) {
      return { ok: true, rows: [] };
    }
    console.error("[rental-bookings · availability]", error);
    return { ok: false };
  }
  return { ok: true, rows: (data ?? []) as RentalAvailabilityRow[] };
}

// ── POST: create a request ──────────────────────────────────────────

type CreateBody = {
  listingId: string;
  startDate: string;
  endDate: string;
  clientToken: string | null;
};

function parseCreateBody(
  body: unknown,
): { ok: true; value: CreateBody } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const listingId = typeof b.listingId === "string" ? b.listingId.trim() : "";
  if (!UUID_RE.test(listingId)) return { ok: false, error: "Pick a car." };

  const startDate = typeof b.startDate === "string" ? b.startDate.trim() : "";
  const endDate = typeof b.endDate === "string" ? b.endDate.trim() : "";
  // parseUtcDay is strict about the shape AND about impossible days —
  // new Date('2026-02-31') silently rolls into March otherwise.
  if (parseUtcDay(startDate) === null || parseUtcDay(endDate) === null) {
    return { ok: false, error: "Pick a pickup and a return date." };
  }

  const rawToken = typeof b.clientToken === "string" ? b.clientToken.trim() : "";
  if (rawToken.length > 128) {
    return { ok: false, error: "Bad request." };
  }

  return {
    ok: true,
    value: { listingId, startDate, endDate, clientToken: rawToken || null },
  };
}

export async function POST(req: NextRequest) {
  try {
    if (
      !(await isAllowed(
        `rental-bookings:ip:${clientIp(req)}`,
        CREATE_IP_LIMIT,
        RATE_WINDOW_MS,
      ))
    ) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
    }

    // Unlike the inquiry funnel, a booking request is account-first: it
    // creates a financial record with a renter on it, and 0047 makes
    // renter_user_id NOT NULL for exactly that reason.
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to request these dates." },
        { status: 401 },
      );
    }
    if (
      !(await isAllowed(
        `rental-bookings:user:${user.id}`,
        CREATE_USER_LIMIT,
        RATE_WINDOW_MS,
      ))
    ) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
    }

    const parsed = parseCreateBody(await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { listingId, startDate, endDate, clientToken } = parsed.value;

    const db = supabaseAdmin();
    if (!db) {
      console.error("[rental-bookings · misconfigured]");
      return NextResponse.json(
        { error: "Booking is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }

    const found = await loadListing(db, listingId);
    if (!found.ok) {
      if (found.reason === "not_found") {
        return NextResponse.json({ error: "That car isn't listed." }, { status: 404 });
      }
      if (found.reason === "not_configured") {
        return NextResponse.json(
          { error: "Online booking isn't switched on yet for this environment." },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Could not load that car. Please try again." },
        { status: 500 },
      );
    }
    const listing = found.listing;

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "That car isn't taking bookings right now." },
        { status: 409 },
      );
    }

    // WHO IS ASKING (founder decision 2026-08-26). A request carries a
    // name, a phone number and a date of birth, or it does not go: the
    // confirm dialog saves them to user_profiles before it POSTs, and
    // this is what makes that a rule rather than a courtesy. Same
    // validator as the dialog, so the sentence is the same on both sides
    // of the click. 422 + reason, which the form shows as-is.
    const detailsProblem = await checkRenterDetails(db, user.id, startDate);
    if (detailsProblem) {
      return NextResponse.json(
        { error: detailsProblem, reason: "profile_incomplete" },
        { status: 422 },
      );
    }

    // The bookings this listing already HOLDS. Reserving statuses only —
    // another renter's open request must not hide a day from this one
    // (D3). This is also the probe that tells us whether 0047 is applied:
    // if the table is missing there is nothing to insert into either.
    const bookedRes = await db
      .from("rental_bookings")
      .select("start_date, end_date, status")
      .eq("listing_id", listing.id)
      .in("status", [...RENTAL_BOOKING_RESERVING_STATUSES]);
    if (bookedRes.error) {
      if (isTableMissing(bookedRes.error, "rental_bookings")) {
        return NextResponse.json(
          {
            error:
              "Online booking isn't switched on yet — the rental booking tables (migration 0047) haven't been applied to this environment.",
          },
          { status: 503 },
        );
      }
      console.error("[rental-bookings · booked]", bookedRes.error);
      return NextResponse.json(
        { error: "Could not check availability. Please try again." },
        { status: 500 },
      );
    }
    const booked = (bookedRes.data ?? []) as BookedRange[];
    const availabilityRows = await loadAvailabilityRows(db, listing.id);
    if (!availabilityRows.ok) {
      // We could not read the operator's blackouts. Refusing is the whole
      // point — see loadAvailabilityRows.
      return NextResponse.json(
        { error: "Could not check availability. Please try again." },
        { status: 503 },
      );
    }
    const rows = availabilityRows.rows;

    // The operator's FULL fee terms (0048), for the frozen snapshot.
    //
    // This read used to take commission_rate alone, which silently priced
    // a flat-fee or renter-pays operator as a percent charged to the
    // operator. rentalFeeConfigFromPartner() is the same reader the
    // payment-link route uses, so the two rails cannot come to disagree
    // about one operator's terms — the divergence fees.ts's header exists
    // to prevent, and the one this route was on the wrong side of.
    //
    // Best-effort: partners is service-role-only and its fee columns may
    // predate an environment, so a failed read falls through to fees.ts's
    // defaults (percent / operator-pays / 15%) rather than refusing the
    // booking. Those defaults are 0041 and 0048's own column defaults, so
    // degrading here reproduces the pre-3A behaviour exactly.
    let feeConfig: RentalFeeConfig | undefined;
    const partnerRes = await db
      .from("partners")
      .select(PARTNER_FEE_SELECT)
      .eq("id", listing.partner_id)
      .maybeSingle();
    if (partnerRes.error) {
      console.warn("[rental-bookings · fee terms]", partnerRes.error.message);
    } else if (partnerRes.data) {
      feeConfig = rentalFeeConfigFromPartner(
        partnerRes.data as unknown as PartnerFeeColumns,
      );
    }

    const quoted = quoteRentalBooking({
      listing,
      startDate,
      endDate,
      rows,
      booked,
      feeConfig,
    });
    if (!quoted.ok) {
      const message = rentalQuoteMessage(quoted.reason, {
        minNights: listing.min_nights,
        maxNights: listing.max_nights,
      });
      // 409 rather than 400: the body was well-formed, the world said no.
      return NextResponse.json(
        { error: message, reason: quoted.reason },
        { status: 409 },
      );
    }
    const quote = quoted.quote;

    // The money is SPREAD from the quote, never re-typed: rentalQuoteColumns()
    // is the one mapping from a RentalQuote to 0047's columns, so the row
    // this writes carries the numbers renterFacingQuote() hands back below
    // by construction rather than by two lists agreeing.
    //
    // `status` is deliberately absent, and RentalBookingInsert is what
    // keeps it absent — it defaults to 'requested' in 0047, and a request
    // must never be written into a status that holds dates.
    const insertRow: RentalBookingInsert = {
      ...rentalQuoteColumns(quote),
      listing_id: listing.id,
      renter_user_id: user.id,
      initiated_by: "renter",
      client_token: clientToken,
      expires_at: new Date(
        Date.now() + REQUEST_EXPIRY_HOURS * 60 * 60 * 1000,
      ).toISOString(),
    };

    const inserted = await db
      .from("rental_bookings")
      .insert(insertRow)
      .select(RENTAL_BOOKING_COLS)
      .single();

    let row = inserted.data as RentalBookingRow | null;
    let deduped = false;

    if (inserted.error) {
      if (isTableMissing(inserted.error, "rental_bookings")) {
        return NextResponse.json(
          {
            error:
              "Online booking isn't switched on yet — the rental booking tables (migration 0047) haven't been applied to this environment.",
          },
          { status: 503 },
        );
      }

      // Two different unique indexes raise a bare 23505 here and they do
      // NOT mean the same thing (0047 §2): client_token is "this exact
      // submission, again" (a double tap), one_open_request is "you
      // already asked for these dates" (a re-ask from a fresh mount).
      // Both are answered with the caller's existing row, both lookups
      // are pinned to renter_user_id so the row is necessarily the
      // caller's own — and both are pinned to the LISTING AND THE DATES
      // as well, so the row handed back is necessarily this request.
      if ((inserted.error as { code?: string }).code === "23505") {
        const msg = (inserted.error.message ?? "").toLowerCase();
        if (clientToken && msg.includes("client_token")) {
          const existing = await db
            .from("rental_bookings")
            .select(RENTAL_BOOKING_COLS)
            .eq("renter_user_id", user.id)
            .eq("client_token", clientToken)
            .maybeSingle();
          const prior = (existing.data as RentalBookingRow | null) ?? null;
          // A TOKEN IDENTIFIES A SUBMISSION, NOT A RENTER. The index is
          // (renter_user_id, client_token), so this lookup can only ever
          // return the caller's own row — but "the caller's own row" is
          // not the same as "the row this request is a repeat of". A UI
          // that persists its idempotency token (localStorage, to survive
          // a reload) reuses one token across cars and across dates, and
          // answering that with whatever row it collided with returns a
          // booking on ANOTHER car paired with the listing and the quote
          // just computed for THIS one. So the row has to match the
          // request that produced it before it can be called a duplicate.
          if (
            prior &&
            prior.listing_id === listing.id &&
            prior.start_date === quote.startDate &&
            prior.end_date === quote.endDate
          ) {
            row = prior;
          } else if (prior) {
            // Genuinely different dates or a different car under a token
            // that is already spent. Silently discarding the request and
            // reporting success would be the worst of the options; say so
            // instead, and say what fixes it.
            return NextResponse.json(
              {
                error:
                  "That request token was already used for a different booking. Reload the page and send this request again.",
                reason: "client_token_reused",
              },
              { status: 409 },
            );
          }
        }
        if (!row) {
          const existing = await db
            .from("rental_bookings")
            .select(RENTAL_BOOKING_COLS)
            .eq("renter_user_id", user.id)
            .eq("listing_id", listing.id)
            .eq("start_date", quote.startDate)
            .eq("end_date", quote.endDate)
            .eq("status", RENTAL_BOOKING_STATUS.requested)
            .maybeSingle();
          row = (existing.data as RentalBookingRow | null) ?? null;
        }
        deduped = !!row;
      }

      if (!row) {
        console.error("[rental-bookings · insert]", inserted.error);
        return NextResponse.json(
          { error: "Could not send that request. Please try again." },
          { status: 500 },
        );
      }
    }

    if (!row) {
      console.error("[rental-bookings · insert] no row returned");
      return NextResponse.json(
        { error: "Could not send that request. Please try again." },
        { status: 500 },
      );
    }

    const caller: RentalBookingCaller = { userId: user.id };
    const access = rentalBookingAccess(
      caller,
      rentalBookingSubject(row, listing.partner_id),
    );
    if (!access.ok) {
      // Unreachable: the row was just written with this user as renter.
      console.error("[rental-bookings · access]", access.reason);
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        deduped,
        booking: projectRentalBooking(row, access),
        listing: listingSummary(listing),
        quote: renterFacingQuote(quote),
        // Always anonymous here: a request is pre-confirmation by
        // definition (D6). Built through discloseOperator so the rule is
        // enforced in one place, not remembered in each route.
        operator: discloseOperator(access, null, listing.market),
        // THE STATE OF THE RAIL, NOT A PROMISE ABOUT IT (guardrail 3.9).
        // "RYDA charges the card when the operator confirms" was false in
        // two directions at once: no card is collected anywhere on this
        // path — there is no SetupIntent and no payment method on file —
        // and the decision route's approve branch is gated behind
        // RENTAL_CHARGE_RAIL_LIVE = false, so confirmation writes a status
        // and nothing else. The renter was being told the opposite of what
        // the next response in the same flow tells them.
        //
        // It is also derived from the row rather than hardcoded: a deduped
        // reply can be answering with a booking that is ALREADY confirmed,
        // and "no dates are held" is not true of a row sitting in the
        // EXCLUDE index.
        charge: {
          status: "none" as const,
          message: reservesRentalDates(row.status)
            ? "This booking is already confirmed and holds these dates. No card was collected and nothing was charged."
            : "No card was collected and no dates are held yet. If the operator confirms, the dates are reserved — nothing is charged either way, because the payment rail isn't live yet.",
        },
        expiresAt: row.expires_at,
      },
      { status: deduped ? 200 : 201 },
    );
  } catch (e) {
    console.error("[rental-bookings · POST]", e);
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}

// ── GET: the caller's bookings ──────────────────────────────────────

/**
 * Attach the car and, where D6 allows it, the operator.
 *
 * Two bounded extra queries: one for the listings the returned bookings
 * point at, one for the operators behind the listings on the rows this
 * caller is actually entitled to see named. A caller with no revealed
 * rows makes no partners query at all.
 */
async function decorate(
  db: SupabaseClient,
  caller: RentalBookingCaller,
  rows: RentalBookingRow[],
) {
  const listingIds = [...new Set(rows.map((r) => r.listing_id))];
  const listings = new Map<
    string,
    { id: string; partner_id: string; slug: string; make: string; model: string; year: number | null; market: string }
  >();

  if (listingIds.length > 0) {
    const res = await db
      .from("rental_listings")
      .select("id, partner_id, slug, make, model, year, market")
      .in("id", listingIds);
    if (res.error) {
      console.warn("[rental-bookings · listings]", res.error.message);
    }
    for (const l of (res.data ?? []) as {
      id: string;
      partner_id: string;
      slug: string;
      make: string;
      model: string;
      year: number | null;
      market: string;
    }[]) {
      listings.set(l.id, l);
    }
  }

  // Decide access FIRST, then load only the operators a reveal is owed
  // for. Loading them unconditionally would put operator names in a
  // process that is one typo away from serialising them.
  const decided = rows.map((row) => {
    const listing = listings.get(row.listing_id) ?? null;
    const access = rentalBookingAccess(
      caller,
      rentalBookingSubject(row, listing?.partner_id),
    );
    return { row, listing, access };
  });

  const revealFor = new Set<string>();
  for (const d of decided) {
    if (d.access.ok && d.access.operatorRevealed && d.listing) {
      revealFor.add(d.listing.partner_id);
    }
  }

  const operators = new Map<string, RentalOperatorIdentity>();
  if (revealFor.size > 0) {
    const res = await db
      .from("partners")
      .select("id, name, contact_email")
      .in("id", [...revealFor]);
    if (res.error) {
      console.warn("[rental-bookings · operators]", res.error.message);
    }
    for (const p of (res.data ?? []) as {
      id: string;
      name: string | null;
      contact_email: string | null;
    }[]) {
      operators.set(p.id, {
        partnerId: p.id,
        name: p.name ?? "",
        email: p.contact_email,
      });
    }
  }

  const out = [];
  for (const d of decided) {
    if (!d.access.ok) continue;
    out.push({
      ...projectRentalBooking(d.row, d.access),
      listing: d.listing ? listingSummary(d.listing) : null,
      operator: discloseOperator(
        d.access,
        d.listing ? (operators.get(d.listing.partner_id) ?? null) : null,
        d.listing?.market,
      ),
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  if (!(await isAllowed(`rental-bookings:read:${clientIp(req)}`, READ_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // ?role=operator is the request inbox 2F will render. Default is the
  // renter's own history (2G). Not a permission switch: an operator asking
  // for renter rows gets their own renter rows, and vice versa — the
  // service-role client bypasses RLS, so the filters below ARE the
  // boundary, exactly as /api/rental-inquiry's GET documents.
  const role = req.nextUrl.searchParams.get("role") === "operator" ? "operator" : "renter";

  const partnerIds = role === "operator" ? await loadPartnerStaffIds(db, user.id) : [];
  const caller: RentalBookingCaller = { userId: user.id, partnerIds };

  let query = db
    .from("rental_bookings")
    .select(RENTAL_BOOKING_COLS)
    // See LIST_ORDER: an inbox and a history want different 200 rows.
    .order(LIST_ORDER[role], { ascending: false })
    .limit(LIST_LIMIT);

  if (role === "operator") {
    if (partnerIds.length === 0) return NextResponse.json({ bookings: [] });
    const mine = await db
      .from("rental_listings")
      .select("id")
      .in("partner_id", partnerIds);
    if (mine.error) {
      if (isTableMissing(mine.error, "rental_listings")) {
        return NextResponse.json({ bookings: [] });
      }
      console.error("[rental-bookings · operator listings]", mine.error);
      return NextResponse.json(
        { error: "Could not fetch bookings." },
        { status: 500 },
      );
    }
    const ids = ((mine.data ?? []) as { id: string }[]).map((l) => l.id);
    if (ids.length === 0) return NextResponse.json({ bookings: [] });
    query = query.in("listing_id", ids);
  } else {
    query = query.eq("renter_user_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    // Pre-0047 window: no booking can exist yet, so an empty history is
    // the truthful degraded state rather than a 500 on every dashboard
    // visit — the same trade /api/rental-inquiry's GET makes for 0040.
    if (isTableMissing(error, "rental_bookings")) {
      return NextResponse.json({ bookings: [] });
    }
    console.error("[rental-bookings · list]", error);
    return NextResponse.json({ error: "Could not fetch bookings." }, { status: 500 });
  }

  // Double cast: RENTAL_BOOKING_COLS is a concatenated string, so
  // supabase-js cannot parse it into a row type and infers its
  // GenericStringError fallback. The hand-written RentalBookingRow is the
  // contract — see the note beside RENTAL_BOOKING_COLS.
  const bookings = await decorate(
    db,
    caller,
    (data ?? []) as unknown as RentalBookingRow[],
  );
  return NextResponse.json({ bookings });
}
