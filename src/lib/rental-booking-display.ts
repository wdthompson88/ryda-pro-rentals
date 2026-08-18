// How a rental booking READS — the words, the tones, the clock and the
// money formatting that every booking surface shares.
//
// Three surfaces render the same rows out of /api/rental-bookings: the
// renter's /account/rentals (2G), the operator's /partner/requests (2F)
// and the post-submit /rent/booking-requested (2D). They were built in
// parallel and each arrived with its own copy of all four things, which
// had already drifted in the way parallel copies always do:
//
//   · migration 0047's `in_progress` rendered "Out now" on one surface
//     and "Out with the renter" on another;
//   · a request past its 24-hour window read "Expired" in one place and
//     "Timed out" in the next;
//   · the same tone was `bg-success/10` here and `bg-success/15` there;
//   · three private formatCents() helpers, three expiry predicates, and
//     one of the three date formatters parsed a UTC calendar day at LOCAL
//     noon — the exact bug rental-availability.ts opens with "UTC OR
//     NOTHING" about.
//
// A renter and an operator looking at the SAME booking must not be
// looking at two different words for its state, so the vocabulary lives
// here once and the surfaces import it. Perspective is a PARAMETER, not
// a second copy: the only labels that legitimately differ by audience are
// the ones about whose turn it is, and those sit side by side in one
// entry below where the difference is visible.
//
// PURE, AND IT MUST STAY THAT WAY. No React, no server-only import, no
// Supabase client — this module is pulled into three client bundles.
// rental-booking-access.ts, which it takes its types from, holds the same
// property for the same reason; see its header.

import { formatUSD } from "./market-data";
import { parseUtcDay } from "./rental-availability";
import {
  RENTAL_BOOKING_STATUS,
  type RentalBookingStatus,
} from "./rental-booking-status";
import type { RentalBookingView } from "./rental-booking-access";

/**
 * Which side of the booking is reading.
 *
 * Deliberately the same two values as RentalBookingDecider, so
 * `awaitsDecisionFrom === audience` is the whole "is this mine to
 * answer?" test and no surface has to restate it. An admin reading
 * either surface reads it as that surface's audience — the party label
 * is rental-booking-access.ts's business, not the chip's.
 */
export type RentalBookingAudience = "renter" | "operator";

// ── money ───────────────────────────────────────────────────────────

/**
 * Cents as dollars, showing cents only when the amount is not whole.
 *
 * formatUSD rounds to whole dollars and 0044 constrains daily_rate_cents
 * only to `> 0`, so a stay quoted at $4,351.50 must not render "$4,352"
 * beside a night count it no longer multiplies out against. A
 * non-finite amount renders an em dash rather than "$NaN": every money
 * field on these surfaces is optional in at least one payload shape
 * (projectRentalBooking withholds feeCents and operatorNetCents from a
 * renter), and a broken figure is worse than an absent one.
 */
export function formatBookingCents(cents: number): string {
  if (!Number.isFinite(cents)) return "—";
  return formatUSD(cents / 100, { decimals: cents % 100 === 0 ? 0 : 2 });
}

// ── calendar days ───────────────────────────────────────────────────

/**
 * A 'YYYY-MM-DD' calendar day, spoken — parsed and formatted in UTC.
 *
 * parseUtcDay + `timeZone: "UTC"`, never `new Date(iso)` and never a
 * local-noon anchor. start_date and end_date are bare calendar days, and
 * letting the browser reinterpret one in local time is how a Miami
 * evening becomes the previous day. The date picker formats its cells
 * exactly this way, and one of the three surfaces this replaces did not
 * — so a booking could be listed on Aug 4 and confirmed on Aug 5.
 */
