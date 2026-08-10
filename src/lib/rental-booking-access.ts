// Who may see a rental booking, who may answer it, and — decision D6 —
// who may be told which operator is behind it (migration 0047).
//
// Three routes ask these questions (2D: create, read one, decide) and 2F
// and 2G will ask them again from the operator and renter dashboards. If
// each asked in its own words, the answers would eventually differ, and
// the one that differs in the wrong direction hands a renter the name of
// an operator they have not booked yet. So the questions are asked here,
// once.
//
// THE THREE PARTIES, and why "party" is not a role.
//
//   renter    the user on rental_bookings.renter_user_id.
//   operator  approved staff of the partner that owns the LISTING
//             (public.partner_accounts.status = 'approved' with a
//             partner_id bridge — the same two-hop rule 0044's
//             is_partner_staff() encodes in SQL, restated here for the
//             service-role routes that bypass RLS and must therefore
//             enforce ownership in code, per guardrail 3.7).
//   admin     app_metadata.role = 'admin', via requireAdmin.
//
// A user can hold more than one of these at once (an operator who rents
// a competitor's car; an admin who is also a renter), so this module
// computes each capability independently and only then names a single
// `party` for logging and payload shaping. Capabilities are the truth;
// the label is a convenience.
//
// D6 IS THE REASON THIS FILE EXISTS. Operators stay anonymous — "a
// vetted Miami operator" — through browse and request, and are named to
// the renter only once the booking is confirmed. That is a rule about a
// RENTER's view of a row, not about the row: an operator reading their
// own booking obviously knows who they are, and so does an admin. The
// predicate is isOperatorRevealedToRenter(); the enforcement point that
// routes actually call is discloseOperator(), which cannot be made to
// return an identity for a caller who is not entitled to one.
//
// The reveal keys on confirmed_at, not on the status alone. A booking
// that was confirmed and later cancelled is still a booking the renter
// dealt with a named operator on — hiding the name again would leave
// them unable to say who cancelled their trip. A booking cancelled out
// of 'requested' never had a confirmation and never gets the name. 0047
// stamps confirmed_at exactly once, on the transition that earns it,
// which is what makes it a safe discriminator.
//
// NO server-only import and no Supabase client at module scope: the
// predicates are pure so the Vitest suite next door can pin them without
// a database, exactly as partner-resolution.ts does. The one function
// that needs a query takes the client as an argument (type-only import).
// rental-quote.ts, which this file takes its money columns from, holds
// the same property on purpose — keep it that way, or a client component
// importing a booking type starts pulling server code into the bundle.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RENTAL_BOOKING_STATUS,
  RENTAL_BOOKING_TRANSITIONS,
  reservesRentalDates,
  type RentalBookingStatus,
} from "./rental-booking-status";
import { nightsBetween } from "./rental-availability";
import type { RentalFeePayer, RentalQuoteColumns } from "./rental-quote";

/** Which party opened a booking row — rental_bookings.initiated_by. */
export type RentalBookingInitiator = "renter" | "operator";

export type RentalBookingParty = "renter" | "operator" | "admin";

/**
 * The two parties that can be waiting on a decision. `admin` is
 * deliberately absent: an admin may act on behalf of either side, but a
 * request is never *waiting on* an admin.
 */
export type RentalBookingDecider = Extract<
  RentalBookingParty,
  "renter" | "operator"
>;

/**
 * Row shape of public.rental_bookings (migration 0047), as the 2D routes
 * read it with the service-role client.
 *
 * THE MONEY COLUMNS ARE NOT RESTATED HERE. They arrive as
 * RentalQuoteColumns, the same type rentalQuoteColumns() produces from a
 * RentalQuote — so the dates and the nine frozen amounts a route WRITES
 * and the ones it READS BACK are one declaration, and a booking row
 * cannot come to store different numbers from the ones the renter was
 * quoted. Everything below the intersection is state the database owns
 * and no quote has an opinion about.
 *
 * Two columns 0047 defines are deliberately absent, and their absence is
 * the point: charge_payment_intent_id and deposit_payment_intent_id are
 * raw Stripe object ids that 0047 withholds from `authenticated`
 * outright. Nothing on a renter's or an operator's screen needs one, so
 * they are not selected, cannot be projected, and cannot leak. Phase 3B
 * reads them with its own select list.
 */
