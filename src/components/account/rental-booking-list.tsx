"use client";

// The renter's "My rentals" list — every public.rental_bookings row this
// account owns, grouped by what is actually true of it (build loop 2G).
//
// ONE SOURCE FOR THE DATA, AND NO SECOND OPINION ABOUT THE RULES.
// GET /api/rental-bookings returns the caller's own bookings already
// projected through projectRentalBooking() and discloseOperator() in
// src/lib/rental-booking-access.ts. Two of those decisions are the whole
// reason this component does not re-derive anything:
//
//   D6 — THE OPERATOR REVEAL. The operator is named here if and only if
//   the payload says `operator.revealed`. That flag is
//   isOperatorRevealedToRenter()'s answer, keyed on confirmed_at,
//   computed on the server for a caller the route has already
//   authenticated. Re-deriving it in the browser ("show the name when
//   status === 'confirmed'") is exactly the drift rental-booking-access.ts
//   exists to prevent, and the direction it drifts in hands a renter the
//   name of an operator they have not booked yet. The payload for a
//   booking that was never confirmed carries no partner name, email or
//   id at all — so there is nothing here to leak and nothing here that
//   decides.
//
//   WHOSE TURN IT IS. `awaitsDecisionFrom` is rentalBookingDecider()'s
//   answer, read from initiated_by. It matters on this surface because
//   0047 models "the operator proposed other dates" as a NEW `requested`
//   row with initiated_by = 'operator' — a row that is waiting on the
//   RENTER. Filing that under "Awaiting the operator" would tell the
//   renter the exact opposite of the truth, so it gets its own group —
//   and, because it is genuinely theirs to answer, the two buttons that
//   answer it. This surface is the ONLY client that posts a renter's
//   decision to /api/rental-bookings/[id]/decision; without them a
//   counter-offer is a row the server authorizes the renter to decide
//   and the product gives them no way to decide, so every one of them
//   lapses at the 24-hour mark.
//
// GUARDRAIL 3.9 — THE MONEY RAIL DOES NOT EXIST YET.
// RENTAL_CHARGE_RAIL_LIVE is false in the decision route: approving a
// booking writes a status and nothing else. No card is collected
// anywhere on this path — there is no SetupIntent, no payment method on
// file, no authorization and no hold. Every line of copy below states
// what the code does and stops there. The figure on each card is the
// FROZEN QUOTE (0047's snapshot) — what a card will be charged once 3B
// lands — and calling it anything more today would be a promise this
// codebase cannot keep.
//
// EVERY FAILURE DEGRADES. 0046 and 0047 are written but applied to no
// database, so the list route answers a missing table with
// `{ bookings: [] }`. That arrives here as the ordinary empty state,
// which is the truthful one: a database that cannot hold a booking holds
// none. A 401 asks for a sign-in, anything else offers a retry, and
// neither is a crash.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api-fetch";
import { utcDayOf } from "@/lib/rental-availability";
import { RENTAL_BOOKING_STATUS } from "@/lib/rental-booking-status";
import type {
  RentalBookingItem,
  RentalBookingListingSummary,
} from "@/lib/rental-booking-access";
import {
  FOCUS_RING,
  formatBookingCents,
  formatBookingDay,
  formatBookingNights,
  formatDuration,
  isRentalRequestExpired,
  msUntilInstant,
  rentalBookingChip,
} from "@/lib/rental-booking-display";

/**
 * One row of GET /api/rental-bookings — the shared declaration, not a
 * local restatement of it.
 *
 * RentalBookingItem is RentalBookingView plus the car and the operator
 * disclosure, exported from rental-booking-access.ts beside the
 * projection and the disclosure that build it. It carries the fields
 * projectRentalBooking() produces, including the ones it deliberately
 * withholds from a renter (feeCents / operatorNetCents are optional
 * there, and nothing below reads them).
 */
export type RentalBookingListItem = RentalBookingItem;

type LoadState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "error"; message: string }
  | { kind: "ready"; bookings: RentalBookingListItem[] };

