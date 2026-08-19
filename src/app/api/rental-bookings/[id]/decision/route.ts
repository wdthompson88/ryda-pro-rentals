// POST /api/rental-bookings/[id]/decision — the operator answers.
//
// Step 2 of the money flow (RYDA_RENTAL_BUILD_LOOP §2), decision D3:
// request-to-book. Three actions, and each one is a different shape of
// write:
//
//   approve  requested → confirmed. This is the instant the dates are
//            reserved (money-flow step 3c) and, once phase 3B lands, the
//            instant the card is charged. See the scaffold gate below.
//   decline  requested → declined. Terminal; the dates were never held,
//            so nothing is released.
//   propose  a counter-offer. 0047 freezes the dates and the quote on a
//            booking row, so an alternate CANNOT be an edit: it is a NEW
//            'requested' row with initiated_by = 'operator', and the
//            original is declined. The new row is re-quoted from scratch
//            for its own dates — a counter-offer is a new price, and the
//            server is the only thing that computes it.
//
// THE DATABASE IS THE GUARD, NOT THIS ROUTE. 0047 carries the EXCLUDE
// constraint and the state-machine trigger, and both of them fire after
// anything this file could check. So the writes below are issued
// optimistically and the FAILURES are translated:
//
//   23P01  two approvals raced for the same week and this one lost. The
//          renter's dates are gone; that is a 409 with plain words, never
//          a 500. (When 3B lands, this is also where the charge is
//          refunded and the deposit authorization voided — the unwind the
//          0047 header calls the single most important error path in the
//          rail. There is nothing to unwind while the rail is scaffolded.)
//   P0001  a trigger refusal. The expiry clock, a blackout, a sibling
//          listing holding the same VIN and an illegal transition all
//          arrive this way and all say something different to an
//          operator, so each is surfaced as its own message rather than
//          as one generic failure.
//
// AUTHORIZATION is rental-booking-access.ts's, including the part that is
// easy to get backwards: a renter's request is answered by the OPERATOR,
// but an operator's counter-offer is answered by the RENTER. initiated_by
// is what tells the two apart, and rentalBookingDecider() is the only
// place that reads it.
//
// D6: approving is what reveals the operator to the renter. Nothing here
// hands the identity to anyone the disclosure rule has not already
// cleared — discloseOperator() builds every operator block.

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { requireAdmin } from "@/lib/admin-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import {
  PARTNER_FEE_SELECT,
  rentalFeeConfigFromPartner,
  type PartnerFeeColumns,
  type RentalFeeConfig,
} from "@/lib/fees";
import { isColumnMissing } from "@/lib/partner-resolution";
import {
  DEFAULT_BOOKING_HORIZON_DAYS,
  RENTAL_AVAILABILITY_COLS,
  RENTAL_BOOKING_RESERVING_STATUSES,
  parseUtcDay,
  type BookedRange,
  type RentalAvailabilityRow,
} from "@/lib/rental-availability";
import { RENTAL_BOOKING_STATUS } from "@/lib/rental-booking-status";
import {
  quoteRentalBooking,
  rentalQuoteColumns,
  rentalQuoteMessage,
} from "@/lib/rental-quote";
import {
  RENTAL_BOOKING_COLS,
  discloseOperator,
  loadPartnerStaffIds,
  projectRentalBooking,
  rentalBookingAccess,
  rentalBookingDecider,
  rentalBookingSubject,
  type RentalBookingAccessGranted,
  type RentalBookingCaller,
  type RentalBookingInsert,
  type RentalBookingRow,
  type RentalOperatorIdentity,
} from "@/lib/rental-booking-access";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * THE PHASE 3B SCAFFOLD GATE.
 *
 * D1 says the rental total is charged on RYDA's own Stripe account at
 * confirmation, and D5 says a manual-capture deposit hold is placed
 * alongside it. Neither exists yet — phase 3B builds the rail and 3C the
 * hold. Until then this stays false, the approve path writes only the
 * booking, and the response says plainly that no card was touched.
 *
 * It is a constant rather than an env var on purpose: flipping it must be
 * a code change that lands WITH the charge implementation, not a
 * configuration knob that can be switched on against a route that has no
 * idea how to charge anybody. 3B replaces the `if` below with the real
 * off-session PaymentIntent and moves this constant into the Stripe
 * layer.
 */
