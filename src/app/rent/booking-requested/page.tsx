"use client";

// /rent/booking-requested — where a renter lands the moment
// POST /api/rental-bookings creates their request (build loop 2D/2G).
//
// WHY THIS PAGE RE-FETCHES INSTEAD OF READING THE URL. The form already
// has the booking, the listing and the quote in the POST response, and
// it would be one line to pass them through the query string. It does
// not. A total in a URL is a total anyone can edit, and this is the
// screen a renter screenshots and comes back to — so the id is the only
// thing that travels and every figure on screen is read back from
// GET /api/rental-bookings/[id], which answers 404 to anyone who is not
// a party to the row. Bookmarking it, reloading it and opening it a week
// later all show the booking as it actually stands.
//
// D6 IS NOT RE-DERIVED HERE. Operators are anonymous until a booking is
// confirmed, and this page renders whatever `operator` block the API
// hands it: rental-booking-access.ts's discloseOperator() either returns
// an identity or returns the "a vetted Miami operator" label, and there
// is deliberately no branch below that reaches for a name the server did
// not disclose. A request is pre-confirmation by definition, so on the
// normal path this page shows the label — but it shows the name without
// any change here once the operator confirms, because the rule lives in
// one place and this is a consumer of it.
//
// GUARDRAIL 3.9 — THE MONEY RAIL DOES NOT EXIST. Nothing on this page
// says a card was charged, held, authorized or guaranteed, because
// nothing in this flow collects one: the request route touches Stripe
// nowhere, and the decision route's approve branch is gated behind
// RENTAL_CHARGE_RAIL_LIVE = false. What the copy states is what the code
// does — the renter asked, the operator answers within O5's 24 hours,
// and the dates are not held until they do.
//
// PRE-MIGRATION (0046/0047 unapplied) this page is unreachable by
// design: the POST answers 503 and the form keeps the renter on the
// inquiry path. Reached anyway — a stale tab, a shared link — the GET
// reports the table missing as "no such booking" and the not-found state
// below renders. No crash, no fabricated numbers.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { useAuthStatus } from "@/lib/use-auth-status";
import {
  RENTAL_BOOKING_STATUS,
  type RentalBookingStatus,
} from "@/lib/rental-booking-status";
import type {
  RentalBookingListingSummary,
  RentalBookingView,
  RentalOperatorDisclosure,
} from "@/lib/rental-booking-access";
import {
  FOCUS_RING,
  formatBookingCents,
  formatBookingDay,
  formatBookingDeadline,
  isRentalRequestExpired,
  rentalBookingChip,
} from "@/lib/rental-booking-display";

// Matches the route's own guard, so obvious junk in the query string
// renders the not-found state without a round trip.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The shape GET /api/rental-bookings/[id] answers with.
 *
 * Each field is the SHARED declaration rather than a local restatement:
 * the route annotates its own listing block against
 * RentalBookingListingSummary and builds `operator` with
 * discloseOperator(), so what this page destructures below cannot drift
 * from what the server sends. The list surfaces read the same three
 * types, flattened, as RentalBookingItem.
 */
type BookingPayload = {
  booking: RentalBookingView;
  listing: RentalBookingListingSummary | null;
  operator: RentalOperatorDisclosure;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; data: BookingPayload }
  /**
   * Every failure that is not a crash, kept apart because the renter's
   * next action differs: sign in, or there is nothing here, or try
   * again. `missing` also covers a bare visit with no ?id=.
   */
  | { kind: "signin" }
  | { kind: "missing" }
  | { kind: "error" };

// ── formatting ──────────────────────────────────────────────────────
//
// From src/lib/rental-booking-display.ts, so the figure a renter saw in
// the form before the click, the one on this page after it, and the one
// on /account/rentals a week later are formatted by one function — and
// the calendar days are UTC-parsed here exactly as they are there.