// ── formatting ──────────────────────────────────────────────────────
//
// The money, the calendar days, the durations and the status chips all
// come from src/lib/rental-booking-display.ts. This file used to hold
// private copies of all four; the operator's inbox held its own, and they
// had already drifted — the same 0047 status read "Out now" here and "Out
// with the renter" there, and a lapsed request read "Timed out" here and
// "Expired" there. Worse, the day formatter below parsed a UTC calendar
// day at LOCAL noon: display-only, but it is the one arithmetic-free
// conversion in a system whose entire date layer is UTC-anchored, and a
// renter west of Greenwich could see a booking listed on the day before
// the operator confirmed it. formatBookingDay() parses with parseUtcDay
// and formats with `timeZone: "UTC"`, exactly as the date picker paints
// its cells.

/** "13h 40m" until an ISO instant, or null once it has passed. */
function timeUntil(iso: string, nowMs: number): string | null {
  const left = msUntilInstant(iso, nowMs);
  if (left === null || left <= 0) return null;
  return formatDuration(left);
}

function carLabel(listing: RentalBookingListingSummary | null): string {
  if (!listing) return "This car";
  const parts = [
    listing.year ? String(listing.year) : "",
    listing.make,
    listing.model,
  ].filter(Boolean);
  return parts.join(" ") || "This car";
}

// ── sections ────────────────────────────────────────────────────────

type SectionKey = "yourMove" | "active" | "upcoming" | "awaiting" | "past";

const SECTIONS: readonly {
  key: SectionKey;
  title: string;
  blurb: string;
}[] = [
  {
    key: "yourMove",
    title: "Waiting on you",
    blurb:
      "The operator offered different dates. Accept or decline below — nothing is held and nothing has been charged until you confirm.",
  },
  {
    key: "active",
    title: "Active",
    blurb: "Rentals under way right now.",
  },
  {
    key: "upcoming",
    title: "Upcoming",
    blurb: "Confirmed, with the pickup date still ahead.",
  },
  {
    key: "awaiting",
    title: "Awaiting the operator",
    blurb:
      "Sent, unanswered. A request holds no dates and collects no card — the operator confirms first.",
  },
  {
    key: "past",
    title: "Past",
    blurb: "Finished, declined, cancelled or timed out.",
  },
];

/**
 * Which group a booking belongs in.
 *
 * `today` is the UTC calendar day, the same anchor every date in this
 * system uses (rental-availability.ts, rule 1) — so a booking's section
 * agrees with the calendar that produced its dates rather than with the
 * viewer's timezone.
 *
 * A confirmed booking whose dates have already run out sits in Past. It
 * is not "upcoming" and the car is not out, and 0047 leaves it in
 * `confirmed` until somebody moves it — the chip still says Confirmed,
 * so nothing is claimed about it that the row does not say itself.
 */
function sectionFor(
  booking: RentalBookingListItem,
  today: string,
  nowMs: number,
): SectionKey {
  if (isRentalRequestExpired(booking, nowMs)) return "past";

  switch (booking.status) {
    case RENTAL_BOOKING_STATUS.requested:
      return booking.awaitsDecisionFrom === "renter" ? "yourMove" : "awaiting";
    case RENTAL_BOOKING_STATUS.in_progress:
      return "active";
    case RENTAL_BOOKING_STATUS.confirmed:
      if (booking.endDate < today) return "past";
      return booking.startDate > today ? "upcoming" : "active";
    // completed | declined | expired | cancelled, and anything a later
    // migration adds: over, or unknown and therefore not claimed to be
    // live.
    default:
      return "past";
  }
}