const RENTAL_CHARGE_RAIL_LIVE: boolean = false;

const DECIDE_IP_LIMIT = 30;
const DECIDE_USER_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/** Open default O5, applied to a counter-offer as it is to a request. */
const REQUEST_EXPIRY_HOURS = 24;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// ── the body ────────────────────────────────────────────────────────

type Decision =
  | { action: "approve" }
  | { action: "decline" }
  | { action: "propose"; startDate: string; endDate: string };

function parseDecision(
  body: unknown,
): { ok: true; value: Decision } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const action = typeof b.action === "string" ? b.action.trim() : "";

  if (action === "approve") return { ok: true, value: { action: "approve" } };
  if (action === "decline") return { ok: true, value: { action: "decline" } };
  if (action !== "propose") {
    return { ok: false, error: "Choose approve, decline or propose." };
  }

  const startDate = typeof b.startDate === "string" ? b.startDate.trim() : "";
  const endDate = typeof b.endDate === "string" ? b.endDate.trim() : "";
  if (parseUtcDay(startDate) === null || parseUtcDay(endDate) === null) {
    return { ok: false, error: "Propose a pickup and a return date." };
  }
  return { ok: true, value: { action: "propose", startDate, endDate } };
}

// ── translating the database's refusals ─────────────────────────────

type Refusal = { reason: string; message: string };

/**
 * WHO IS READING THE REFUSAL.
 *
 * This route is answered by an operator on a renter's request AND by a
 * RENTER on an operator's counter-offer (initiated_by = 'operator' —
 * rentalBookingDecider is what tells the two apart). So the same database
 * error reaches both parties, and half the messages below describe things
 * only an operator can see or act on: their private blackout calendar,
 * their duplicate listing for the same VIN, "propose new dates" — an
 * action the route refuses a renter outright.
 *
 * Sending that copy to a renter is a D6-adjacent leak as well as bad
 * instruction: "another listing for this same car already holds those
 * dates" tells an anonymous operator's counterparty that the operator
 * runs a second listing on the same VIN. A renter is told what happened
 * to THEIR booking and what they can do next, and nothing about the
 * operator's calendar.
 */
type RefusalAudience = "operator" | "renter";

/**
 * A booking write that the constraint or the trigger refused, as
 * something the CALLER can act on. Null means "not one of ours" — the
 * caller logs it and answers 500, because an unrecognised database error
 * is a bug, not a business rule.
 */
function classifyBookingRefusal(
  error: { code?: string; message?: string } | null,
  audience: RefusalAudience = "operator",
): Refusal | null {
  if (!error) return null;
  const msg = (error.message ?? "").toLowerCase();
  const renter = audience === "renter";

  // exclusion_violation — rental_bookings_no_overlap. Someone else's
  // approval got there first.
  if (error.code === "23P01" || msg.includes("rental_bookings_no_overlap")) {
    return {
      reason: "dates_taken",
      message: renter
        ? "Those dates have just been taken on this car, so this booking can no longer be confirmed. Pick another range and send a new request."
        : "Those dates were just taken on this car. This request can no longer be confirmed.",
    };
  }
  if (msg.includes("can no longer be confirmed") || msg.includes("this request expired")) {
    return {
      reason: "expired",
      message: renter
        ? "This offer expired before it was accepted, so it can no longer be confirmed. Send a fresh request for the dates you want."
        : "This request expired before it was answered, so it can no longer be confirmed. Propose new dates instead.",
    };
  }
  // The two branches a renter must NOT be given verbatim. Both collapse
  // to the same renter-facing sentence on purpose — the availability
  // route takes the same line, and for the same reason: which of the
  // operator's reasons closed a day is not the renter's to know, and
  // their next action is identical either way.
  if (msg.includes("blacked out")) {
    return {
      reason: "blackout",
      message: renter
        ? "Those dates aren't available on this car any more. Pick another range and send a new request."
        : "Those dates are blacked out on this car's calendar. Clear the blackout or decline the request.",
    };
  }
  if (msg.includes("same vin")) {
    return {
      reason: "vin_conflict",
      message: renter
        ? "Those dates aren't available on this car any more. Pick another range and send a new request."
        : "Another listing for this same car already holds those dates. Confirm from that listing instead.",
    };
  }
  if (msg.includes("illegal rental_bookings status transition")) {
    return {
      reason: "illegal_transition",
      message: "This booking has already moved on and can't be answered now.",
    };
  }
  return null;
}

