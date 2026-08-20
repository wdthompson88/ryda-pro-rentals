"use client";

// The operator's booking-request inbox (build loop 2F) — the list, the
// three decisions, and the clock.
//
// It renders what GET /api/rental-bookings?role=operator returns for the
// listings this operator's partner owns, and every action it offers is a
// POST to /api/rental-bookings/[id]/decision. Nothing here decides
// anything: the route and 0047's trigger do, and this file's job is to
// show the operator what is true and then say plainly what the server
// said back.
//
// FOUR RULES THIS FILE EXISTS TO HOLD.
//
//   1. THE CLOCK IS READ, NOT ASSUMED. Open default O5 gives an operator
//      24 hours; 0047 stamps expires_at and its trigger REFUSES a
//      confirmation past it. There is no sub-daily sweep to lean on —
//      build loop 4D notes Vercel's daily-cron cap — so a request whose
//      expires_at has passed is still sitting in the table as
//      'requested'. It reads as EXPIRED here, on read, and its actions
//      go dead, because the alternative is an Approve button that only
//      ever produces a 409. The `now` behind that judgement ticks, so a
//      request that runs out while the page is open flips by itself.
//
//   2. WHOSE TURN IT IS COMES FROM THE PAYLOAD, NOT FROM THE STATUS.
//      "Propose alternate dates" is modelled by 0047 as a NEW requested
//      row with initiated_by = 'operator', so an operator's own
//      counter-offer is byte-for-byte a request. awaitsDecisionFrom —
//      rentalBookingDecider()'s answer, computed server-side — is what
//      keeps the operator's own offers out of the pile they have to
//      answer. This file never reads initiated_by directly and never
//      re-derives the rule.
//
//   3. NO CLAIM ABOUT MONEY THAT THE CODE CANNOT KEEP (guardrail 3.9).
//      The rail is not built. RENTAL_CHARGE_RAIL_LIVE is false in the
//      decision route, so approving writes a status and nothing else:
//      no card is collected, no total is charged, no deposit is held.
//      Every sentence below about money says exactly that much and no
//      more.
//
//   4. THE OPERATOR'S ECONOMICS ARE THE OPERATOR'S. feeCents and
//      operatorNetCents are RYDA's commission on the deal, and
//      projectRentalBooking() sends them ONLY to an operator or an
//      admin (0047 §5, guardrail 3.7). They are rendered here because
//      this surface is operator-gated — and they are rendered from the
//      optional fields, so a payload that withholds them degrades to
//      the renter's total alone rather than to "$NaN".
//
// D6 CUTS THE OTHER WAY HERE and is worth stating so nobody "fixes" it:
// the operator anonymity rule protects the RENTER's view of a booking,
// not this one. An operator reading their own inbox obviously knows who
// they are, which is why rentalBookingAccess() hands staff
// operatorRevealed = true. Nothing on this surface is gated by it.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/api-fetch";
import { useActionModal } from "@/components/admin/action-modal";
import { RentalDatePicker } from "@/components/rental-date-picker";
import { nightsBetween, utcDayOf } from "@/lib/rental-availability";
import {
  checkOpenRange,
  rentalQuoteMessage,
  type OpenDayRangeInput,
  type RentalAvailabilityResponse,
} from "@/lib/rental-quote";
import { RENTAL_BOOKING_STATUS } from "@/lib/rental-booking-status";
import type { RentalBookingListingSummary } from "@/lib/rental-booking-access";
// The wire shape and the fetch that produces it. They used to live HERE,
// which meant /partner — which renders only a count badge — pulled the
// date picker, the action modal and the quote engine into its bundle to
// get at them. See the header of that module.
import type { OperatorBooking } from "@/lib/operator-bookings";
import {
  FOCUS_RING,
  formatBookingCents,
  formatBookingStay,
  formatDuration,
  formatTimeAgo,
  isRentalRequestExpired,
  msUntilInstant,
  rentalBookingChip,
  rentalRequestTurnLabel,
} from "@/lib/rental-booking-display";