function group(
  bookings: readonly RentalBookingListItem[],
  today: string,
  nowMs: number,
): Map<SectionKey, RentalBookingListItem[]> {
  const out = new Map<SectionKey, RentalBookingListItem[]>();
  for (const booking of bookings) {
    const key = sectionFor(booking, today, nowMs);
    const bucket = out.get(key);
    if (bucket) bucket.push(booking);
    else out.set(key, [booking]);
  }
  // Live sections read forwards (the soonest thing first); history reads
  // backwards (the most recent thing first).
  for (const [key, rows] of out) {
    rows.sort((a, b) =>
      key === "past"
        ? b.startDate.localeCompare(a.startDate)
        : a.startDate.localeCompare(b.startDate),
    );
  }
  return out;
}

// ── the list ────────────────────────────────────────────────────────

// The same three treatments the operator's inbox uses, and for the same
// reason: FOCUS_RING on every one, because accepting a counter-offer is
// a one-way door and a keyboard renter has to be able to see which door
// they are standing on.
const BTN_PRIMARY =
  `inline-flex h-10 items-center rounded-full bg-red px-5 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
const BTN_SECONDARY =
  `inline-flex h-10 items-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
const BTN_QUIET =
  `inline-flex h-10 items-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

export function RentalBookingList() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [nonce, setNonce] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  // Kept OUTSIDE `state` on purpose: a refusal is followed by a refetch
  // (the row moved under us), and an error stored in `state` would be
  // thrown away by the very reload that proves it.
  const [decisionErrors, setDecisionErrors] = useState<Record<string, string>>(
    {},
  );

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  /**
   * The renter's answer to an operator's counter-offer.
   *
   * Same endpoint, same two actions and the same refusal handling the
   * operator's inbox uses — the route is written for both parties
   * (rentalBookingAccess() sets canDecide for the renter on an
   * initiated_by = 'operator' row, and classifyBookingRefusal() carries
   * renter-audience copy), so its messages are surfaced verbatim rather
   * than re-worded here. A 403/409 means the row moved under us, so the
   * list is re-read: a card still offering to accept an offer the server
   * just refused is how a renter clicks Accept four times.
   */
  const decide = useCallback(
    async (booking: RentalBookingListItem, action: "approve" | "decline") => {
      setBusyId(booking.id);
      setDecisionErrors((prev) => {
        const next = { ...prev };
        delete next[booking.id];
        return next;
      });
      try {
        const res = await authedFetch(
          `/api/rental-bookings/${booking.id}/decision`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          setDecisionErrors((prev) => ({
            ...prev,
            [booking.id]:
              body.error || `Could not record that answer (${res.status}).`,
          }));
          if (res.status === 403 || res.status === 409) refresh();
          return;
        }
        refresh();
      } catch {
        setDecisionErrors((prev) => ({
          ...prev,
          [booking.id]: "Could not reach RYDA. Check your connection.",
        }));
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        // authedFetch attaches the session bearer; without one the route
        // answers 401 and we ask for a sign-in rather than showing an
        // empty history that looks like "you have no bookings".
        const res = await authedFetch("/api/rental-bookings");
        if (cancelled) return;
        if (res.status === 401) {
          setState({ kind: "anon" });
          return;
        }
        if (!res.ok) {
          setState({
            kind: "error",
            message:
              res.status === 429
                ? "Too many requests. Try again in a minute."
                : "Could not load your rentals. Try again in a moment.",
          });
          return;
        }
        const json: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        const rows = (json as { bookings?: unknown } | null)?.bookings;
        setState({
          kind: "ready",
          bookings: Array.isArray(rows)
            ? (rows as RentalBookingListItem[])
            : [],
        });
        setNowMs(Date.now());
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "Could not load your rentals. Try again in a moment.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  // The expiry countdown is the only thing on this surface that changes
  // without a fetch, so the clock only runs when something is counting
  // down. A minute is the resolution the copy shows.
  const hasCountdown =
    state.kind === "ready" &&
    state.bookings.some(
      (b) => b.status === RENTAL_BOOKING_STATUS.requested && !!b.expiresAt,
    );
  useEffect(() => {
    if (!hasCountdown) return;
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [hasCountdown]);

  const bookings = state.kind === "ready" ? state.bookings : null;
  const grouped = useMemo(
    () => (bookings ? group(bookings, utcDayOf(new Date(nowMs)), nowMs) : null),
    [bookings, nowMs],
  );

  if (state.kind === "loading") {
    return (
      <p className="text-sm text-mute" role="status">
        Loading your rentals…
      </p>
    );
  }

  if (state.kind === "anon") {
    return (
      <div className="rounded-2xl border border-rule bg-surface p-5">
        <p className="text-sm text-ink-soft">
          Sign in to see the cars you&apos;ve asked for and where each one
          stands.
        </p>
        <Link
          href="/signin?next=%2Faccount%2Frentals"
          className={`mt-4 inline-flex h-10 items-center justify-center rounded-full bg-red px-5 text-sm font-medium text-cream transition-colors hover:bg-red-deep ${FOCUS_RING}`}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      // role="alert" because "Try again" re-renders the identical
      // message on a second failure: no focus move, no visual delta and
      // — without this — nothing announced at all. The loading state's
      // role="status" is unmounted by then, so it cannot carry it.
      <div className="rounded-2xl border border-rule bg-surface p-5">
        <p role="alert" className="text-sm text-ink-soft">
          {state.message}
        </p>
        <button
          type="button"
          onClick={refresh}
          className={`mt-4 inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink ${FOCUS_RING}`}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!grouped || state.bookings.length === 0) {
    // Also the honest answer in an environment where 0046/0047 have not
    // been applied: the route reports an empty list because no booking
    // can exist there yet.
    return (
      <div className="rounded-2xl border border-rule bg-cream-2 px-8 py-10">
        <p className="font-display text-2xl text-ink">No rentals yet.</p>
        <p className="mt-3 max-w-md text-sm text-ink-soft">
          Pick a car and the dates you want. The operator answers within 24
          hours — no card is collected, and nothing is charged when you ask.
        </p>
        <Link
          href="/rent"
          className={`mt-6 inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep ${FOCUS_RING}`}
        >
          Browse the fleet →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {SECTIONS.map((section) => {
        const rows = grouped.get(section.key);
        if (!rows || rows.length === 0) return null;
        return (
          <section key={section.key} aria-labelledby={`rentals-${section.key}`}>
            <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
              <h2
                id={`rentals-${section.key}`}
                className="text-xs font-medium uppercase tracking-[0.16em] text-mute"
              >
                {section.title}
              </h2>
              <span className="text-xs tabular-nums text-mute">
                {rows.length}
              </span>
            </div>
            <p className="mt-2 text-xs text-mute">{section.blurb}</p>
            <ul className="mt-4 space-y-4">
              {rows.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  nowMs={nowMs}
                  busy={busyId === booking.id}
                  error={decisionErrors[booking.id]}
                  onDecide={(action) => void decide(booking, action)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ── one booking ─────────────────────────────────────────────────────

function BookingCard({
  booking,
  nowMs,
  busy,
  error,
  onDecide,
}: {
  booking: RentalBookingListItem;
  nowMs: number;
  busy: boolean;
  error?: string;
  onDecide: (action: "approve" | "decline") => void;
}) {
  // "renter" is the perspective, not a second set of labels: the words
  // and the tone come from the shared map, which is also what the
  // operator's inbox renders the same row through.
  const chip = rentalBookingChip(booking, "renter", nowMs);
  const nights = formatBookingNights(booking.nights);
  const listing = booking.listing;
  // The same three conditions needsOperatorAnswer() applies from the
  // other side: still open, waiting on THIS reader, and not past its
  // window. An expired offer keeps its status note and loses its
  // buttons — the trigger would refuse the confirm anyway.
  const canAnswer =
    booking.status === RENTAL_BOOKING_STATUS.requested &&
    booking.awaitsDecisionFrom === "renter" &&
    !isRentalRequestExpired(booking, nowMs);

  return (
    <li className="rounded-2xl border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight text-ink">
            {carLabel(listing)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {formatBookingDay(booking.startDate)} – {formatBookingDay(booking.endDate)}
            {nights ? ` · ${nights}` : ""}
            {listing?.market ? ` · ${listing.market}` : ""}
          </p>
          {!listing && (
            <p className="mt-1 text-xs text-mute">
              We couldn&apos;t load this car&apos;s details — the booking itself
              is unaffected.
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${chip.className}`}
        >
          {chip.label}
        </span>
      </div>

      {/* The frozen quote (0047's snapshot). Tabular, because it sits on
          a row with a label and every card in the list should align. */}
      <div className="mt-4 flex items-baseline justify-between gap-3 rounded-xl border border-rule bg-cream-2/40 p-3">
        <span className="text-xs uppercase tracking-[0.16em] text-mute">
          Total quoted
        </span>
        <span className="font-display text-2xl tabular-nums text-ink">
          {formatBookingCents(booking.renterTotalCents)}
        </span>
      </div>
      {booking.depositAmountCents > 0 && (
        // NAMES NO MECHANISM (guardrail 3.9). The deposit is D5's
        // authorization, and 3C is the phase that places it — until then
        // the amount is a figure on a snapshot and nothing has touched a
        // card.
        <p className="mt-2 text-[11px] tabular-nums text-mute">
          This car carries a refundable{" "}
          {formatBookingCents(booking.depositAmountCents)} security deposit. Nothing
          has been placed on your card — the operator confirms the deposit
          terms with you.
        </p>
      )}

      <StatusNote booking={booking} nowMs={nowMs} />

      {canAnswer && (
        <RenterDecision
          booking={booking}
          busy={busy}
          error={error}
          onDecide={onDecide}
        />
      )}

      <OperatorBlock booking={booking} />

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {listing && (
          <Link
            href={`/rent/${listing.slug}`}
            className={`inline-flex rounded-sm text-xs font-medium text-red transition-colors hover:text-red-deep ${FOCUS_RING}`}
          >
            View this car →
          </Link>
        )}

        {/* Pickup and return (4C). Shown only in the two states where a
            handover is actually due — 0053's trigger accepts a checkin
            from `confirmed` and a return from `in_progress`, and offering
            the link anywhere else sends a renter to a page whose only
            content is a refusal. The wording follows the same rule: which
            handover is due is a fact about the status, so the link names
            it rather than asking. */}
        {(booking.status === RENTAL_BOOKING_STATUS.confirmed ||
          booking.status === RENTAL_BOOKING_STATUS.in_progress) && (
          <Link
            href={`/bookings/${booking.id}/handover`}
            className={`inline-flex rounded-sm text-xs font-medium text-red transition-colors hover:text-red-deep ${FOCUS_RING}`}
          >
            {booking.status === RENTAL_BOOKING_STATUS.confirmed
              ? "Record pickup →"
              : "Record return →"}
          </Link>
        )}
      </div>
    </li>
  );
}