// ── the listing (shared by the quote and the payload) ───────────────

type DecisionListing = {
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

/** Load the car, tolerating the pre-0046 window (the operating-window
 *  columns arrive with that migration; their absence means "wide open",
 *  which is what 0046 defaults them to anyway). */
async function loadListing(
  db: SupabaseClient,
  listingId: string,
): Promise<DecisionListing | null> {
  const withWindow = await db
    .from("rental_listings")
    .select(`${LISTING_BASE_COLS}, ${LISTING_WINDOW_COLS}`)
    .eq("id", listingId)
    .maybeSingle();

  let data = withWindow.data as Partial<DecisionListing> | null;

  if (withWindow.error) {
    const windowMissing =
      isColumnMissing(withWindow.error, "available_from") ||
      isColumnMissing(withWindow.error, "available_until") ||
      isColumnMissing(withWindow.error, "booking_horizon_days");
    if (!windowMissing) {
      console.warn("[rental-decision · listing]", withWindow.error.message);
      return null;
    }
    const bare = await db
      .from("rental_listings")
      .select(LISTING_BASE_COLS)
      .eq("id", listingId)
      .maybeSingle();
    if (bare.error) {
      console.warn("[rental-decision · listing]", bare.error.message);
      return null;
    }
    data = bare.data as Partial<DecisionListing> | null;
  }

  if (!data) return null;
  return {
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
  };
}

function listingSummary(listing: DecisionListing) {
  return {
    id: listing.id,
    slug: listing.slug,
    make: listing.make,
    model: listing.model,
    year: listing.year,
    market: listing.market,
  };
}

/** The operator behind a listing. Only ever called once the disclosure
 *  rule has cleared this caller. */
async function loadOperator(
  db: SupabaseClient,
  partnerId: string,
): Promise<RentalOperatorIdentity | null> {
  const res = await db
    .from("partners")
    .select("id, name, contact_email")
    .eq("id", partnerId)
    .maybeSingle();
  if (res.error || !res.data) {
    if (res.error) console.warn("[rental-decision · operator]", res.error.message);
    return null;
  }
  const p = res.data as { id: string; name: string | null; contact_email: string | null };
  return { partnerId: p.id, name: p.name ?? "", email: p.contact_email };
}

// ── the handler ─────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await isAllowed(`rental-decision:ip:${clientIp(req)}`, DECIDE_IP_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!(await isAllowed(`rental-decision:user:${user.id}`, DECIDE_USER_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let parsed;
  try {
    parsed = parseDecision(await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const decision = parsed.value;

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const bookingRes = await db
    .from("rental_bookings")
    .select(RENTAL_BOOKING_COLS)
    .eq("id", id)
    .maybeSingle();
  if (bookingRes.error) {
    if (isTableMissing(bookingRes.error, "rental_bookings")) {
      // Pre-0047: there is no such booking to answer.
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    console.error("[rental-decision · read]", bookingRes.error);
    return NextResponse.json({ error: "Could not load that booking." }, { status: 500 });
  }
  const booking = bookingRes.data as RentalBookingRow | null;
  if (!booking) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const listing = await loadListing(db, booking.listing_id);
  const subject = rentalBookingSubject(booking, listing?.partner_id);

  // Operator staff first — this route exists for them — then admin, which
  // costs an extra auth round trip and is the rarer caller.
  let caller: RentalBookingCaller = {
    userId: user.id,
    partnerIds: await loadPartnerStaffIds(db, user.id),
  };
  let access = rentalBookingAccess(caller, subject);
  if (!access.ok) {
    caller = { ...caller, isAdmin: !!(await requireAdmin(req)) };
    access = rentalBookingAccess(caller, subject);
  }

  if (!access.ok) {
    return access.reason === "unauthenticated"
      ? NextResponse.json({ error: "Sign in required." }, { status: 401 })
      : NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!access.canDecide) {
    // Two very different refusals: the booking is closed, or it is open
    // and the ball is in the other party's court.
    if (booking.status !== RENTAL_BOOKING_STATUS.requested) {
      return NextResponse.json(
        {
          error: `This booking is ${booking.status} — only an open request can be answered.`,
          reason: "not_open",
          status: booking.status,
        },
        { status: 409 },
      );
    }
    const owed = rentalBookingDecider(booking);
    return NextResponse.json(
      {
        error:
          owed === "renter"
            ? "This is your own proposal — it's waiting on the renter."
            : "Only the car's operator can answer this request.",
        reason: "wrong_party",
        awaitsDecisionFrom: owed,
      },
      { status: 403 },
    );
  }

  // A counter-offer is the OPERATOR's move, and the row it writes says so
  // (initiated_by = 'operator', which is what keeps it out of the
  // operator's own inbox and out of the 24h sweep). So propose is only
  // available while the operator is the party being waited on. A renter
  // holding a counter-offer accepts it, declines it, or sends a fresh
  // request of their own — 0047 has no shape for a renter-initiated
  // alternate on someone else's row.
  if (decision.action === "propose" && rentalBookingDecider(booking) !== "operator") {
    return NextResponse.json(
      {
        error:
          "A counter-offer is the operator's move. Approve or decline these dates, or send a new request.",
        reason: "wrong_party",
        awaitsDecisionFrom: rentalBookingDecider(booking),
      },
      { status: 403 },
    );
  }

  if (decision.action === "propose") {
    return propose(db, caller, booking, listing, access, decision);
  }
  return answer(db, caller, booking, listing, access, decision.action);
}

/**
 * The caller's standing against the row as it is AFTER the write.
 *
 * Recomputed rather than patched: canDecide falls away on its own once
 * the status moves, and on an approval the D6 reveal flips for a caller
 * who is the renter (an admin approving a counter-offer on the renter's
 * behalf, say). Falling back to the pre-write verdict with canDecide
 * cleared keeps the response honest if the row somehow no longer resolves.
 */
function accessAfter(
  caller: RentalBookingCaller,
  row: RentalBookingRow,
  listing: DecisionListing | null,
  before: RentalBookingAccessGranted,
): RentalBookingAccessGranted {
  const after = rentalBookingAccess(
    caller,
    rentalBookingSubject(row, listing?.partner_id),
  );
  return after.ok ? after : { ...before, canDecide: false };
}

// ── approve / decline ───────────────────────────────────────────────

async function answer(
  db: SupabaseClient,
  caller: RentalBookingCaller,
  booking: RentalBookingRow,
  listing: DecisionListing | null,
  access: RentalBookingAccessGranted,
  action: "approve" | "decline",
) {
  const next =
    action === "approve"
      ? RENTAL_BOOKING_STATUS.confirmed
      : RENTAL_BOOKING_STATUS.declined;
  // A renter answers an operator's counter-offer through this same
  // function; the copy has to know which of them is reading it.
  const audience: RefusalAudience = access.party === "renter" ? "renter" : "operator";

  if (action === "approve") {
    // THE LISTING HAS TO STILL BE ON THE PLATFORM. The create path
    // refuses a non-active listing outright, and until now nothing
    // re-checked it here — so a car paused or archived after the request
    // went out (0044 permits active → paused → archived) could still be
    // driven to 'confirmed', stamping confirmed_at and reserving the
    // dates in rental_bookings_no_overlap for a car
    // /api/rental-availability now answers `not_listed` for. The renter
    // would hold a confirmed booking that shows on no calendar, and once
    // RENTAL_CHARGE_RAIL_LIVE flips, this is the path that charges a card
    // for a car that is no longer listed.
    //
    // DECLINE IS DELIBERATELY NOT GATED: an operator who has archived a
    // car must still be able to answer the requests it left behind.
    if (!listing || listing.status !== "active") {
      return NextResponse.json(
        {
          error: listing
            ? "This car isn't taking bookings right now. Make the listing active again before confirming, or decline the request."
            : "Could not load that car, so this booking can't be confirmed.",
          reason: "listing_not_active",
          listingStatus: listing?.status ?? null,
        },
        { status: 409 },
      );
    }

    // The trigger refuses this too, and its refusal is translated below.
    // Checking first only buys a better message and one less write.
    if (Date.parse(booking.expires_at) <= Date.now()) {
      return NextResponse.json(
        {
          error:
            audience === "renter"
              ? "This offer expired before it was accepted, so it can no longer be confirmed. Send a fresh request for the dates you want."
              : "This request expired before it was answered, so it can no longer be confirmed. Propose new dates instead.",
          reason: "expired",
          expiredAt: booking.expires_at,
        },
        { status: 409 },
      );
    }

    if (RENTAL_CHARGE_RAIL_LIVE) {
      // PHASE 3B: charge the rental total off-session on the PLATFORM
      // account, then place the D5 deposit hold as a separate
      // manual-capture PaymentIntent, and record both on this row BEFORE
      // the update below — charge_payment_intent_id is write-once
      // precisely so a retried approval can tell it has already charged.
      // A 23P01 on the update is then unwound here: refund the charge,
      // void the authorization.
      return NextResponse.json(
        { error: "The rental charge rail is not implemented yet." },
        { status: 501 },
      );
    }
  }

  // Compare-and-swap on the status. The EXCLUDE constraint decides a
  // same-date race, but two clicks on THIS booking are decided here: the
  // second one matches no row.
  const updated = await db
    .from("rental_bookings")
    .update({ status: next })
    .eq("id", booking.id)
    .eq("status", RENTAL_BOOKING_STATUS.requested)
    .select(RENTAL_BOOKING_COLS)
    .maybeSingle();

  if (updated.error) {
    if (isTableMissing(updated.error, "rental_bookings")) {
      return NextResponse.json(
        { error: "Online booking isn't switched on in this environment yet." },
        { status: 503 },
      );
    }
    const refusal = classifyBookingRefusal(updated.error, audience);
    if (refusal) {
      return NextResponse.json(
        { error: refusal.message, reason: refusal.reason },
        { status: 409 },
      );
    }
    console.error("[rental-decision · update]", updated.error);
    return NextResponse.json(
      { error: "Could not record that decision. Please try again." },
      { status: 500 },
    );
  }

  const row = updated.data as RentalBookingRow | null;
  if (!row) {
    // The CAS matched nothing: somebody answered this request between the
    // read and the write.
    const current = await db
      .from("rental_bookings")
      .select("status")
      .eq("id", booking.id)
      .maybeSingle();
    const status = (current.data as { status?: string } | null)?.status ?? "unknown";
    return NextResponse.json(
      {
        error: `This request was already answered (${status}).`,
        reason: "already_answered",
        status,
      },
      { status: 409 },
    );
  }

  const after = accessAfter(caller, row, listing, access);
  const operator =
    after.operatorRevealed && listing ? await loadOperator(db, listing.partner_id) : null;

  return NextResponse.json({
    ok: true,
    action,
    booking: projectRentalBooking(row, after),
    listing: listing ? listingSummary(listing) : null,
    operator: discloseOperator(after, operator, listing?.market),
    // Whether the renter can now see who the operator is. This is the D6
    // reveal, reported rather than performed: the renter's own GET is
    // what serves it, through the same predicate.
    operatorRevealedToRenter: action === "approve",
    charge:
      action === "approve"
        ? {
            status: "scaffolded" as const,
            railLive: RENTAL_CHARGE_RAIL_LIVE,
            message:
              "Scaffold mode: the dates are held but no card was charged and no deposit was authorized. The on-platform charge and the deposit hold land with phases 3B and 3C.",
          }
        : { status: "none" as const, message: "Nothing was charged; nothing to refund." },
  });
}

// ── propose alternate dates ─────────────────────────────────────────

async function propose(
  db: SupabaseClient,
  caller: RentalBookingCaller,
  booking: RentalBookingRow,
  listing: DecisionListing | null,
  access: RentalBookingAccessGranted,
  decision: { startDate: string; endDate: string },
) {
  if (!listing) {
    return NextResponse.json(
      { error: "Could not load that car, so it can't be re-quoted." },
      { status: 500 },
    );
  }
  // Same gate the approve branch and the create path apply: a
  // counter-offer is an offer to CONFIRM, and a paused or archived car
  // has nothing to offer. Refusing here also keeps the operator from
  // writing a new 'requested' row against a listing the availability
  // route has already stopped serving.
  if (listing.status !== "active") {
    return NextResponse.json(
      {
        error:
          "This car isn't taking bookings right now. Make the listing active again before counter-offering, or decline the request.",
        reason: "listing_not_active",
        listingStatus: listing.status,
      },
      { status: 409 },
    );
  }
  if (
    decision.startDate === booking.start_date &&
    decision.endDate === booking.end_date
  ) {
    return NextResponse.json(
      { error: "Those are the dates that were asked for. Approve or decline instead." },
      { status: 400 },
    );
  }

  // The counter-offer is priced from scratch for ITS dates. 0047 freezes
  // the quote on a row, so carrying the original's numbers onto a
  // different-length stay would write a snapshot that disagrees with the
  // rate the operator is actually offering.
  const bookedRes = await db
    .from("rental_bookings")
    .select("start_date, end_date, status")
    .eq("listing_id", listing.id)
    .in("status", [...RENTAL_BOOKING_RESERVING_STATUSES]);
  if (bookedRes.error) {
    if (isTableMissing(bookedRes.error, "rental_bookings")) {
      return NextResponse.json(
        { error: "Online booking isn't switched on in this environment yet." },
        { status: 503 },
      );
    }
    console.error("[rental-decision · booked]", bookedRes.error);
    return NextResponse.json(
      { error: "Could not check availability. Please try again." },
      { status: 500 },
    );
  }

  // Blackouts. A missing table is exact (pre-0046 there are none); any
  // other error means they exist and we could not read them, and pricing
  // a counter-offer over blackouts we could not see would offer the
  // renter days the operator has blocked. Same fail-closed rule the
  // availability route and the request POST apply to this read.
  const availability = await db
    .from("rental_availability")
    .select(RENTAL_AVAILABILITY_COLS)
    .eq("listing_id", listing.id);
  if (availability.error && !isTableMissing(availability.error, "rental_availability")) {
    console.error("[rental-decision · availability]", availability.error);
    return NextResponse.json(
      { error: "Could not check availability. Please try again." },
      { status: 503 },
    );
  }

  // The operator's full fee terms (0048), not commission_rate alone.
  // This route re-quotes a counter-offer, so it must reach the same
  // numbers the request route did for the same operator — reading a
  // narrower set of columns here than the POST reads is how a
  // counter-offer would come to be priced on different terms from the
  // request it answers.
  let feeConfig: RentalFeeConfig | undefined;
  const partnerRes = await db
    .from("partners")
    .select(PARTNER_FEE_SELECT)
    .eq("id", listing.partner_id)
    .maybeSingle();
  if (partnerRes.error) {
    console.warn("[rental-decision · fee terms]", partnerRes.error.message);
  } else if (partnerRes.data) {
    feeConfig = rentalFeeConfigFromPartner(
      partnerRes.data as unknown as PartnerFeeColumns,
    );
  }

  const quoted = quoteRentalBooking({
    listing,
    startDate: decision.startDate,
    endDate: decision.endDate,
    rows: (availability.data ?? []) as RentalAvailabilityRow[],
    booked: (bookedRes.data ?? []) as BookedRange[],
    feeConfig,
  });
  if (!quoted.ok) {
    return NextResponse.json(
      {
        error: rentalQuoteMessage(quoted.reason, {
          minNights: listing.min_nights,
          maxNights: listing.max_nights,
        }),
        reason: quoted.reason,
      },
      { status: 409 },
    );
  }
  const quote = quoted.quote;

  // ORDER MATTERS: offer first, decline second. If the insert fails the
  // renter still has their original request; if the decline fails they
  // have two open requests, which is untidy but recoverable and visible.
  const insertRow: RentalBookingInsert = {
    // Spread from the quote through the one mapping, exactly as the
    // request POST does — a counter-offer is a new price, and it has to
    // freeze onto the row the same way the original did.
    ...rentalQuoteColumns(quote),
    listing_id: listing.id,
    renter_user_id: booking.renter_user_id,
    // The column 0047 added for exactly this: the counter-offer must not
    // appear in the operator's own inbox, and the 24h sweep must not
    // auto-expire it while the renter is the one being waited on.
    initiated_by: "operator",
    expires_at: new Date(
      Date.now() + REQUEST_EXPIRY_HOURS * 60 * 60 * 1000,
    ).toISOString(),
  };

  const inserted = await db
    .from("rental_bookings")
    .insert(insertRow)
    .select(RENTAL_BOOKING_COLS)
    .single();

  let proposal = inserted.data as RentalBookingRow | null;

  if (inserted.error) {
    if (isTableMissing(inserted.error, "rental_bookings")) {
      return NextResponse.json(
        { error: "Online booking isn't switched on in this environment yet." },
        { status: 503 },
      );
    }
    // rental_bookings_one_open_request_idx: this renter already has an
    // open request for exactly these dates on this car. The offer they
    // would have received already exists — hand that row back rather than
    // failing an operator who is doing the right thing.
    if ((inserted.error as { code?: string }).code === "23505") {
      const existing = await db
        .from("rental_bookings")
        .select(RENTAL_BOOKING_COLS)
        .eq("listing_id", listing.id)
        .eq("renter_user_id", booking.renter_user_id)
        .eq("start_date", quote.startDate)
        .eq("end_date", quote.endDate)
        .eq("status", RENTAL_BOOKING_STATUS.requested)
        .maybeSingle();
      const prior = (existing.data as RentalBookingRow | null) ?? null;
      // initiated_by IS WHAT MAKES A ROW A COUNTER-OFFER, and
      // rental_bookings_one_open_request_idx does not include it — the
      // index is (listing_id, renter_user_id, start_date, end_date), so
      // the row this collided with may be the RENTER's own open request
      // for the same week (a second form mount, or dates they asked for
      // separately). Handing that back as "the counter-offer" reports an
      // offer waiting on the renter when rentalBookingDecider() still
      // says the ball is in the operator's court — and the decline below
      // would then destroy the request the operator was answering, for an
      // offer that never existed. Only an operator-initiated row is one.
      if (prior && prior.initiated_by === "operator") {
        proposal = prior;
      } else if (prior) {
        // Returned BEFORE the decline, so the request being answered
        // stays open and the operator still has something to act on.
        return NextResponse.json(
          {
            error:
              "The renter already has an open request for exactly those dates on this car. Approve that request instead of counter-offering it.",
            reason: "duplicate_open_request",
            conflictingBookingId: prior.id,
            awaitsDecisionFrom: rentalBookingDecider(prior),
          },
          { status: 409 },
        );
      }
    }
    if (!proposal) {
      const refusal = classifyBookingRefusal(inserted.error);
      if (refusal) {
        return NextResponse.json(
          { error: refusal.message, reason: refusal.reason },
          { status: 409 },
        );
      }
      console.error("[rental-decision · propose insert]", inserted.error);
      return NextResponse.json(
        { error: "Could not send that counter-offer. Please try again." },
        { status: 500 },
      );
    }
  }

  if (!proposal) {
    console.error("[rental-decision · propose insert] no row returned");
    return NextResponse.json(
      { error: "Could not send that counter-offer. Please try again." },
      { status: 500 },
    );
  }

  const declined = await db
    .from("rental_bookings")
    .update({ status: RENTAL_BOOKING_STATUS.declined })
    .eq("id", booking.id)
    .eq("status", RENTAL_BOOKING_STATUS.requested)
    .select(RENTAL_BOOKING_COLS)
    .maybeSingle();
  if (declined.error) {
    // The offer is out; the original is still open. Loud, but not fatal —
    // the operator can decline it from the inbox.
    console.error("[rental-decision · propose decline]", declined.error);
  }
  const originalRow = (declined.data as RentalBookingRow | null) ?? booking;

  const afterOriginal = accessAfter(caller, originalRow, listing, access);
  const afterProposal = accessAfter(caller, proposal, listing, access);
  const operator = afterProposal.operatorRevealed
    ? await loadOperator(db, listing.partner_id)
    : null;

  return NextResponse.json({
    ok: true,
    action: "propose",
    // The original, declined — "a re-quote is a NEW row", so both stay
    // legible in the renter's history.
    booking: projectRentalBooking(originalRow, afterOriginal),
    originalDeclined: originalRow.status === RENTAL_BOOKING_STATUS.declined,
    // The counter-offer, now waiting on the renter.
    proposal: projectRentalBooking(proposal, afterProposal),
    listing: listingSummary(listing),
    operator: discloseOperator(afterProposal, operator, listing.market),
    charge: {
      status: "none" as const,
      message:
        "A counter-offer holds no dates and charges nothing. The renter accepts it, and that acceptance is what confirms.",
    },
  });
}