// ── the clock, the words and the money ──────────────────────────────
//
// All three come from src/lib/rental-booking-display.ts and none of them
// is restated here. The renter reads the same rows on /account/rentals,
// and this file used to hold its own expiry predicate, its own duration
// vocabulary, its own money formatter and its own status labels — which
// had already drifted from theirs ("Out with the renter" against "Out
// now", "Expired" against "Timed out") before either shipped. An operator
// and a renter looking at one booking must not be reading two different
// words for its state, so the words live in one file and the perspective
// — `"operator"` below — is a parameter.

const HOUR_MS = 3_600_000;

function carName(listing: RentalBookingListingSummary | null): string {
  if (!listing) return "This car";
  const year = listing.year ? `${listing.year} ` : "";
  return `${year}${listing.make} ${listing.model}`.trim();
}

function StatusPill({
  booking,
  nowMs,
}: {
  booking: OperatorBooking;
  nowMs: number;
}) {
  const chip = rentalBookingChip(booking, "operator", nowMs);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${chip.className}`}
    >
      {chip.label}
    </span>
  );
}

// ── the list ────────────────────────────────────────────────────────

// Every button on this surface carries FOCUS_RING. Approve / Decline /
// Propose are the three irreversible-ish doors in the operator's day, and
// a keyboard operator must be able to see which one they are standing on.
const BTN_PRIMARY =
  `inline-flex h-10 items-center rounded-full bg-red px-5 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
const BTN_SECONDARY =
  `inline-flex h-10 items-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
const BTN_QUIET =
  `inline-flex h-10 items-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

export type BookingRequestListProps = {
  bookings: readonly OperatorBooking[];
  /** Re-read the list. Called after every write, and after every refusal
   *  that means the row moved under us. */
  onChanged: () => void;
};

export function BookingRequestList({
  bookings,
  onChanged,
}: BookingRequestListProps) {
  // The clock behind every expiry judgement on this page. It ticks so a
  // request that runs out while the operator is looking at it goes dead
  // on screen rather than after a reload — there is no sub-daily sweep
  // to do it server-side (4D / Vercel's cron cap).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const { open, modal } = useActionModal();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [proposeFor, setProposeFor] = useState<string | null>(null);

  const groups = useMemo(() => {
    const action: OperatorBooking[] = [];
    const waiting: OperatorBooking[] = [];
    const closed: OperatorBooking[] = [];
    for (const b of bookings) {
      if (
        b.status === RENTAL_BOOKING_STATUS.requested &&
        !isRentalRequestExpired(b, nowMs)
      ) {
        (b.awaitsDecisionFrom === "operator" ? action : waiting).push(b);
      } else {
        closed.push(b);
      }
    }
    // Soonest to run out, first. An inbox sorted by anything else buries
    // the one request that is about to cost the operator a booking.
    const byExpiry = (a: OperatorBooking, b: OperatorBooking) =>
      (Date.parse(a.expiresAt ?? "") || 0) - (Date.parse(b.expiresAt ?? "") || 0);
    action.sort(byExpiry);
    waiting.sort(byExpiry);
    return { action, waiting, closed };
  }, [bookings, nowMs]);

  /**
   * Send a decision and translate the answer.
   *
   * Every refusal this route produces is already written for an
   * operator — "those dates were just taken on this car", "this request
   * expired before it was answered", "this car isn't taking bookings
   * right now" — so the message is surfaced verbatim rather than
   * re-worded here, which is how the reason codes and the copy stay in
   * one place. A 403/409 also means the row moved under us, so the list
   * is re-read: leaving a card asserting a state the server just denied
   * is how an operator clicks Approve four times.
   */
  const decide = useCallback(
    async (booking: OperatorBooking, payload: Record<string, unknown>) => {
      setBusyId(booking.id);
      setErrors((prev) => {
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
            body: JSON.stringify(payload),
          },
        );
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          reason?: string;
        };
        if (!res.ok) {
          setErrors((prev) => ({
            ...prev,
            [booking.id]:
              body.error || `Could not record that decision (${res.status}).`,
          }));
          if (res.status === 403 || res.status === 409) onChanged();
          return false;
        }
        setProposeFor(null);
        onChanged();
        return true;
      } catch {
        setErrors((prev) => ({
          ...prev,
          [booking.id]: "Could not reach RYDA. Check your connection.",
        }));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [onChanged],
  );

  const stayOf = (b: OperatorBooking) =>
    `${formatBookingStay(b.startDate, b.endDate)}${
      b.nights !== null ? ` · ${b.nights} night${b.nights === 1 ? "" : "s"}` : ""
    }`;

  // Approving is irreversible in the direction that matters: 0047 has no
  // confirmed → declined edge, so the only way back out is a
  // cancellation. It confirms first, in the same modal idiom /admin uses
  // for its own one-way doors.
  //
  // AND IT DOES NOT SEND THE OPERATOR LOOKING FOR A CANCEL BUTTON.
  // RENTAL_BOOKING_TRANSITIONS permits confirmed → cancelled, but no
  // surface in this build renders a cancel control — /partner/requests
  // offers Approve / Propose / Decline while `mine && !expired` and
  // nothing at all in the Decided section, and /account/rentals offers
  // no actions either. So the recourse named here is the one that
  // actually exists today.
  async function approve(booking: OperatorBooking) {
    const result = await open({
      title: "Approve this request",
      message:
        `${carName(booking.listing)} · ${stayOf(booking)}\n\n` +
        "Approving confirms the booking and reserves these dates on this car — no other request for them can be confirmed after this. It can't be undone from this inbox: unwinding a confirmed booking means a cancellation, and there is no cancel control yet — email partners@ryda.pro and we'll handle it by hand.\n\n" +
        "Nothing is charged. RYDA's payment rail isn't live yet, so no card has been collected, no total is charged and no deposit is held.",
      noteLabel: false,
      confirmLabel: "Approve request",
    });
    if (!result.confirmed) return;
    await decide(booking, { action: "approve" });
  }

  async function decline(booking: OperatorBooking) {
    const result = await open({
      title: "Decline this request",
      message:
        `${carName(booking.listing)} · ${stayOf(booking)}\n\n` +
        "Declining closes this request for good — declined is a terminal state, and the renter would have to send a new one. If you could take the car on different dates, cancel this and use “Propose alternate dates” instead.\n\n" +
        "Nothing was charged, so there is nothing to refund.",
      noteLabel: false,
      confirmLabel: "Decline request",
      tone: "danger",
    });
    if (!result.confirmed) return;
    await decide(booking, { action: "decline" });
  }

  async function propose(
    booking: OperatorBooking,
    startDate: string,
    endDate: string,
  ) {
    const result = await open({
      title: "Send a counter-offer",
      message:
        `${carName(booking.listing)}\n\n` +
        `Asked for: ${formatBookingStay(booking.startDate, booking.endDate)}\n` +
        `You're offering: ${formatBookingStay(startDate, endDate)}\n\n` +
        "This declines the original request and sends the renter a fresh offer, priced by RYDA for the new dates. They have 24 hours to accept it, and their acceptance is what confirms the booking.\n\n" +
        "Nothing is charged either way — a counter-offer holds no dates.",
      noteLabel: false,
      confirmLabel: "Send counter-offer",
    });
    if (!result.confirmed) return;
    await decide(booking, { action: "propose", startDate, endDate });
  }

  if (bookings.length === 0) return <EmptyInbox />;

  return (
    <div className="space-y-10">
      {modal}

      <Section
        title={rentalRequestTurnLabel("operator", "yours")}
        count={groups.action.length}
        blurb="Renters waiting on you. Each request runs out 24 hours after it was sent."
        empty="Nothing is waiting on you right now."
      >
        {groups.action.map((b) => (
          <RequestCard
            key={b.id}
            booking={b}
            nowMs={nowMs}
            busy={busyId === b.id}
            error={errors[b.id]}
            proposing={proposeFor === b.id}
            onApprove={() => approve(b)}
            onDecline={() => decline(b)}
            onStartPropose={() => setProposeFor(b.id)}
            onCancelPropose={() => setProposeFor(null)}
            onPropose={(s, e) => propose(b, s, e)}
          />
        ))}
      </Section>

      {groups.waiting.length > 0 && (
        <Section
          title={rentalRequestTurnLabel("operator", "theirs")}
          count={groups.waiting.length}
          blurb="Counter-offers you've sent. The renter accepts or declines these — you can't answer your own offer."
        >
          {groups.waiting.map((b) => (
            <RequestCard
              key={b.id}
              booking={b}
              nowMs={nowMs}
              busy={false}
              error={errors[b.id]}
              proposing={false}
              onApprove={() => {}}
              onDecline={() => {}}
              onStartPropose={() => {}}
              onCancelPropose={() => {}}
              onPropose={async () => {}}
            />
          ))}
        </Section>
      )}

      {groups.closed.length > 0 && (
        <Section
          title="Decided"
          count={groups.closed.length}
          blurb="Everything already answered, expired, or under way."
        >
          {groups.closed.map((b) => (
            <RequestCard
              key={b.id}
              booking={b}
              nowMs={nowMs}
              busy={busyId === b.id}
              error={errors[b.id]}
              proposing={false}
              onApprove={() => {}}
              onDecline={() => {}}
              onStartPropose={() => {}}
              onCancelPropose={() => {}}
              onPropose={async () => {}}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  blurb,
  empty,
  children,
}: {
  title: string;
  count: number;
  blurb: string;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl text-ink">
          {title}
          {count > 0 && (
            <span className="ml-2 align-middle text-sm tabular-nums text-mute">
              {count}
            </span>
          )}
        </h2>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">{blurb}</p>
      {count === 0 && empty ? (
        <p className="mt-4 rounded-2xl border border-rule bg-cream-2/50 px-5 py-6 text-sm text-ink-soft">
          {empty}
        </p>
      ) : (
        <div className="mt-4 space-y-4">{children}</div>
      )}
    </section>
  );
}

// ── one request ─────────────────────────────────────────────────────

function RequestCard({
  booking,
  nowMs,
  busy,
  error,
  proposing,
  onApprove,
  onDecline,
  onStartPropose,
  onCancelPropose,
  onPropose,
}: {
  booking: OperatorBooking;
  nowMs: number;
  busy: boolean;
  error?: string;
  proposing: boolean;
  onApprove: () => void;
  onDecline: () => void;
  onStartPropose: () => void;
  onCancelPropose: () => void;
  onPropose: (startDate: string, endDate: string) => Promise<void> | void;
}) {
  const open = booking.status === RENTAL_BOOKING_STATUS.requested;
  const expired = isRentalRequestExpired(booking, nowMs);
  const mine = open && booking.awaitsDecisionFrom === "operator";
  const actionable = mine && !expired;
  const left = msUntilInstant(booking.expiresAt, nowMs);
  const created = msUntilInstant(booking.createdAt, nowMs);

  return (
    <article className="rounded-2xl border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl leading-tight text-ink">
            {carName(booking.listing)}
          </h3>
          <p className="mt-1 text-xs text-mute">
            {booking.listing?.market ? `${booking.listing.market} · ` : ""}
            Requested {created !== null ? formatTimeAgo(created) : "—"}
            {booking.listing?.slug ? (
              <>
                {" · "}
                <Link
                  href={`/rent/${booking.listing.slug}`}
                  className={`rounded-sm underline hover:text-ink ${FOCUS_RING}`}
                >
                  View listing
                </Link>
              </>
            ) : null}
            {/* Pickup and return (4C). Only in the two states where a
                handover is due: 0053 accepts a checkin from `confirmed`
                and a return from `in_progress`. An operator handing over
                keys and a renter collecting from a lockbox reach the same
                page — the API decides who may record, not the surface
                that links to it. */}
            {(booking.status === RENTAL_BOOKING_STATUS.confirmed ||
              booking.status === RENTAL_BOOKING_STATUS.in_progress) && (
              <>
                {" · "}
                <Link
                  href={`/bookings/${booking.id}/handover`}
                  className={`rounded-sm font-medium text-red underline transition-colors hover:text-red-deep ${FOCUS_RING}`}
                >
                  {booking.status === RENTAL_BOOKING_STATUS.confirmed
                    ? "Record pickup"
                    : "Record return"}
                </Link>
              </>
            )}
          </p>
        </div>
        <StatusPill booking={booking} nowMs={nowMs} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Field label="Dates" value={formatBookingStay(booking.startDate, booking.endDate)} />
        <Field
          label="Nights"
          value={booking.nights === null ? "—" : String(booking.nights)}
          tabular
        />
        <Field label="Renter" value={booking.renter?.firstName || "—"} />
        <Field
          label="Quoted total"
          value={formatBookingCents(booking.renterTotalCents)}
          display
        />
      </dl>

      {/* The operator's own economics. Optional on the type because they
          are optional in the payload — projectRentalBooking() withholds
          both from a renter, and a card that assumed them would print
          "$NaN" the first time this component is reused elsewhere. */}
      {typeof booking.operatorNetCents === "number" && (
        <p className="mt-3 text-xs tabular-nums text-mute">
          You net {formatBookingCents(booking.operatorNetCents)}
          {typeof booking.feeCents === "number" && (
            <>
              {" "}
              — RYDA&apos;s fee is {formatBookingCents(booking.feeCents)}, and it comes{" "}
              {booking.feePayer === "renter"
                ? "on top of the renter's total"
                : "out of your side"}
              .
            </>
          )}
        </p>
      )}

      {/* THE CLOCK, stated rather than implied. */}
      {open && left !== null && (
        <p
          className={`mt-3 text-xs font-medium tabular-nums ${
            expired ? "text-mute" : left < HOUR_MS ? "text-red-deep" : "text-ink-soft"
          }`}
        >
          {expired
            ? `Answer window closed ${formatTimeAgo(left)}.`
            : mine
              ? `You have ${formatDuration(left)} to answer.`
              : `The renter has ${formatDuration(left)} to accept.`}
        </p>
      )}

      {/* The renter's note. Absent for now — see OperatorBooking. */}
      {booking.message ? (
        <blockquote className="mt-4 rounded-xl border border-rule bg-cream-2/50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {booking.message}
        </blockquote>
      ) : (
        <p className="mt-4 text-xs text-mute">
          The renter&apos;s name and message aren&apos;t carried by the booking
          API yet.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs leading-relaxed text-red-deep"
        >
          {error}
        </p>
      )}

      {/* An expired request keeps its buttons and loses their function:
          hiding them would leave an operator wondering where the answer
          went, and enabling them would be an Approve that can only ever
          produce the trigger's refusal. */}
      {mine && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
            <button
              type="button"
              onClick={onApprove}
              disabled={!actionable || busy || proposing}
              aria-disabled={!actionable || busy || proposing}
              className={BTN_PRIMARY}
            >
              {busy ? "Working…" : "Approve"}
            </button>
            <button
              type="button"
              onClick={proposing ? onCancelPropose : onStartPropose}
              disabled={!actionable || busy}
              aria-disabled={!actionable || busy}
              className={BTN_SECONDARY}
            >
              {proposing ? "Cancel counter-offer" : "Propose alternate dates"}
            </button>
            <button
              type="button"
              onClick={onDecline}
              disabled={!actionable || busy || proposing}
              aria-disabled={!actionable || busy || proposing}
              className={BTN_QUIET}
            >
              Decline
            </button>
          </div>
          {expired && (
            <p className="mt-3 text-xs leading-relaxed text-mute">
              This request passed its 24-hour window, so it can no longer be
              confirmed — RYDA will mark it expired and tell the renter. If you
              can still take the car, ask them to send a fresh request.
            </p>
          )}
        </>
      )}

      {proposing && actionable && (
        <ProposePanel
          booking={booking}
          busy={busy}
          onCancel={onCancelPropose}
          onSubmit={onPropose}
        />
      )}
    </article>
  );
}

function Field({
  label,
  value,
  tabular,
  display,
}: {
  label: string;
  value: string;
  tabular?: boolean;
  display?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.16em] text-mute">
        {label}
      </dt>
      <dd
        className={
          display
            ? "mt-1 font-display text-xl tabular-nums text-ink"
            : `mt-1 text-sm text-ink${tabular ? " tabular-nums" : ""}`
        }
      >
        {value}
      </dd>
    </div>
  );
}

// ── the counter-offer ───────────────────────────────────────────────

type AvailabilityState =
  | { kind: "loading" }
  | { kind: "on"; data: Extract<RentalAvailabilityResponse, { available: true }> }
  | { kind: "off" };

/**
 * Pick alternate dates for a counter-offer.
 *
 * It asks the PUBLIC availability route for this car's open days and
 * hands them to RentalDatePicker, so an operator counter-offers out of
 * exactly the set a renter could have picked from — and the client-side
 * check is checkOpenRange(), whose test asserts it refuses precisely
 * what the server's checkRange() refuses. There is no second copy of the
 * calendar rules here.
 *
 * DEGRADATION IS THE NORMAL PATH TODAY: 0046/0047 are written and not
 * applied, so `available: false` is the expected answer and the two
 * plain date inputs are the designed fallback — the same trade the
 * inquiry form makes. The server re-quotes and re-checks either way; the
 * picker is a courtesy, never the gate.
 */
function ProposePanel({
  booking,
  busy,
  onCancel,
  onSubmit,
}: {
  booking: OperatorBooking;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (startDate: string, endDate: string) => Promise<void> | void;
}) {
  const slug = booking.listing?.slug ?? "";
  const [availability, setAvailability] = useState<AvailabilityState>(
    slug ? { kind: "loading" } : { kind: "off" },
  );
  const [startDate, setStartDate] = useState(booking.startDate);
  const [endDate, setEndDate] = useState(booking.endDate);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/rental-availability/${encodeURIComponent(slug)}`,
        );
        const body = (await res.json()) as RentalAvailabilityResponse;
        if (cancelled) return;
        setAvailability(
          res.ok && body && body.available
            ? { kind: "on", data: body }
            : { kind: "off" },
        );
      } catch {
        if (!cancelled) setAvailability({ kind: "off" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const rules: OpenDayRangeInput | null = useMemo(() => {
    if (availability.kind !== "on") return null;
    const { data } = availability;
    return {
      openDays: data.openDays,
      minNights: data.listing.minNights,
      maxNights: data.listing.maxNights,
      window: {
        start_date: data.window.startDate,
        end_date: data.window.endDate,
      },
    };
  }, [availability]);

  const nights =
    startDate && endDate ? nightsBetween(startDate, endDate) : null;

  function submit() {
    if (!startDate || !endDate) {
      setError("Pick a pickup and a return date.");
      return;
    }
    // The route answers this with a 400; saying it here saves the round
    // trip and uses the same words.
    if (
      startDate === booking.startDate &&
      endDate === booking.endDate
    ) {
      setError(
        "Those are the dates that were asked for. Approve or decline instead.",
      );
      return;
    }
    if (rules) {
      const check = checkOpenRange(startDate, endDate, rules);
      if (!check.ok) {
        setError(
          rentalQuoteMessage(check.reason, {
            minNights: rules.minNights,
            maxNights: rules.maxNights,
          }),
        );
        return;
      }
    } else if (nights === null || nights < 1) {
      setError("The return date has to be after the pickup date.");
      return;
    }
    setError(null);
    void onSubmit(startDate, endDate);
  }

  // FOCUS_RING, like every button on this surface — and NOT the
  // `focus:outline-none focus:ring-2 focus:ring-red/20` these two used
  // to carry. On a bg-cream field a 20%-opacity red ring renders about
  // #EBDCD6 against #F4F1EC, which is no focus indicator at all, and
  // rental-booking-display.ts warns specifically against pairing a ring
  // with focus:outline-none. These are not an edge case: with 0046/0047
  // unapplied `available: false` is the expected answer above, so these
  // two inputs — not the picker — are what an operator tabs into when
  // counter-offering.
  const inputCls =
    `mt-2 h-11 w-full rounded-lg border border-rule bg-cream px-3.5 text-sm text-ink focus:border-red ${FOCUS_RING}`;

  return (
    <div className="mt-4 rounded-xl border border-rule bg-cream-2/50 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">
        Propose alternate dates
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        This declines the renter&apos;s original request and sends a fresh offer
        for the dates you pick. RYDA re-prices it for the new stay — nothing is
        charged.
      </p>

      {availability.kind === "loading" && (
        <p className="mt-4 text-sm text-mute">Loading this car&apos;s calendar…</p>
      )}

      {availability.kind === "on" && (
        <div className="mt-4">
          <RentalDatePicker
            openDays={availability.data.openDays}
            windowStart={availability.data.window.startDate}
            windowEnd={availability.data.window.endDate}
            minNights={availability.data.listing.minNights}
            maxNights={availability.data.listing.maxNights}
            startDate={startDate}
            endDate={endDate}
            today={availability.data.today}
            disabled={busy}
            idPrefix={`propose-${booking.id}`}
            onSelect={(range) => {
              setStartDate(range.startDate);
              setEndDate(range.endDate);
              setError(null);
            }}
          />
        </div>
      )}

      {availability.kind === "off" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium uppercase tracking-wider text-mute">
            Pickup
            <input
              type="date"
              value={startDate}
              min={utcDayOf()}
              onChange={(e) => {
                setStartDate(e.target.value);
                setError(null);
              }}
              className={inputCls}
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wider text-mute">
            Return
            <input
              type="date"
              value={endDate}
              min={startDate || utcDayOf()}
              onChange={(e) => {
                setEndDate(e.target.value);
                setError(null);
              }}
              className={inputCls}
            />
          </label>
        </div>
      )}

      {nights !== null && nights > 0 && (
        <p className="mt-3 text-xs tabular-nums text-ink-soft">
          {formatBookingStay(startDate, endDate)} · {nights} night
          {nights === 1 ? "" : "s"}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red-deep"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          aria-disabled={busy}
          className={BTN_PRIMARY}
        >
          {busy ? "Sending…" : "Send counter-offer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-disabled={busy}
          className={BTN_QUIET}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── empty ───────────────────────────────────────────────────────────

/**
 * ONE empty state, because the API gives one empty answer.
 *
 * `{ bookings: [] }` is what a 200 looks like for an operator with no
 * listings, an operator with listings and no requests, and an
 * environment where migration 0047 has not been applied — the route
 * degrades all three to the same payload deliberately, so a missing
 * table renders an honest empty page instead of a 500. Nothing in the
 * response distinguishes them, so this names the possibilities rather
 * than asserting one of them; picking a story here would be inventing
 * information. A `listings` count on the operator GET is the one field
 * that would let this split into the three states 2F asks for.
 */
function EmptyInbox() {
  return (
    <div className="rounded-2xl border border-rule bg-cream-2/50 p-8 text-center sm:p-10">
      <p className="font-display text-xl text-ink">No booking requests yet.</p>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
        When a renter asks for dates on one of your cars, the request lands
        here — car, dates, the quoted total, and 24 hours to approve it,
        decline it, or offer different dates.
      </p>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
        No cars listed yet? Listing setup starts with a conversation — photos,
        specs, pricing and availability, together. Reach the partnerships team
        at{" "}
        <a
          href="mailto:partners@ryda.pro"
          className={`rounded-sm underline hover:text-ink ${FOCUS_RING}`}
        >
          partners@ryda.pro
        </a>
        . Online booking is still being switched on across the platform, so this
        inbox stays quiet until your fleet is live on it.
      </p>
    </div>
  );
}