function carName(listing: BookingPayload["listing"]): string {
  if (!listing) return "Your car";
  const parts = [listing.year, listing.make, listing.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Your car";
}

// ── status ──────────────────────────────────────────────────────────

/**
 * The SENTENCE under the heading — and only the sentence.
 *
 * The chip that sits beside it (its label and its tone) comes from
 * rentalBookingChip() in rental-booking-display.ts, the one map all three
 * booking surfaces read: this page used to carry a third copy of those
 * labels, and a page whose whole job is to be screenshotted and reopened
 * must not name a status differently from the list the renter opens it
 * from. What stays here is page prose — a full sentence addressed to
 * somebody who just pressed the button — which no chip vocabulary has an
 * opinion about.
 *
 * Every status is handled rather than just 'requested', because this URL
 * outlives the submit that produced it: the POST's dedup branch can
 * answer with a row that is already confirmed, and a renter can reopen
 * this page after the operator has answered. A page that only knew
 * "requested" would keep telling them to wait for a decision that has
 * already been made.
 */
const STATUS_HEADING: Record<RentalBookingStatus, string> = {
  requested: "Your dates are with the operator.",
  confirmed: "The operator confirmed these dates.",
  in_progress: "This rental is under way.",
  completed: "This rental is complete.",
  declined: "The operator couldn't take these dates.",
  expired: "This request expired unanswered.",
  cancelled: "This booking was cancelled.",
};

/**
 * WHAT THIS ROW ACTUALLY IS, read the way the chip beside it is read.
 *
 * The status alone is not enough, and the two ways it falls short both
 * put a contradiction on one line:
 *
 *   · LAPSED. There is no sub-daily sweep (4D / Vercel's cron cap), so a
 *     request whose expires_at has passed still says 'requested' in the
 *     table. rentalBookingChip() calls isRentalRequestExpired() and
 *     renders "Expired"; keying the prose on the status alone put "The
 *     operator has 24 hours to confirm — until [a deadline in the past]"
 *     directly under it. 0047's trigger and the decision route both
 *     refuse that confirm, so the renter was told to wait for an answer
 *     that can no longer arrive. Same predicate here as everywhere else.
 *
 *   · A COUNTER-OFFER. 0047 models "propose alternate dates" as a NEW
 *     requested row with initiated_by = 'operator', so an offer waiting
 *     on the RENTER is byte-for-byte a request. The chip promotes it to
 *     "Your answer needed"; the heading said "Your dates are with the
 *     operator." awaitsDecisionFrom — rentalBookingDecider()'s answer,
 *     computed server-side — is what tells them apart, and it is never
 *     re-derived here.
 */
type BookingStance = "lapsed" | "yourMove" | "awaitingOperator" | "settled";

function stanceOf(booking: RentalBookingView, nowMs: number): BookingStance {
  if (isRentalRequestExpired(booking, nowMs)) return "lapsed";
  if (booking.status !== RENTAL_BOOKING_STATUS.requested) return "settled";
  return booking.awaitsDecisionFrom === "renter"
    ? "yourMove"
    : "awaitingOperator";
}

function statusHeading(
  booking: RentalBookingView,
  stance: BookingStance,
): string {
  switch (stance) {
    case "lapsed":
      // A lapsed COUNTER-OFFER is the renter's own unanswered clock, not
      // the operator's — the same split /account/rentals's StatusNote
      // makes on the same row.
      return booking.awaitsDecisionFrom === "renter"
        ? "This offer ran out of time."
        : "This request ran out of time.";
    case "yourMove":
      return "The operator offered different dates.";
    case "awaitingOperator":
      return STATUS_HEADING.requested;
    default:
      return STATUS_HEADING[booking.status] ?? "Your request.";
  }
}

/**
 * The eyebrow. Fixed at "Request sent" it produced its own small lies —
 * "Request sent. / This rental is complete." on a reopened booking, and
 * "Request sent." above an offer that is now the renter's to answer.
 */
function statusEyebrow(
  booking: RentalBookingView,
  stance: BookingStance,
): string {
  switch (stance) {
    case "lapsed":
      return "Request closed";
    case "yourMove":
      return "Your answer needed";
    case "awaitingOperator":
      return "Request sent";
    default:
      return booking.status === RENTAL_BOOKING_STATUS.confirmed ||
        booking.status === RENTAL_BOOKING_STATUS.in_progress ||
        booking.status === RENTAL_BOOKING_STATUS.completed
        ? "Your booking"
        : "Request closed";
  }
}

// ── the page ────────────────────────────────────────────────────────

export default function BookingRequestedPage() {
  // useSearchParams opts everything up to the nearest boundary out of
  // prerendering, so the header and the page frame sit OUTSIDE it: they
  // ship in the initial HTML and are never torn down when the boundary
  // resolves. Same shape as /auth/callback and /auth/mfa-challenge, and
  // the arrangement the Next docs recommend for this hook.
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <Suspense
          fallback={
            <p role="status" className="text-sm text-mute">
              Loading your request…
            </p>
          }
        >
          <Inner />
        </Suspense>
      </main>
    </>
  );
}