/**
 * ANSWERING A COUNTER-OFFER — the renter's half of the propose loop.
 *
 * The route treats this as the mirror of the operator's approve/decline
 * on a renter's request: `answer()` takes both, `access.party === 'renter'`
 * is what picks the renter-audience refusal copy, and an acceptance is
 * what confirms the booking. So the two actions and their words are the
 * same two, from the other side.
 *
 * IT CONFIRMS FIRST, because accepting is the one-way door on this
 * surface: 0047 has no confirmed → declined edge, so an accidental
 * Accept can only be unwound by a cancellation. The operator's inbox
 * uses a modal for the same reason; this uses an inline step rather than
 * pulling the admin modal (and the ops-note textarea it is built around)
 * into the renter's bundle.
 *
 * GUARDRAIL 3.9: the sentence below names no mechanism that does not
 * exist. RENTAL_CHARGE_RAIL_LIVE is false, so confirming writes a status
 * and holds the dates — it collects nothing and charges nothing, and it
 * says who money is settled with rather than implying RYDA will ask for
 * it later.
 */
function RenterDecision({
  booking,
  busy,
  error,
  onDecide,
}: {
  booking: RentalBookingListItem;
  busy: boolean;
  error?: string;
  onDecide: (action: "approve" | "decline") => void;
}) {
  const [confirming, setConfirming] = useState<"approve" | "decline" | null>(
    null,
  );
  const stay = `${formatBookingDay(booking.startDate)} – ${formatBookingDay(
    booking.endDate,
  )}`;

  return (
    <div className="mt-4 border-t border-rule pt-4">
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs leading-relaxed text-red-deep"
        >
          {error}
        </p>
      )}

      {confirming === null ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirming("approve")}
            disabled={busy}
            aria-disabled={busy}
            className={BTN_PRIMARY}
          >
            {busy ? "Working…" : "Accept these dates"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming("decline")}
            disabled={busy}
            aria-disabled={busy}
            className={BTN_QUIET}
          >
            Decline
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm leading-relaxed text-ink-soft">
            {confirming === "approve"
              ? `Accepting confirms the booking for ${stay} and holds those dates on this car. It can't be undone — a confirmed booking can only be cancelled. No card is collected and nothing is charged through RYDA; you settle payment with the operator directly.`
              : "Declining closes this offer for good. Nothing was charged, and you can send a fresh request for the dates you want."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onDecide(confirming)}
              disabled={busy}
              aria-disabled={busy}
              className={confirming === "approve" ? BTN_PRIMARY : BTN_QUIET}
            >
              {busy
                ? "Working…"
                : confirming === "approve"
                  ? "Confirm these dates"
                  : "Decline this offer"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={busy}
              aria-disabled={busy}
              className={BTN_SECONDARY}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * What is true of this booking right now, in the renter's words.
 *
 * Every branch is anchored to what the code actually does: a request
 * holds no dates (0047's EXCLUDE is scoped to confirmed/in_progress), a
 * confirmation holds them and charges nothing
 * (RENTAL_CHARGE_RAIL_LIVE = false), and an expiry closes a request that
 * the trigger would refuse to confirm anyway.
 */
function StatusNote({
  booking,
  nowMs,
}: {
  booking: RentalBookingListItem;
  nowMs: number;
}) {
  const lines: string[] = [];

  if (isRentalRequestExpired(booking, nowMs)) {
    lines.push(
      booking.awaitsDecisionFrom === "renter"
        ? "This offer ran past its 24-hour window before it was accepted, so it can no longer be confirmed."
        : "This request ran past its 24-hour window without an answer, so it can no longer be confirmed.",
      "Nothing was charged. Send a fresh request for the dates you want.",
    );
  } else {
    switch (booking.status) {
      case RENTAL_BOOKING_STATUS.requested: {
        const left = booking.expiresAt
          ? timeUntil(booking.expiresAt, nowMs)
          : null;
        if (booking.awaitsDecisionFrom === "renter") {
          lines.push(
            "The operator offered these dates instead of the ones you asked for.",
            "No card was collected and nothing has been charged. These dates aren't held until this is confirmed.",
          );
          if (left) lines.push(`This offer expires in ${left}.`);
        } else {
          lines.push(
            "The operator hasn't answered yet.",
            "No card was collected and nothing has been charged. These dates aren't held until the operator confirms.",
          );
          if (left) {
            lines.push(`This request expires in ${left}, then it closes.`);
          }
        }
        break;
      }
      case RENTAL_BOOKING_STATUS.confirmed:
        // NAMES WHO COLLECTS (guardrail 3.9). "Payment comes later" read
        // as a RYDA charge still to come, and there is no path in this
        // build that could make one: RENTAL_CHARGE_RAIL_LIVE is false and
        // 3B is unbuilt. A renter waiting for a RYDA payment link shows
        // up at pickup having arranged nothing, so the sentence says
        // where the money actually goes. The operator is told the same
        // thing plainly on /partner/requests.
        lines.push(
          "Confirmed — these dates are now held for you.",
          "No card was collected and nothing has been charged through RYDA. You settle payment with the operator directly.",
        );
        break;
      case RENTAL_BOOKING_STATUS.in_progress:
        lines.push(
          "Your rental is under way.",
          "No card was collected and nothing has been charged through RYDA.",
        );
        break;
      case RENTAL_BOOKING_STATUS.completed:
        lines.push("This rental is complete.");
        break;
      case RENTAL_BOOKING_STATUS.declined:
        lines.push(
          "The operator couldn't take these dates. Nothing was charged.",
        );
        break;
      case RENTAL_BOOKING_STATUS.expired:
        lines.push(
          "This request expired before it was answered. Nothing was charged.",
        );
        break;
      case RENTAL_BOOKING_STATUS.cancelled:
        // RENTAL_BOOKING_TRANSITIONS permits confirmed → cancelled as
        // well as requested → cancelled, and the two are different
        // stories about money. A booking that was never confirmed never
        // had any; one that WAS confirmed was settled off-platform with
        // the operator, and "Nothing was charged" would read as "there is
        // nothing to chase" about money RYDA cannot see. confirmedAt is
        // 0047's write-once discriminator — the same one D6 keys the
        // operator reveal on.
        lines.push(
          booking.confirmedAt
            ? `${cancelledLine(booking.cancelledBy)} Nothing was charged through RYDA. Anything you arranged with the operator directly is between you and them.`
            : `${cancelledLine(booking.cancelledBy)} Nothing was charged.`,
        );
        break;
      default:
        break;
    }
  }

  if (lines.length === 0) return null;

  return (
    <div className="mt-4 space-y-1 border-t border-rule pt-4">
      {lines.map((line, i) => (
        <p
          key={line}
          className={
            i === 0
              ? "text-sm leading-relaxed text-ink-soft"
              : "text-xs leading-relaxed text-mute"
          }
        >
          {line}
        </p>
      ))}
    </div>
  );
}

/**
 * 0047 constrains cancelled_by to renter / operator / admin — a ROLE,
 * never a person, so naming it discloses nothing D6 protects.
 */
function cancelledLine(cancelledBy: string | null): string {
  switch (cancelledBy) {
    case "renter":
      return "You cancelled this booking.";
    case "operator":
      return "The operator cancelled this booking.";
    case "admin":
      return "RYDA cancelled this booking.";
    default:
      return "This booking was cancelled.";
  }
}

/**
 * The operator, or the stand-in for one.
 *
 * `operator.revealed` is the ONLY thing consulted. It is
 * discloseOperator()'s verdict for this caller on this row, and when it
 * is false the payload carries a label ("a Miami operator") and
 * no identity at all — so the anonymous branch is not hiding a name that
 * arrived, it is rendering the only thing that did.
 */
function OperatorBlock({ booking }: { booking: RentalBookingListItem }) {
  const disclosure = booking.operator;

  if (!disclosure) return null;

  if (!disclosure.revealed) {
    return (
      <p className="mt-4 border-t border-rule pt-4 text-xs text-mute">
        {disclosure.label}. We name them, and how to reach them, once the
        booking is confirmed.
      </p>
    );
  }

  const { name, email, phone } = disclosure.operator;
  return (
    <div className="mt-4 border-t border-rule pt-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-mute">
        Your operator
      </p>
      <p className="mt-1 text-sm font-medium text-ink">{name}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        {email && (
          <a
            href={`mailto:${email}`}
            className={`rounded-sm text-sm text-red transition-colors hover:text-red-deep ${FOCUS_RING}`}
          >
            {email}
          </a>
        )}
        {phone && (
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className={`rounded-sm text-sm text-red transition-colors hover:text-red-deep ${FOCUS_RING}`}
          >
            {phone}
          </a>
        )}
      </div>
      {!email && !phone && (
        <p className="mt-1 text-xs text-mute">
          We don&apos;t have contact details on file for them yet — reply to
          your confirmation email and we&apos;ll connect you.
        </p>
      )}
    </div>
  );
}