export function formatBookingDay(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  const ms = parseUtcDay(iso);
  if (ms === null) return iso;
  return new Date(ms).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

/** "Aug 5 – Aug 8, 2026". The year lands once, on the return date. */
export function formatBookingStay(startDate: string, endDate: string): string {
  return `${formatBookingDay(startDate, {
    month: "short",
    day: "numeric",
  })} – ${formatBookingDay(endDate)}`;
}

/** "3 nights", or null when the row carries unparseable dates. */
export function formatBookingNights(nights: number | null): string | null {
  if (nights === null || nights < 0) return null;
  return `${nights} night${nights === 1 ? "" : "s"}`;
}

/**
 * The expiry deadline as a WALL CLOCK time — the one place a local zone
 * is correct, and the reason it is a separate function from
 * formatBookingDay above.
 *
 * expires_at is a real instant (0047 stores it as timestamptz), not a
 * calendar day, so "8:40 PM tomorrow" in the reader's own zone is the
 * useful rendering of O5's 24-hour clock. Client-side only, so there is
 * no server/client mismatch to hydrate against.
 */
export function formatBookingDeadline(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── the clock ───────────────────────────────────────────────────────

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * How long until an ISO INSTANT, or null when there isn't one to read.
 *
 * UTC-anchored by construction and not by convention: Date.parse on an
 * ISO-8601 timestamp with an offset (which is what PostgREST sends for
 * timestamptz) yields an absolute epoch value, so the arithmetic below
 * is zone-free. This is the only clock reading on these surfaces — no
 * surface subtracts dates of its own.
 */
export function msUntilInstant(
  iso: string | null | undefined,
  nowMs: number,
): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isFinite(at) ? at - nowMs : null;
}

/**
 * LAZY EXPIRY — the read-side half of open default O5, and the one
 * definition of it.
 *
 * A request whose expires_at has passed is still sitting in the table as
 * 'requested': 4D notes Vercel's daily-cron cap, so there is no sub-daily
 * sweep to stamp it. But 0047's trigger REFUSES requested → confirmed
 * past that instant and the decision route checks the same clock before
 * it writes, so the request cannot become a booking. Every surface must
 * therefore read it as closed — an operator's Approve button that can
 * only ever produce a 409, or a renter told to keep waiting for an answer
 * that can no longer arrive, are the same defect from two sides.
 *
 * Only a still-open request can expire: projectRentalBooking() sends
 * expiresAt at all only while the booking awaits a decision. An absent or
 * unreadable value is treated as NOT expired — the deliberately generous
 * direction, because the trigger is the authority and a clock this code
 * cannot read should yield the server's answer, not a guess.
 */
export function isRentalRequestExpired(
  booking: Pick<RentalBookingView, "status" | "expiresAt">,
  nowMs: number,
): boolean {
  if (booking.status !== RENTAL_BOOKING_STATUS.requested) return false;
  const left = msUntilInstant(booking.expiresAt, nowMs);
  return left !== null && left <= 0;
}

/**
 * A duration, bare: "under a minute", "45m", "13h 40m", "2d 4h".
 *
 * Bare rather than pre-framed, so each surface writes its own sentence
 * around one set of numbers — "You have 13h 40m to answer", "This offer
 * expires in 13h 40m" — instead of two helpers producing two vocabularies
 * for the same interval.
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "under a minute";
  if (ms < MINUTE_MS) return "under a minute";
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m`;
  if (ms < DAY_MS) {
    const h = Math.floor(ms / HOUR_MS);
    const m = Math.floor((ms % HOUR_MS) / MINUTE_MS);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(ms / DAY_MS);
  const h = Math.floor((ms % DAY_MS) / HOUR_MS);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/** How long ago, given msUntilInstant()'s negative answer. */
export function formatTimeAgo(msUntil: number): string {
  const past = Math.max(0, -msUntil);
  if (past < MINUTE_MS) return "just now";
  return `${formatDuration(past)} ago`;
}

/**
 * Requests this OPERATOR still owes an answer on — the count /partner
 * badges its fleet panel with and the set /partner/requests puts first.
 *
 * Three conditions, none optional: still open, waiting on the operator
 * (not a counter-offer of their own, which awaits the RENTER), and not
 * past its window. Defined here rather than in the inbox component
 * because the dashboard reads it too, and two definitions of "waiting on
 * you" would eventually disagree — with the one on the dashboard being
 * the one nobody notices is wrong.
 */
export function needsOperatorAnswer(
  booking: Pick<
    RentalBookingView,
    "status" | "expiresAt" | "awaitsDecisionFrom"
  >,
  nowMs: number,
): boolean {
  return (
    booking.status === RENTAL_BOOKING_STATUS.requested &&
    booking.awaitsDecisionFrom === "operator" &&
    !isRentalRequestExpired(booking, nowMs)
  );
}

export function countOperatorRequests(
  bookings: readonly Pick<
    RentalBookingView,
    "status" | "expiresAt" | "awaitsDecisionFrom"
  >[],
  nowMs: number,
): number {
  let n = 0;
  for (const b of bookings) if (needsOperatorAnswer(b, nowMs)) n += 1;
  return n;
}

// ── status chips ────────────────────────────────────────────────────

/**
 * What a chip MEANS, before it is a colour.
 *
 *   action   this reader has to do something, now.
 *   waiting  somebody else has to, and a clock is running.
 *   good     it is happening, or it happened.
 *   closed   over — answered, expired, cancelled, done.
 */
export type RentalBookingTone = "action" | "waiting" | "good" | "closed";

/**
 * Tone → Tailwind, in tokens only.
 *
 * `-deep` text on every tinted wash: the plain token on a 10–15% wash
 * sits under the 4.5:1 AA floor, and these chips are how both sides of a
 * booking know whether it is theirs to answer. `closed` uses ink-soft
 * (10:1 on cream) rather than mute, which the three originals disagreed
 * about.
 */
export const RENTAL_BOOKING_TONE_CLASS: Record<RentalBookingTone, string> = {
  action: "bg-red/10 text-red-deep",
  waiting: "bg-warn/15 text-warn-deep",
  good: "bg-success/15 text-success-deep",
  closed: "bg-cream-2 text-ink-soft",
};

/**
 * The chip's shape: one word for both sides, or — for the states where
 * the two sides genuinely see something different — their two words,
 * side by side in the same entry so the difference is visible and
 * deliberate rather than the product of two files.
 */
type ChipSpec = {
  tone: RentalBookingTone;
  label: string | Record<RentalBookingAudience, string>;
};

/**
 * EVERY 0047 status, once.
 *
 * `satisfies Record<RentalBookingStatus, …>` pins this to the migration's
 * CHECK constraint: a status added to 0047 and to rental-booking-status.ts
 * but not to this map is a compile error, not three surfaces quietly
 * rendering three different fallbacks.
 *
 * `requested` is the only entry with a second reading, and the reason is
 * structural: 0047 models "the operator proposed other dates" as a NEW
 * requested row with initiated_by = 'operator', so an operator's own
 * counter-offer is byte-for-byte a request. Whose turn it is comes from
 * awaitsDecisionFrom — rentalBookingDecider()'s answer, computed
 * server-side — never from the status and never re-derived here.
 */
const STATUS_CHIP = {
  requested: {
    tone: "waiting",
    label: { renter: "Awaiting operator", operator: "Waiting on the renter" },
    /** The same status when the ball is in THIS reader's court. */
    yourTurn: {
      tone: "action",
      label: { renter: "Your answer needed", operator: "Needs your answer" },
    },
  },
  confirmed: { tone: "good", label: "Confirmed" },
  in_progress: {
    tone: "good",
    label: { renter: "Out now", operator: "Out with the renter" },
  },
  completed: { tone: "closed", label: "Completed" },
  declined: { tone: "closed", label: "Declined" },
  expired: { tone: "closed", label: "Expired" },
  cancelled: { tone: "closed", label: "Cancelled" },
} as const satisfies Record<
  RentalBookingStatus,
  ChipSpec & { yourTurn?: ChipSpec }
>;

/**
 * A request whose window ran out while the row still says 'requested'.
 *
 * The SAME word as the `expired` status above, deliberately: they are the
 * same fact one sweep apart, and calling one "Expired" and the other
 * "Timed out" told a renter and an operator that two identical rows were
 * in different states.
 */
const LAPSED: ChipSpec = { tone: "closed", label: "Expired" };

export type RentalBookingChip = {
  label: string;
  tone: RentalBookingTone;
  /** RENTAL_BOOKING_TONE_CLASS[tone], carried so callers need one call. */
  className: string;
};

/**
 * The two turn-states of an open request, as a heading rather than a chip.
 *
 * The operator's inbox groups its cards under exactly these two states,
 * and the heading was typed out beside the chips it heads — so "Needs
 * your answer" existed twice, once as a group title and once on every
 * card inside that group, with nothing keeping them in step. This reads
 * the same map, so re-wording a chip re-words its heading.
 */
export function rentalRequestTurnLabel(
  audience: RentalBookingAudience,
  turn: "yours" | "theirs",
): string {
  const spec = turn === "yours" ? STATUS_CHIP.requested.yourTurn : STATUS_CHIP.requested;
  return spec.label[audience];
}

function resolve(
  spec: ChipSpec,
  audience: RentalBookingAudience,
): RentalBookingChip {
  const label =
    typeof spec.label === "string" ? spec.label : spec.label[audience];
  return {
    label,
    tone: spec.tone,
    className: RENTAL_BOOKING_TONE_CLASS[spec.tone],
  };
}

/**
 * The chip for one booking, as one audience sees it.
 *
 * A status from a later migration this build does not know about
 * degrades to a neutral chip carrying the raw value, rather than hiding
 * the booking or rendering a blank pill.
 */
export function rentalBookingChip(
  booking: Pick<
    RentalBookingView,
    "status" | "expiresAt" | "awaitsDecisionFrom"
  >,
  audience: RentalBookingAudience,
  nowMs: number,
): RentalBookingChip {
  if (isRentalRequestExpired(booking, nowMs)) return resolve(LAPSED, audience);

  const spec = (
    STATUS_CHIP as Record<string, (ChipSpec & { yourTurn?: ChipSpec }) | undefined>
  )[booking.status];
  if (!spec) {
    return {
      label: booking.status,
      tone: "closed",
      className: RENTAL_BOOKING_TONE_CLASS.closed,
    };
  }

  const turned =
    spec.yourTurn && booking.awaitsDecisionFrom === audience
      ? spec.yourTurn
      : spec;
  return resolve(turned, audience);
}

// ── focus ───────────────────────────────────────────────────────────

/**
 * The keyboard focus treatment, once.
 *
 * Matches rental-date-picker.tsx, the surface that worked this out: an
 * outline rather than a ring, because an outline is not clipped by an
 * ancestor's overflow, and NO `focus:outline-none` beside it — the two
 * compile to the same specificity, a keyboard focus matches both, and the
 * pair resolves to no visible focus at all. See that file's note.
 */
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red";