function Inner() {
  const params = useSearchParams();
  const { status: authStatus } = useAuthStatus();
  const rawId = params.get("id");
  const id = rawId && UUID_RE.test(rawId) ? rawId : null;

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // Bumped by the retry button.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setState({ kind: "missing" });
      return;
    }
    // Wait for the session to resolve before asking. authedFetch would
    // await it too, but firing on 'loading' risks sending no bearer on a
    // cold restore and answering a signed-in renter with a sign-in wall.
    if (authStatus === "loading") return;

    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const res = await authedFetch(
          `/api/rental-bookings/${encodeURIComponent(id)}`,
        );
        if (cancelled) return;
        if (res.status === 401) return setState({ kind: "signin" });
        // 404 is what the route answers both for "not your booking" and
        // for a pre-0047 database — telling a stranger an id exists is
        // itself a disclosure, so the two are deliberately the same
        // answer, and this page treats them the same way.
        if (res.status === 404) return setState({ kind: "missing" });
        if (!res.ok) return setState({ kind: "error" });
        const body = (await res.json()) as BookingPayload;
        if (cancelled) return;
        if (!body?.booking?.id) return setState({ kind: "error" });
        setState({ kind: "ok", data: body });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, authStatus, attempt]);

  if (state.kind === "loading") {
    return (
      <p role="status" className="text-sm text-mute">
        Loading your request…
      </p>
    );
  }

  if (state.kind === "signin") {
    const next = id ? `/rent/booking-requested?id=${id}` : "/rent";
    return (
      <>
        <h1 className="font-display text-3xl font-light text-ink sm:text-4xl">
          Sign in to see this request.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          A booking request belongs to the account that sent it, so we only
          show it to you when you&apos;re signed in.
        </p>
        <Link
          href={`/signin?next=${encodeURIComponent(next)}`}
          className={`mt-8 inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep ${FOCUS_RING}`}
        >
          Sign in
        </Link>
      </>
    );
  }

  if (state.kind === "missing") {
    return (
      <>
        <h1 className="font-display text-3xl font-light text-ink sm:text-4xl">
          We couldn&apos;t find that request.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          The link may be incomplete, or the request may belong to another
          account. Nothing was charged either way — RYDA doesn&apos;t collect a
          card to request a car.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/rent"
            className={`inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep ${FOCUS_RING}`}
          >
            Browse the fleet
          </Link>
          <Link
            href="/contact"
            className={`inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-ink ${FOCUS_RING}`}
          >
            Contact us
          </Link>
        </div>
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <>
        <h1 className="font-display text-3xl font-light text-ink sm:text-4xl">
          We couldn&apos;t load your request.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Your request may well have gone through — this is our end, not
          yours. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className={`mt-8 inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-ink ${FOCUS_RING}`}
        >
          Try again
        </button>
      </>
    );
  }

  return <Requested data={state.data} />;
}