export type RentalBookingRow = RentalQuoteColumns & {
  id: string;
  listing_id: string;
  renter_user_id: string;
  status: RentalBookingStatus;
  initiated_by: RentalBookingInitiator;
  deposit_status: string;
  deposit_authorized_at: string | null;
  deposit_auth_expires_at: string | null;
  deposit_captured_cents: number;
  expires_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  decided_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * The columns a route may write when OPENING a booking — the frozen
 * quote, plus the facts that are not the quote's to know.
 *
 * `status` is absent and that is the contract, not an omission: 0047
 * defaults it to 'requested', and a request must never be inserted
 * straight into a status that holds dates. Typing the insert is what
 * makes that structural — a route cannot add the column without a
 * compile error, where an untyped object literal would let it through to
 * the trigger.
 */
export type RentalBookingInsert = RentalQuoteColumns & {
  listing_id: string;
  renter_user_id: string;
  initiated_by: RentalBookingInitiator;
  /** ISO timestamp — open default O5's 24h clock. */
  expires_at: string;
  /** Idempotency token from the browser; null when it sent none. */
  client_token?: string | null;
};

/**
 * Select list for RentalBookingRow. Must drift with the type above — a
 * column-name typo inside a .select() string is not a type error, the
 * same trap rental-listings-db.ts and rental-availability.ts document.
 */
export const RENTAL_BOOKING_COLS =
  "id, listing_id, renter_user_id, start_date, end_date, status, initiated_by, " +
  "base_amount_cents, fee_cents, fee_payer, deposit_amount_cents, " +
  "renter_total_cents, operator_net_cents, currency, deposit_status, " +
  "deposit_authorized_at, deposit_auth_expires_at, deposit_captured_cents, " +
  "expires_at, confirmed_at, completed_at, decided_at, cancelled_by, " +
  "created_at, updated_at";

/**
 * Everything about a booking this module reasons over: the row, plus the
 * one fact that lives a join away — which partner owns the listing.
 *
 * Structural, so a full RentalBookingRow spread with listing_partner_id
 * satisfies it and a hand-built object in a test does too.
 */
export type RentalBookingSubject = {
  renter_user_id: string;
  status: RentalBookingStatus;
  initiated_by: RentalBookingInitiator;
  confirmed_at?: string | null;
  /** public.rental_listings.partner_id for this booking's listing. */
  listing_partner_id?: string | null;
};

/**
 * The caller, reduced to what authorization needs.
 *
 * `partnerIds` is the list of operators this user is APPROVED staff for
 * (loadPartnerStaffIds below). Empty or absent means "not operator
 * staff", which is also what a failed lookup produces — this module
 * fails closed in every direction, because the cost of a wrong `false`
 * is a route the operator has to retry and the cost of a wrong `true`
 * is one company reading another's bookings.
 */
export type RentalBookingCaller = {
  userId: string | null;
  isAdmin?: boolean;
  partnerIds?: readonly string[];
};

export type RentalBookingAccessGranted = {
  ok: true;
  /** Highest-precedence label: renter → operator → admin. */
  party: RentalBookingParty;
  /** True when this caller may approve / decline / propose right now. */
  canDecide: boolean;
  /** True when this caller may be shown the operator's identity (D6). */
  operatorRevealed: boolean;
};

export type RentalBookingAccessDenied = {
  ok: false;
  /**
   * `unauthenticated` → 401, sign in.
   * `not_a_party`     → 404, NOT 403: telling a stranger that a booking
   *                     id exists is itself a disclosure, and there is
   *                     nothing they can do with the knowledge.
   */
  reason: "unauthenticated" | "not_a_party";
};

export type RentalBookingAccess =
  | RentalBookingAccessGranted
  | RentalBookingAccessDenied;

// ── The three capabilities ──────────────────────────────────────────

export function isRentalBookingRenter(
  caller: RentalBookingCaller,
  subject: RentalBookingSubject,
): boolean {
  return !!caller.userId && caller.userId === subject.renter_user_id;
}

/**
 * Approved staff of the partner that owns this booking's listing.
 *
 * A subject with no listing_partner_id (the join failed, or the caller
 * built the subject without it) is never staff-owned. That is the fail-
 * closed direction: an unknown owner must not resolve to "everyone".
 */
export function isRentalBookingOperatorStaff(
  caller: RentalBookingCaller,
  subject: RentalBookingSubject,
): boolean {
  const partnerId = subject.listing_partner_id;
  if (!partnerId) return false;
  return (caller.partnerIds ?? []).includes(partnerId);
}

export function isRentalBookingAdmin(caller: RentalBookingCaller): boolean {
  return caller.isAdmin === true && !!caller.userId;
}

// ── Whose turn it is ────────────────────────────────────────────────

/**
 * Whether this booking is still waiting for an answer.
 *
 * Derived from the shared transition map rather than restated: only a
 * status that may still become 'confirmed' is awaiting a decision, and
 * in 0047 that is exactly 'requested'. If a future migration adds
 * another such status, this follows it without an edit.
 */
export function awaitsRentalBookingDecision(
  subject: Pick<RentalBookingSubject, "status">,
): boolean {
  return RENTAL_BOOKING_TRANSITIONS[subject.status].includes(
    RENTAL_BOOKING_STATUS.confirmed,
  );
}

/**
 * WHICH party owes the answer.
 *
 * Normally the operator: a renter asks, an operator approves (D3). But
 * "propose alternate dates" is modelled by 0047 as a NEW requested row
 * with initiated_by = 'operator' — a counter-offer — and the ball on
 * that row is in the RENTER's court. initiated_by is the column 0047
 * added precisely so the inbox and the 24h sweep can tell the two apart;
 * this is the function that reads it.
 */
export function rentalBookingDecider(
  subject: Pick<RentalBookingSubject, "initiated_by">,
): RentalBookingDecider {
  return subject.initiated_by === "operator" ? "renter" : "operator";
}

// ── D6: the operator reveal ─────────────────────────────────────────

/**
 * Whether the RENTER on this booking may be told who the operator is.
 *
 * "Confirmed or later", with confirmed_at as the discriminator rather
 * than the status alone — see the file header for why a cancelled-after-
 * confirmation booking keeps the name and a cancelled-out-of-requested
 * one never earns it.
 */
export function isOperatorRevealedToRenter(
  subject: Pick<RentalBookingSubject, "status" | "confirmed_at">,
): boolean {
  if (subject.confirmed_at) return true;
  // confirmed | in_progress — the statuses that hold the dates (0047).
  if (reservesRentalDates(subject.status)) return true;
  return subject.status === RENTAL_BOOKING_STATUS.completed;
}

/** The operator's real identity, as the post-confirmation reveal shows it. */
export type RentalOperatorIdentity = {
  partnerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export type RentalOperatorDisclosure =
  | { revealed: true; operator: RentalOperatorIdentity }
  | { revealed: false; label: string };

/**
 * The pre-confirmation stand-in. Same promise the public grid and the
 * customer inquiry email already make — see the customer-facing copy in
 * /api/rental-inquiry, which this must not contradict.
 */
export function anonymousOperatorLabel(market?: string | null): string {
  const m = (market ?? "").trim();
  return m ? `A vetted ${m} operator` : "A vetted RYDA operator";
}

/**
 * THE ENFORCEMENT POINT. Every route builds its operator block through
 * this function, so D6 is one branch in one file rather than a rule each
 * route remembers.
 *
 * Returns the anonymous label whenever the caller is not entitled to the
 * identity — including when access was denied outright, and including
 * when the caller IS entitled but no identity was loaded (a partners
 * lookup that failed or a pre-0041 environment). A missing name degrades
 * to "a vetted Miami operator", never to a half-populated object.
 */
export function discloseOperator(
  access: RentalBookingAccess,
  operator: RentalOperatorIdentity | null | undefined,
  market?: string | null,
): RentalOperatorDisclosure {
  if (!access.ok || !access.operatorRevealed || !operator || !operator.name) {
    return { revealed: false, label: anonymousOperatorLabel(market) };
  }
  return { revealed: true, operator };
}

// ── The one answer routes ask for ───────────────────────────────────

/**
 * May this caller see this booking, act on it, and be told who the
 * operator is?
 *
 * Capabilities are computed independently and combined; `party` is the
 * highest-precedence label for logging and payload shaping. Renter wins
 * the label over operator so a renter's own row reads as theirs even on
 * a car their employer happens to own.
 */
export function rentalBookingAccess(
  caller: RentalBookingCaller,
  subject: RentalBookingSubject,
): RentalBookingAccess {
  if (!caller.userId) return { ok: false, reason: "unauthenticated" };

  const renter = isRentalBookingRenter(caller, subject);
  const staff = isRentalBookingOperatorStaff(caller, subject);
  const admin = isRentalBookingAdmin(caller);

  if (!renter && !staff && !admin) return { ok: false, reason: "not_a_party" };

  const party: RentalBookingParty = renter
    ? "renter"
    : staff
      ? "operator"
      : "admin";

  const decider = rentalBookingDecider(subject);
  const canDecide =
    awaitsRentalBookingDecision(subject) &&
    (admin || (decider === "operator" ? staff : renter));

  // The operator's own staff and an admin always see the identity — for
  // staff it IS their identity. Only the renter is gated by D6.
  const operatorRevealed =
    staff || admin || (renter && isOperatorRevealedToRenter(subject));

  return { ok: true, party, canDecide, operatorRevealed };
}

/** Fold a row plus its listing's owner into the subject shape. */
export function rentalBookingSubject(
  row: Pick<
    RentalBookingRow,
    "renter_user_id" | "status" | "initiated_by" | "confirmed_at"
  >,
  listingPartnerId: string | null | undefined,
): RentalBookingSubject {
  return {
    renter_user_id: row.renter_user_id,
    status: row.status,
    initiated_by: row.initiated_by,
    confirmed_at: row.confirmed_at,
    listing_partner_id: listingPartnerId ?? null,
  };
}

// ── The payload ─────────────────────────────────────────────────────

/**
 * A booking as an API response, camelCased.
 *
 * feeCents and operatorNetCents are present for an operator or an admin
 * and ABSENT for a renter. That mirrors the column grants in 0047 §5:
 * together those two numbers are RYDA's commission on the deal, which
 * guardrail 3.7 keeps out of the browser. A renter loses nothing they
 * are entitled to — when the fee is theirs to pay it is derivable from
 * their own receipt (renterTotalCents - baseAmountCents), and when it is
 * the operator's it is none of their business. These routes read with
 * the service-role client, which bypasses those grants, so the omission
 * has to happen here.
 */
export type RentalBookingView = {
  id: string;
  listingId: string;
  renterUserId: string;
  startDate: string;
  endDate: string;
  /** Billable nights. null only if the row carries unparseable dates. */
  nights: number | null;
  status: RentalBookingStatus;
  initiatedBy: RentalBookingInitiator;
  /** Who owes the next answer, or null once the row is past deciding. */
  awaitsDecisionFrom: RentalBookingDecider | null;
  currency: string;
  baseAmountCents: number;
  renterTotalCents: number;
  feePayer: RentalFeePayer;
  depositAmountCents: number;
  depositStatus: string;
  /** Only meaningful while the request is unanswered (0047). */
  expiresAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  decidedAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Operator + admin only. See the note above. */
  feeCents?: number;
  /** Operator + admin only. See the note above. */
  operatorNetCents?: number;
};

/**
 * The car, as every booking payload describes it.
 *
 * partner_id is NOT here and its absence is D6 in the type system: this
 * is the block that travels to a renter's browser, and the operator's
 * identity reaches it only through discloseOperator() below. Both booking
 * routes build their listing block by annotating against this type, so a
 * column added to one of those select lists cannot reach a payload
 * without passing through here first.
 */
export type RentalBookingListingSummary = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number | null;
  market: string;
};

/**
 * ONE BOOKING, AS THE API SENDS IT — the shape every surface consumes.
 *
 * This is what GET /api/rental-bookings returns per row, and what
 * GET /api/rental-bookings/[id] returns spread across its `booking`,
 * `listing` and `operator` keys. It is declared here, beside the
 * projection and the disclosure that produce it, because three client
 * surfaces read it (the renter's /account/rentals, the operator's
 * /partner/requests, the post-submit /rent/booking-requested) and each of
 * them had hand-typed its own version. Three hand-typed copies of a
 * payload are three chances for one of them to describe a field the
 * server does not send — or, worse, to keep describing one it stopped
 * sending.
 *
 * `operator` is REQUIRED, and that is the point of putting it in the row
 * type rather than leaving each surface to remember it: the disclosure is
 * how an operator's identity reaches a screen at all, so a surface that
 * wants to name one has to go through discloseOperator()'s verdict to get
 * a name to render.
 */
export type RentalBookingItem = RentalBookingView & {
  /** null when the listing row could not be loaded — never a partial. */
  listing: RentalBookingListingSummary | null;
  operator: RentalOperatorDisclosure;
};

export function projectRentalBooking(
  row: RentalBookingRow,
  access: RentalBookingAccessGranted,
): RentalBookingView {
  const awaiting = awaitsRentalBookingDecision(row);
  const view: RentalBookingView = {
    id: row.id,
    listingId: row.listing_id,
    renterUserId: row.renter_user_id,
    startDate: row.start_date,
    endDate: row.end_date,
    nights: nightsBetween(row.start_date, row.end_date),
    status: row.status,
    initiatedBy: row.initiated_by,
    awaitsDecisionFrom: awaiting ? rentalBookingDecider(row) : null,
    currency: row.currency,
    baseAmountCents: row.base_amount_cents,
    renterTotalCents: row.renter_total_cents,
    feePayer: row.fee_payer,
    depositAmountCents: row.deposit_amount_cents,
    depositStatus: row.deposit_status,
    expiresAt: awaiting ? row.expires_at : null,
    confirmedAt: row.confirmed_at,
    completedAt: row.completed_at,
    decidedAt: row.decided_at,
    cancelledBy: row.cancelled_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (access.party !== "renter") {
    view.feeCents = row.fee_cents;
    view.operatorNetCents = row.operator_net_cents;
  }
  return view;
}

// ── The one query ───────────────────────────────────────────────────

/**
 * The partners this user is APPROVED staff for — the TypeScript half of
 * 0044's is_partner_staff(), for the service-role routes that bypass RLS
 * and must therefore enforce ownership in code.
 *
 * Only 'approved' counts, exactly as the SQL function has it: a pending
 * applicant has not been vetted and a suspended one has been switched
 * off, and neither may answer a booking request.
 *
 * Never throws, and never fails open. A missing partner_accounts table
 * (a pre-0042 environment), a schema-cache miss or a transport error all
 * return an empty list, which costs an operator a 404 they can retry —
 * where the opposite mistake would hand them someone else's bookings.
 */
export async function loadPartnerStaffIds(
  db: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await db
    .from("partner_accounts")
    .select("partner_id")
    .eq("user_id", userId)
    .eq("status", "approved");

  if (error) {
    console.warn("[rental-booking-access · partner staff lookup]", error.message);
    return [];
  }

  const ids: string[] = [];
  for (const row of (data ?? []) as { partner_id: string | null }[]) {
    if (typeof row.partner_id === "string" && row.partner_id) {
      ids.push(row.partner_id);
    }
  }
  return ids;
}