function Requested({ data }: { data: BookingPayload }) {
  const { booking, listing, operator } = data;
  // The renter's reading of this row. Rendered once, at mount: this page
  // shows a deadline rather than a countdown, so unlike the two lists it
  // has no ticking clock to re-chip against — and a request whose window
  // lapses while the tab sits open is a re-read away from saying so.
  // ONE `now` behind the chip and the prose, so they cannot disagree.
  const nowMs = Date.now();
  const chip = rentalBookingChip(booking, "renter", nowMs);
  const stance = stanceOf(booking, nowMs);
  const heading = statusHeading(booking, stance);
  const eyebrow = statusEyebrow(booking, stance);
  const deadline = booking.expiresAt
    ? formatBookingDeadline(booking.expiresAt)
    : null;
  const car = carName(listing);

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
        {heading}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        {stance === "awaitingOperator" ? (
          <>
            We&apos;ve passed your dates to the operator. Nothing is charged and
            no card was collected — these dates aren&apos;t held until they
            confirm.
          </>
        ) : stance === "yourMove" ? (
          <>
            The operator couldn&apos;t take the dates you asked for and offered
            these instead. Nothing is charged and no card was collected — accept
            the offer in My rentals and the booking is confirmed.
          </>
        ) : stance === "lapsed" ? (
          <>
            {booking.awaitsDecisionFrom === "renter"
              ? "This offer passed its 24-hour window before it was accepted, so it can no longer be confirmed."
              : "This request passed its 24-hour window without an answer, so it can no longer be confirmed."}{" "}
            Nothing was charged — RYDA didn&apos;t collect a card for it.
          </>
        ) : (
          <>
            Here&apos;s where this request stands. Nothing has been charged
            through RYDA — no card was collected for this booking.
          </>
        )}
      </p>

      {/* ── what was asked for ──────────────────────────────────── */}
      <div className="mt-8 rounded-2xl border border-rule bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl leading-tight text-ink">{car}</h2>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${chip.className}`}
          >
            {chip.label}
          </span>
        </div>
        {listing?.market && (
          <p className="mt-1 text-xs text-mute">{listing.market}</p>
        )}

        <dl className="mt-4 space-y-3 border-t border-rule pt-4 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-mute">Dates</dt>
            <dd className="text-right tabular-nums text-ink">
              {formatBookingDay(booking.startDate)} – {formatBookingDay(booking.endDate)}
            </dd>
          </div>
          {booking.nights !== null && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-mute">Nights</dt>
              <dd className="tabular-nums text-ink">{booking.nights}</dd>
            </div>
          )}
          {/* Shown only when the two differ. Under the only fee payer
              this build prices (fee_payer = 'operator', RYDA's cut comes
              out of the payout) the renter's total IS the base, so a
              "Rental / Total" pair reading the same number twice would
              be noise. When 3A ships renter-pays-on-top it stops being
              the same number and this line starts earning its place. */}
          {booking.renterTotalCents !== booking.baseAmountCents && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-mute">Rental</dt>
              <dd className="tabular-nums text-ink-soft">
                {formatBookingCents(booking.baseAmountCents)}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 border-t border-rule pt-3">
            <dt className="text-mute">Total quoted</dt>
            <dd className="font-display text-2xl tabular-nums text-ink">
              {formatBookingCents(booking.renterTotalCents)}
            </dd>
          </div>
        </dl>

        {booking.depositAmountCents > 0 && (
          // NAMES NO MECHANISM (guardrail 3.9), matching the form's own
          // deposit line word for word in what it refuses to claim: D5's
          // authorization is placed at approval by phase 3C, which is
          // unbuilt, so there is no hold and no card on file to place
          // one against.
          <p className="mt-3 text-[11px] leading-relaxed tabular-nums text-mute">
            This car carries a refundable{" "}
            {formatBookingCents(booking.depositAmountCents)} security deposit. Nothing
            has been placed on your card — the operator confirms the deposit
            terms with you.
          </p>
        )}
      </div>

      {/* ── what happens next ───────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-rule bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-mute">
          What happens next
        </p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
          {stance === "awaitingOperator" && (
            <>
              <li>
                {/* O5's 24-hour clock, stated as the real deadline the
                    row carries rather than as a rounded promise. */}
                The operator has 24 hours to confirm
                {deadline ? (
                  <>
                    {" "}
                    — until{" "}
                    <span className="font-medium text-ink">{deadline}</span>
                  </>
                ) : null}
                . They can confirm these dates, propose alternates, or decline.
              </li>
              <li>
                Until they confirm, the dates stay open to other renters — a
                request doesn&apos;t reserve the car.
              </li>
            </>
          )}

          {stance === "yourMove" && (
            <>
              <li>
                {/* The offer's OWN 24-hour clock — 0047 stamps a fresh
                    expires_at on the counter-offer row. */}
                This offer is yours to accept or decline
                {deadline ? (
                  <>
                    {" "}
                    — you have until{" "}
                    <span className="font-medium text-ink">{deadline}</span>
                  </>
                ) : null}
                . Accepting it is what confirms the booking.
              </li>
              <li>
                {/* The accept/decline controls live on /account/rentals,
                    which is the one client that posts a renter decision. */}
                Answer it in{" "}
                <Link
                  href="/account/rentals"
                  className={`rounded-sm text-ink underline decoration-rule underline-offset-2 hover:decoration-ink ${FOCUS_RING}`}
                >
                  My rentals
                </Link>
                . Until you do, the dates stay open to other renters.
              </li>
            </>
          )}

          {stance === "lapsed" && (
            <li>
              The 24-hour window
              {deadline ? (
                <>
                  {" "}
                  closed on{" "}
                  <span className="font-medium text-ink">{deadline}</span>
                </>
              ) : null}
              , so this one can&apos;t be confirmed any more. Send a fresh
              request for the dates you want — the car may still be free.
            </li>
          )}

          {/* A DECLINE MAY NOT BE THE END OF THE STORY. "Propose alternate
              dates" declines THIS row and creates a separate one, and 0047
              carries no parent/replaced-by column — this page fetches only
              its own id, so it cannot see the offer that replaced it. It
              says so rather than leaving the renter on a dead link. */}
          {stance === "settled" &&
            booking.status === RENTAL_BOOKING_STATUS.declined && (
              <li>
                If the operator offered you different dates instead, that offer
                is waiting in{" "}
                <Link
                  href="/account/rentals"
                  className={`rounded-sm text-ink underline decoration-rule underline-offset-2 hover:decoration-ink ${FOCUS_RING}`}
                >
                  My rentals
                </Link>{" "}
                on its own 24-hour clock.
              </li>
            )}

          <li>
            {/* D6, as the server disclosed it. `revealed` is the API's
                answer, never this page's inference. */}
            {operator.revealed
              ? `Your operator is ${operator.operator.name}.`
              : stance === "awaitingOperator" || stance === "yourMove"
                ? `${operator.label} is behind this car. You'll see who they are once the booking is confirmed.`
                : `${operator.label} is behind this car.`}
          </li>

          {stance !== "awaitingOperator" && stance !== "yourMove" && (
            <li>
              Questions about this booking?{" "}
              <Link
                href="/contact"
                className={`rounded-sm text-ink underline decoration-rule underline-offset-2 hover:decoration-ink ${FOCUS_RING}`}
              >
                Contact us
              </Link>{" "}
              and we&apos;ll pick it up by hand.
            </li>
          )}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {/* THE BOOKING HISTORY IS THE HANDLE, not this URL. The old copy
            here pointed at nothing on purpose — /account/requests lists
            rental_inquiries, not bookings, so sending a renter there for
            a booking showed them an empty page. Build loop 2G is what
            ships /account/rentals and the "My rentals" nav entry, so the
            premise has expired: a raw UUID must not be the only thing a
            renter has, and "propose alternate dates" makes THIS row a
            dead end the moment an operator counter-offers. */}
        <Link
          href="/account/rentals"
          className={`inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep ${FOCUS_RING}`}
        >
          My rentals
        </Link>
        {listing?.slug && (
          <Link
            href={`/rent/${listing.slug}`}
            className={`inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-ink ${FOCUS_RING}`}
          >
            Back to the car
          </Link>
        )}
        <Link
          href="/rent"
          className={`inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-ink ${FOCUS_RING}`}
        >
          Browse the fleet
        </Link>
      </div>

      <p className="mt-10 text-xs leading-relaxed text-mute">
        Every booking you send lives in My rentals, and that&apos;s where an
        operator&apos;s answer lands. Reference for this one:{" "}
        <span className="font-mono tabular-nums">{booking.id}</span>
      </p>
    </>
  );
}
