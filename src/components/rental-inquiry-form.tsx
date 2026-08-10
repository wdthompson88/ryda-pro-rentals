"use client";

// Rental inquiry form — the conversion surface of the rentals-first
// funnel. Lives in the /rent/[symbol] booking column.
//
// ── TWO SUBMIT TARGETS, AND WHICH ONE YOU GET ─────────────────────────
//
// This form used to have exactly one: POST /api/rental-inquiry, a
// structured lead routed to a vetted Miami operator who closes the
// rental on their own contract. Phase 2C then gave it a server-computed
// QUOTE from the booking layer — and left the submit pointing at the
// lead endpoint, so a renter was shown the price of a booking the click
// could not create. This is the file that closes that gap.
//
//   BOOKING PATH — POST /api/rental-bookings. Taken when the car has a
//   live rental_listings row (the availability route answered
//   `available: true`, which is where listingId comes from) AND the
//   visitor is already signed in. Creates a real rental_bookings row in
//   status 'requested' and routes to /rent/booking-requested?id=…, which
//   reads the row back from the API rather than trusting anything this
//   component put in the URL.
//
//   INQUIRY PATH — POST /api/rental-inquiry, unchanged. Taken for
//   RYDA-fleet symbols and any car with no listing row, for every
//   signed-out visitor, and as the FALLBACK when the booking POST
//   refuses on a ground that retrying cannot fix (see
//   classifyBookingRefusal). The lead is never lost.
//
// WHY SIGNED-OUT VISITORS DO NOT GET THE BOOKING PATH, even though they
// are offered an account right here. 0047 makes renter_user_id NOT NULL
// and the route is account-first for the same reason: a booking is a
// financial record with a renter on it. The account this form creates
// arrives through supabase.auth.signUp's EMAIL-CONFIRMATION flow, which
// deliberately returns no session — so at the moment of submit there is
// no bearer token, and POST /api/rental-bookings would answer 401. We do
// not silently degrade the promise: a signed-out submit lands the
// inquiry, and the success copy is the inquiry's ("an operator will
// reply"), never a booking's. A visitor who already has an account is
// nudged to sign in first, where the booking path is waiting.
//
// WHAT THE BOOKING POST DOES NOT CARRY. Its body is exactly
// { listingId, startDate, endDate, clientToken } — 0047 has no column
// for a free-text note and no marketing-consent field, and unknown keys
// are ignored by parseCreateBody. So on the booking path the fields that
// would have nowhere to land are not rendered at all rather than being
// collected and dropped: a note box that eats what the renter typed is
// the same class of lie as a button that promises a booking it did not
// create. Booking-scoped messaging is build-loop 2E; the marketing
// preference lives on /account/profile.
//
// Note for anyone reading the build-loop task text: it describes the body
// as { listingSlug, … }. The route takes a `listingId` UUID and validates
// it against UUID_RE — the code is the contract, and the id is what the
// availability route hands us.
//
// Account-first, but the lead is never lost:
//   - Signed-in members: email/password hidden, name/phone prefilled
//     from their rental profile (or auth metadata), inquiry carries
//     their user_id server-side via the bearer token.
//   - Anon visitors: email + password shown ("30 seconds, no card").
//     On submit we fire supabase.auth.signUp (email-confirmation flow,
//     no immediate session — mirrors /signup) AND submit the inquiry
//     anonymously regardless of the signUp outcome. If the email is
//     already registered we still submit and show a gentle "sign in
//     next time" note alongside success.
//
// clientToken is generated once per mount so a double-tap / retry
// dedupes server-side (unique partial index on rental_inquiries)
// instead of creating duplicate leads.
//
// DATES (build loop 2C). The two raw <input type="date"> fields are now
// the FALLBACK, not the default: when the car has a live calendar the
// form renders RentalDatePicker against the open days the availability
// route returns, and asks that same route for the price. Two rules hold
// this together:
//
//   · The price is never computed here. The browser sends two dates and
//     is told a number of cents; nothing on this side multiplies a rate.
//     A client-computed total is a total the server did not agree to.
//   · The client-side range check is the SERVER's check. validate() calls
//     checkOpenRange(), whose test asserts it rejects exactly what the
//     route's checkRange() rejects — so a range this form accepts is one
//     the API accepts, and the renter never gets a refusal after the
//     click.
//
// DEGRADATION IS THE NORMAL PATH TODAY. 0046/0047 are written but not
// applied, and RYDA-fleet cars have no listing row at all, so
// `available: false` is expected: the picker disappears, the plain date
// inputs come back, and the lead still lands. The submit contract is
// identical on both paths.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import { useAuthStatus } from "@/lib/use-auth-status";
import { useRentalProfile } from "@/lib/use-rental-profile";
import { anonymousOperatorLabel } from "@/lib/rental-booking-access";
import {
  FOCUS_RING,
  formatBookingCents,
  formatBookingDay,
} from "@/lib/rental-booking-display";
import { RentalDatePicker } from "@/components/rental-date-picker";
import {
  MAX_INQUIRY_SPAN_NIGHTS,
  nightsBetween,
} from "@/lib/rental-availability";
import {
  checkOpenRange,
  firstBookableRange,
  rentalQuoteMessage,
  type OpenDayRangeInput,
  type PublicRentalQuote,
  type RentalAvailabilityResponse,
  type RentalAvailabilityUnavailableReason,
} from "@/lib/rental-quote";

type Status = "idle" | "submitting" | "success" | "error";

/** The live calendar, or the reason there isn't one. */
type Availability =
  | { kind: "loading" }
  /**
   * No live calendar: pre-migration, a RYDA-fleet symbol, a closed car,
   * or a failure — and WHICH of those it is now travels with it. The
   * route writes renter-ready copy for each state and this used to throw
   * both fields away, so a car whose operating window had lapsed
   * ("This car isn't taking dates right now.") rendered identically to a
   * working one.
   */
  | {
      kind: "off";
      reason: RentalAvailabilityUnavailableReason | null;
      message: string | null;
    }
  | { kind: "on"; data: Extract<RentalAvailabilityResponse, { available: true }> };

/**
 * Which degraded states are worth putting on screen.
 *
 * `not_listed` and `not_configured` are RYDA-side facts about a car that
 * was never on the live calendar — a fleet symbol, or a database that
 * has not taken 0046 yet. The plain date inputs ARE the designed path
 * there, and "live availability isn't set up for this car yet" would tell
 * a renter about our migration state. `closed` and `unavailable` are
 * different: the first is the operator saying no dates, the second is a
 * calendar we could not read, and a renter who is about to type dates
 * into a box needs to know both.
 */
function shouldShowDegradedNote(
  reason: RentalAvailabilityUnavailableReason | null,
): boolean {
  return reason === "closed" || reason === "unavailable";
}

// MONEY AND DATES ARE FORMATTED BY THE SHARED HELPERS
// (src/lib/rental-booking-display.ts), not by private copies here. The
// quote a renter reads in this form, the total on the confirmation page
// the submit navigates to, and the figure on /account/rentals a week
// later are the same booking — formatBookingCents shows cents only when
// the amount is not whole (0044 constrains daily_rate_cents only to
// `> 0`, so "$1,451 × 3 nights" beside a "$4,352" total that does not
// multiply out was a real rendering), and formatBookingDay parses a
// 'YYYY-MM-DD' calendar day in UTC rather than at local noon.

// What happened to the parallel account-creation attempt (anon path
// only). Rendered as a sub-note in the success state — never blocks
// or fails the inquiry itself.
type AccountNote = null | "created" | "existing" | "failed";

/**
 * One idempotency token per form mount, matching the (renter, listing,
 * dates) dedup contract on the route.
 *
 * 0047 indexes (renter_user_id, client_token) UNIQUE, and the route
 * treats a collision as "this exact submission, again" ONLY when the
 * colliding row also matches the listing and both dates; a token that
 * comes back attached to a different car or a different range is
 * answered `client_token_reused` rather than being reported as a
 * success that did not happen. A per-mount token satisfies that: within
 * one mount a double-tap dedupes, and a fresh mount is a fresh
 * submission. See the rotate branch in classifyBookingRefusal for the
 * one case where a mount outlives its token.
 */
function newClientToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * What the form should DO about a refused booking POST, beyond showing
 * the sentence.
 *
 *   none      the message is the whole answer; the renter fixes it.
 *   refresh   the calendar moved under them — re-read it so the picker
 *             greys out what is now gone.
 *   rotate    the token is spent; mint a new one so the retry can land.
 *   signin    the session died between render and submit.
 *   fallback  retrying will never work. Send the lead down the inquiry
 *             path instead of losing it (long-standing doctrine here).
 */
type BookingRefusalAction =
  | "none"
  | "refresh"
  | "rotate"
  | "signin"
  | "fallback";

type BookingRefusal = { message: string; action: BookingRefusalAction };

/**
 * Every refusal POST /api/rental-bookings can return, as something the
 * renter can act on.
 *
 * The route already writes renter-facing sentences — the quote
 * rejections come from rentalQuoteMessage(), the shared function this
 * form's own validate() calls, so a refusal after the click reads in the
 * same words as a refusal before it. So `body.error` is preferred over
 * anything restated here, and this function's real job is the SECOND
 * half: deciding what happens next, keyed off the route's own `reason`
 * codes rather than off a substring match on prose.
 *
 * The two exceptions, where the route's own words are NOT shown:
 *
 *   503 — the copy names "migration 0047". True, useful in a log, and
 *         not a sentence to put in front of a renter. It is also the
 *         exact pre-migration window this branch exists for: 0046
 *         applied and 0047 not leaves a car with a live calendar and no
 *         bookings table, so the quote renders and the insert 503s.
 *         The lead falls through to the inquiry path and the renter sees
 *         the inquiry's own success state, which promises only what
 *         actually happened.
 *
 *   client_token_reused — the route says "reload the page". Rotating the
 *         token in place is the same fix without losing the renter's
 *         selected dates.
 */
function classifyBookingRefusal(
  status: number,
  body: { error?: unknown; reason?: unknown },
): BookingRefusal {
  const server =
    typeof body.error === "string" && body.error.trim() ? body.error : null;
  const reason = typeof body.reason === "string" ? body.reason : null;

  // ── retrying is futile: keep the lead, change the rail ────────────
  //
  // 503  the booking tables are not applied here, or availability could
  //      not be read at all.
  // 404  the listing vanished between the calendar load and the click.
  // invalid_listing / invalid_fee_config  the car cannot be priced for
  //      online booking. The second is only reachable from this POST —
  //      the availability route deliberately does not resolve the
  //      operator's commission rate — and its own copy already says
  //      "send the request and we'll follow up", which is precisely
  //      what falling back does.
  if (status === 503 || status === 404) {
    return { message: server ?? "Online booking is unavailable.", action: "fallback" };
  }
  if (reason === "invalid_listing" || reason === "invalid_fee_config") {
    return { message: server ?? "This car can't be booked online yet.", action: "fallback" };
  }

  if (status === 401) {
    return {
      message: server ?? "Sign in to request these dates.",
      action: "signin",
    };
  }

  if (reason === "client_token_reused") {
    return {
      message:
        "Those dates changed after the last attempt. Press the button once more and we'll send this as a new request.",
      action: "rotate",
    };
  }

  // ── the world moved: re-read the calendar ─────────────────────────
  //
  // `unavailable` is the route's single word for "one of those days is
  // gone" — a confirmed booking landed, or the operator blacked the days
  // out. It does not say which, deliberately: naming it would publish
  // another renter's booking against a named car, and the next action is
  // the same either way. `outside_window` is the operator's season
  // moving. A bare 409 with no reason is the listing leaving the
  // platform ("That car isn't taking bookings right now.") — which the
  // calendar will report as not_listed on the next read.
  if (reason === "unavailable" || reason === "outside_window") {
    return {
      message: server ?? "Some of those days aren't available any more.",
      action: "refresh",
    };
  }
  if (status === 409 && !reason) {
    return {
      message: server ?? "That car isn't taking bookings right now.",
      action: "refresh",
    };
  }

  // too_short / too_long / invalid_dates — the route's sentence already
  // carries THIS car's own min/max nights, which is why it is not
  // rewritten here.
  return {
    message:
      server ??
      (status === 429
        ? "Too many requests. Try again in a minute."
        : "Could not send that request. Please try again."),
    action: "none",
  };
}

// Local YYYY-MM-DD (not toISOString, which is UTC and rolls a Miami
// evening over to tomorrow's date).
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RentalInquiryForm({
  vehicleSlug,
  vehicleName,
  market,
  onListingRateCents,
}: {
  vehicleSlug: string;
  vehicleName: string;
  market: string;
  /**
   * The listing's daily rate as the DATABASE holds it, reported upward
   * once the availability route answers (null when there is no live
   * listing). The booking card's headline rate comes from the static
   * partner-fleet file, and the quote below comes from
   * rental_listings.daily_rate_cents — two independently-sourced prices
   * in one card. This is how the card stops showing the stale one.
   */
  onListingRateCents?: (cents: number | null) => void;
}) {
  const router = useRouter();
  const { status: authStatus, user } = useAuthStatus();
  // Prefill source for signed-in members. Enabled only once authed so
  // anon visitors never fire a doomed 401 fetch.
  const { profile } = useRentalProfile(authStatus === "authed");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Set only by the 401 branch, so the error block can offer the one
  // action that fixes it instead of telling the renter to try again.
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [accountNote, setAccountNote] = useState<AccountNote>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  // Whether the visitor has touched the consent checkbox this mount.
  // Until they do, a signed-in member's STORED preference wins over
  // the opt-out default — the API persists whatever this form submits
  // (rental_profiles upsert), so pre-ticking the box for a member who
  // opted out on /account/profile would silently re-enroll them.
  const [optInTouched, setOptInTouched] = useState(false);

  // `min` attrs + default dates are set post-mount (not at render) so
  // the statically-prerendered page never hydrates against a stale
  // build-time date. Same pattern as contact-form's URL-param read.
  const [todayStr, setTodayStr] = useState("");

  const [availability, setAvailability] = useState<Availability>({ kind: "loading" });
  // Bumped when the server tells us the calendar moved (a `refresh`
  // refusal). Re-reading is the only way the picker can grey out a day
  // that was taken while this page sat open.
  const [calendarNonce, setCalendarNonce] = useState(0);
  const [quote, setQuote] = useState<PublicRentalQuote | null>(null);
  // The server's reason a chosen range did not price. Normally
  // unreachable — the picker greys those days out — but a stale calendar
  // (an operator approving somebody else's request while this page sat
  // open) is exactly the case worth surfacing rather than swallowing.
  const [quoteNote, setQuoteNote] = useState<string | null>(null);

  // One idempotency token per mount — see newClientToken. Never
  // rendered, so the SSR/client value mismatch is harmless. Settable for
  // exactly one caller: the `rotate` refusal, which fires when a mount
  // outlives its token (a bfcache restore, then new dates).
  const [clientToken, setClientToken] = useState(newClientToken);

  useEffect(() => {
    const today = new Date();
    setTodayStr(localISO(today));
    // Default window: 2 weeks out, 3 days — matches the old booking
    // card's "never shows past dates" behavior.
    const s = new Date(today);
    s.setDate(s.getDate() + 14);
    const e = new Date(s);
    e.setDate(e.getDate() + 3);
    setStartDate((cur) => cur || localISO(s));
    setEndDate((cur) => cur || localISO(e));
  }, []);

  // Prefill contact fields for signed-in members without stomping
  // anything they've already typed. Profile row wins; auth metadata
  // (set at signup) is the fallback.
  useEffect(() => {
    if (authStatus !== "authed") return;
    const metaName =
      typeof user?.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";
    setName((cur) => cur || profile?.name || metaName);
    setPhone((cur) => cur || profile?.phone || "");
  }, [authStatus, user, profile]);

  // Reflect a signed-in member's stored marketing consent instead of
  // always pre-ticking opt-in. Same precedence as /account/profile:
  // rental_profiles boolean overrides user_metadata (default true —
  // the signup checkbox's opt-out model). Never overrides a checkbox
  // the visitor has already touched this mount.
  useEffect(() => {
    if (authStatus !== "authed" || optInTouched) return;
    let stored = user?.user_metadata?.marketing_opt_in !== false;
    if (typeof profile?.marketingOptIn === "boolean") {
      stored = profile.marketingOptIn;
    }
    setMarketingOptIn(stored);
  }, [authStatus, user, profile, optInTouched]);

  const showAccountFields = authStatus !== "authed";

  // ── Which endpoint this form submits to ───────────────────────────
  //
  // The listing's UUID, which only exists once the availability route
  // has answered `available: true`. It is the whole precondition for the
  // booking path: no live rental_listings row (a RYDA-fleet symbol, a
  // pre-0046 database, a paused car) means no id, means the inquiry.
  const listingId =
    availability.kind === "on" ? availability.data.listing.listingId : null;

  // Signed in AND bookable. Deliberately decided from render state
  // rather than re-derived inside onSubmit, so that what the renter is
  // LOOKING AT and where the click GOES cannot disagree: the fields
  // below, the button label and the footnote are all gated on this same
  // flag. See the header for why a signed-out visitor is never routed
  // here even after the inline signUp.
  const bookingPath = listingId !== null && authStatus === "authed";

  // Fields with nowhere to land on the booking path (0047 stores no note
  // and no marketing preference, and the POST body has no slot for
  // either). Rendered on the inquiry path exactly as before. `name` is
  // NOT in here on purpose — it is what the inquiry FALLBACK needs to
  // build a lead, and a name field promises the renter nothing.
  const showLeadExtras = !bookingPath;

  // ── The live calendar ─────────────────────────────────────────────
  //
  // Public route, so a plain fetch: no bearer, and no 401 for a visitor
  // who has not signed up yet — browsing open days pre-auth is the RLS
  // posture 0046 was written for.
  // Held in a ref so a caller passing an inline arrow does not re-run the
  // fetch on every render of the parent.
  const rateCallbackRef = useRef(onListingRateCents);
  useEffect(() => {
    rateCallbackRef.current = onListingRateCents;
  });

  // Which car we have already painted a calendar for. A re-read driven
  // by a `refresh` refusal must NOT blank the picker: dropping to the
  // skeleton also drops listingId, which flips bookingPath false, which
  // flashes three inquiry-only fields in and out underneath the error
  // that triggered the re-read. The stale calendar stays on screen for
  // the one round trip it takes to replace it — and the server is the
  // authority on those days regardless.
  const paintedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (paintedFor.current !== vehicleSlug) setAvailability({ kind: "loading" });
    (async () => {
      try {
        const res = await fetch(
          `/api/rental-availability/${encodeURIComponent(vehicleSlug)}`,
        );
        const body = (await res.json()) as RentalAvailabilityResponse;
        if (cancelled) return;
        paintedFor.current = vehicleSlug;
        if (res.ok && body?.available === true) {
          setAvailability({ kind: "on", data: body });
          rateCallbackRef.current?.(body.listing.dailyRateCents);
        } else {
          setAvailability({
            kind: "off",
            reason: body?.available === false ? body.reason : null,
            message: body?.available === false ? body.message : null,
          });
          rateCallbackRef.current?.(null);
        }
      } catch {
        // A calendar we cannot load is a calendar we do not show. The
        // lead is what matters; the inputs below still capture it — but
        // the renter is told, rather than handed a form that looks live.
        if (!cancelled) {
          paintedFor.current = vehicleSlug;
          setAvailability({
            kind: "off",
            reason: "unavailable",
            message: "We couldn't load this car's calendar. Try again shortly.",
          });
          rateCallbackRef.current?.(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleSlug, calendarNonce]);

  // The rules the picker enforces and validate() re-checks — one object,
  // built from the server's own answer.
  const rules: OpenDayRangeInput | null = useMemo(() => {
    if (availability.kind !== "on") return null;
    const { openDays, listing, window } = availability.data;
    return {
      openDays,
      minNights: listing.minNights,
      maxNights: listing.maxNights,
      window: { start_date: window.startDate, end_date: window.endDate },
    };
  }, [availability]);

  // Snap the "two weeks out, three nights" default onto days the car is
  // actually open. Runs once per calendar payload: without the guard the
  // effect would fight the renter's own clicks, since it depends on the
  // dates it sets.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (availability.kind !== "on" || !rules) return;
    // The nonce is in the key so a refusal-driven re-read always
    // re-evaluates the selection. Without it, a blackout that replaced a
    // booking day-for-day leaves openDays.length unchanged, the guard
    // short-circuits, and the renter keeps a range the server just
    // rejected.
    const key = `${availability.data.listing.listingId}:${availability.data.openDays.length}:${calendarNonce}`;
    if (seededFor.current === key) return;
    seededFor.current = key;

    if (startDate && endDate && checkOpenRange(startDate, endDate, rules).ok) return;
    const seed = firstBookableRange(rules, startDate || undefined);
    setStartDate(seed?.startDate ?? "");
    setEndDate(seed?.endDate ?? "");
  }, [availability, rules, startDate, endDate, calendarNonce]);

  // ── The server quote ──────────────────────────────────────────────
  //
  // Fires only on a complete range, and the response is displayed
  // verbatim: this component never multiplies a rate by a night count.
  useEffect(() => {
    if (availability.kind !== "on" || !startDate || !endDate) {
      setQuote(null);
      setQuoteNote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ start: startDate, end: endDate });
        const res = await fetch(
          `/api/rental-availability/${encodeURIComponent(vehicleSlug)}?${params.toString()}`,
        );
        const body = (await res.json()) as RentalAvailabilityResponse;
        if (cancelled) return;
        if (res.ok && body?.available === true) {
          setQuote(body.quote);
          setQuoteNote(body.quote ? null : (body.quoteError?.message ?? null));
        } else {
          setQuote(null);
          setQuoteNote(null);
        }
      } catch {
        if (!cancelled) {
          setQuote(null);
          setQuoteNote(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [availability.kind, vehicleSlug, startDate, endDate, calendarNonce]);

  function validate(): string | null {
    if (!startDate || !endDate) return "Pick your dates first.";
    // ISO date strings compare correctly as strings.
    if (todayStr && startDate < todayStr)
      return "Start date can't be in the past.";
    if (endDate < startDate) return "Return date must be on or after the start.";
    // nightsBetween(), not a subtraction written out here. It is the one
    // expression of "the 5th to the 8th is three nights" and it is
    // UTC-anchored, which is the whole reason this line stopped being
    // local-time arithmetic: a DST fall-back hour inside the span
    // wrongly rejected an exactly-30-night rental. The cap comes from
    // the same module the server's validateRentalInquiry() reads it
    // from, so this check cannot come to be looser than that one.
    const nights = nightsBetween(startDate, endDate);
    if (nights === null) return "Pick your dates first.";
    if (nights > MAX_INQUIRY_SPAN_NIGHTS)
      return `For rentals over ${MAX_INQUIRY_SPAN_NIGHTS} days, contact us directly — we'll arrange it.`;
    // The calendar's own rules, when the car has one. Same function the
    // picker greys days out with and the same rejection vocabulary the
    // route answers in, so this cannot accept a range the API refuses.
    if (rules) {
      const check = checkOpenRange(startDate, endDate, rules);
      if (!check.ok) {
        return rentalQuoteMessage(check.reason, {
          minNights: rules.minNights,
          maxNights: rules.maxNights,
        });
      }
    }
    if (name.trim().length < 2) return "Your name, so the operator knows who's asking.";
    if (showAccountFields && !email.includes("@"))
      return "A valid email — it's where the operator's reply lands.";
    return null;
  }

  /**
   * Create the booking request (POST /api/rental-bookings).
   *
   * Returns "fallback" — and shows nothing — when the refusal means this
   * car cannot be booked online at all, so the caller can still land the
   * lead down the inquiry path. Every other outcome is fully handled
   * here: navigated, or on screen as a specific sentence.
   */
  async function submitBooking(id: string): Promise<"handled" | "fallback"> {
    try {
      // authedFetch attaches the session bearer. The route is
      // account-first (0047's renter_user_id is NOT NULL), so this is
      // the one thing it cannot be called without.
      const res = await authedFetch("/api/rental-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The body IS the contract: a car and two dates. No price — the
        // server recomputes the quote from the listing row and freezes
        // it, and there is deliberately nowhere in this body to put a
        // total the browser calculated.
        body: JSON.stringify({
          listingId: id,
          startDate,
          endDate,
          clientToken,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        reason?: unknown;
        booking?: { id?: unknown };
      };

      if (res.ok) {
        const bookingId =
          typeof body.booking?.id === "string" ? body.booking.id : null;
        if (!bookingId) {
          // A 2xx with no row is not a success this form can show, and
          // it will not claim one. Unreachable through the route as
          // written — it answers with the booking or with an error.
          setErrorMessage(
            "Your request was sent, but we couldn't open the confirmation page. Nothing was charged, and the operator can still see it.",
          );
          setStatus("error");
          return "handled";
        }
        // The confirmation page re-reads the booking from the API rather
        // than trusting anything passed in the URL — the id is the only
        // thing that travels, and GET /api/rental-bookings/[id] answers
        // 404 to anyone who is not a party to it.
        router.push(
          `/rent/booking-requested?id=${encodeURIComponent(bookingId)}`,
        );
        // Stay in `submitting` through the navigation so the button
        // cannot be pressed twice on a slow transition.
        return "handled";
      }

      const refusal = classifyBookingRefusal(res.status, body);
      if (refusal.action === "fallback") return "fallback";
      if (refusal.action === "refresh") setCalendarNonce((n) => n + 1);
      if (refusal.action === "rotate") setClientToken(newClientToken());
      if (refusal.action === "signin") setNeedsSignIn(true);
      setErrorMessage(refusal.message);
      setStatus("error");
      return "handled";
    } catch {
      // Transport failure, not a refusal. Deliberately NOT a fallback:
      // the request may in fact have been created, and writing a lead
      // for it would duplicate the renter's own ask. The dates are still
      // on screen, so a retry is the honest offer — and the route's
      // client_token dedup makes that retry safe.
      setErrorMessage(
        "We couldn't reach RYDA. Check your connection and try again.",
      );
      setStatus("error");
      return "handled";
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const invalid = validate();
    if (invalid) {
      setErrorMessage(invalid);
      setNeedsSignIn(false);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);
    setNeedsSignIn(false);

    // ── The booking path ──────────────────────────────────────────
    // Signed in, on a car with a live listing row. There is no account
    // to create and no lead to write — unless the request is refused on
    // a ground retrying cannot fix, in which case we drop through to the
    // inquiry rather than lose the renter.
    if (bookingPath && listingId) {
      const outcome = await submitBooking(listingId);
      if (outcome === "handled") return;
    }

    // ── Parallel account creation (anon path) ─────────────────────
    // Best-effort, never gates the inquiry. signUp uses the email-
    // confirmation flow (no immediate session), so the inquiry below
    // still goes out anonymously either way.
    let note: AccountNote = null;
    if (showAccountFields && supabase && password.length >= 8) {
      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/account/requests")}`;
        const { data: suData, error: suErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            // Same audit-trail metadata conventions as /signup. No
            // aged_confirmed here — this form doesn't ask, KYC does.
            data: {
              name: name.trim(),
              marketing_opt_in: marketingOptIn,
            },
          },
        });
        if (suErr) {
          note = /already|registered|exists/i.test(suErr.message)
            ? "existing"
            : "failed";
        } else if (
          // With email confirmation + enumeration protection on,
          // signUp "succeeds" for an existing email but returns a
          // user with no identities. Treat that as existing too.
          suData.user &&
          Array.isArray(suData.user.identities) &&
          suData.user.identities.length === 0
        ) {
          note = "existing";
        } else {
          note = "created";
        }
      } catch {
        note = "failed";
      }
    }

    // ── The inquiry itself — the lead must never be lost ──────────
    //
    // Reached three ways: a signed-out visitor, a car with no live
    // listing, and a booking POST that came back "fallback". In the
    // third case the account fields were never rendered, so the email
    // comes off the session — which is exactly what the branch below
    // already did for signed-in members. `message` and `marketingOptIn`
    // are likewise whatever the form holds: on the booking path the
    // note is empty (never collected) and the consent value is the
    // member's own STORED preference, resolved by the effect above, not
    // a fresh opt-in this form invented.
    try {
      const inquiryEmail = showAccountFields ? email : (user?.email ?? email);
      // authedFetch attaches the bearer when a session exists (so the
      // API links user_id + upserts rental_profiles) and degrades to a
      // plain anon fetch otherwise.
      const res = await authedFetch("/api/rental-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: inquiryEmail,
          phone: phone.trim() || undefined,
          vehicleSlug,
          startDate,
          endDate,
          message: message.trim() || undefined,
          marketingOptIn,
          clientToken,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}) as { error?: string });
        setErrorMessage(
          j.error ||
            (res.status === 429
              ? "Too many requests. Try again in a minute."
              : null),
        );
        throw new Error(j.error || "Submission failed.");
      }
      setAccountNote(note);
      setStatus("success");
      setErrorMessage(null);
    } catch {
      setStatus("error");
    }
  }

  // ── Success replaces the form ───────────────────────────────────
  if (status === "success") {
    return (
      <div>
        <p className="font-display text-2xl text-ink">Request sent.</p>
        {/* D6, AND THE OPERATOR STAND-IN COMES FROM ONE FUNCTION. This
            sentence hardcoded "A vetted Miami operator", which is right
            in Miami and wrong everywhere else the moment a second market
            opens — and it is the same promise rental-booking-access.ts's
            anonymousOperatorLabel() makes on every other surface (the
            confirmation page, the renter's list, both booking routes'
            payloads). An operator's identity, real or stand-in, now
            reaches a screen through that one function, so the pre-
            confirmation wording cannot come to differ by surface. */}
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          The <span className="font-medium text-ink">{vehicleName}</span>,{" "}
          {formatBookingDay(startDate)} – {formatBookingDay(endDate)} in {market}.{" "}
          {anonymousOperatorLabel(market)} will reply shortly.
        </p>
        <p className="mt-3 text-xs text-mute">
          We&apos;ve emailed you a confirmation with the details.
        </p>
        {accountNote === "created" && (
          <p className="mt-3 rounded-xl border border-rule bg-cream-2/40 p-3 text-xs text-ink-soft">
            We also created your RYDA account — confirm the email we just sent
            and your requests will be waiting in your dashboard.
          </p>
        )}
        {accountNote === "existing" && (
          <p className="mt-3 rounded-xl border border-rule bg-cream-2/40 p-3 text-xs text-ink-soft">
            Looks like you already have a RYDA account —{" "}
            <Link
              href="/signin?next=%2Faccount%2Frequests"
              className={`rounded-sm text-red hover:text-red-deep ${FOCUS_RING}`}
            >
              sign in
            </Link>{" "}
            next time and requests land in your dashboard automatically.
          </p>
        )}
        {accountNote === "failed" && (
          <p className="mt-3 text-xs text-mute">
            We couldn&apos;t create your account automatically, but your request
            went through — nothing else to do.
          </p>
        )}
        {authStatus === "authed" && (
          <Link
            href="/account/requests"
            className={`mt-4 inline-flex rounded-sm text-xs font-medium text-red hover:text-red-deep ${FOCUS_RING}`}
          >
            Track this request →
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Dates — live calendar when the car has one, plain inputs when
          it doesn't (pre-migration, RYDA fleet, or a failed load), and an
          explicit placeholder while we still don't know which.
          `loading` used to fall through to the inputs, so every visit
          painted two date fields and then swapped in a ~340px calendar —
          and a renter who typed into them on a slow connection had their
          dates silently overwritten by the seeding effect. */}
      {availability.kind === "loading" ? (
        <div>
          <span className="block text-xs font-medium uppercase tracking-wider text-mute">
            Your dates
          </span>
          <div
            aria-hidden
            className="mt-2 h-80 rounded-2xl border border-rule bg-cream-2/40 motion-safe:animate-pulse"
          />
          <p className="sr-only" role="status">
            Loading this car&apos;s calendar.
          </p>
        </div>
      ) : availability.kind === "on" ? (
        <div>
          <span className="block text-xs font-medium uppercase tracking-wider text-mute">
            Your dates
          </span>
          <div className="mt-2">
            <RentalDatePicker
              openDays={availability.data.openDays}
              windowStart={availability.data.window.startDate}
              windowEnd={availability.data.window.endDate}
              minNights={availability.data.listing.minNights}
              maxNights={availability.data.listing.maxNights}
              startDate={startDate}
              endDate={endDate}
              today={availability.data.today}
              disabled={status === "submitting"}
              onSelect={(range) => {
                setStartDate(range.startDate);
                setEndDate(range.endDate);
                if (status === "error") setStatus("idle");
              }}
            />
          </div>

          {/* The price, as the server computed it. Nothing on this side
              multiplies a rate by a night count.

              aria-live, because the number arrives a round trip AFTER the
              picker's live region has already announced the range: a
              screen-reader renter heard "Aug 5 to Aug 8, 3 nights" and
              was then never told the total — the one figure this whole
              surface exists to communicate. */}
          {quote && (
            <div
              aria-live="polite"
              className="mt-3 rounded-xl border border-rule bg-cream-2/40 p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                {/* Tabular across the whole caption, not just the night
                    count: the rate and the count sit on one line and a
                    proportional "$1,450" next to a tabular "3" is the
                    kind of drift the price pattern exists to stop. */}
                <span className="text-xs tabular-nums text-ink-soft">
                  {formatBookingCents(quote.dailyRateCents)} × {quote.nights} night
                  {quote.nights === 1 ? "" : "s"}
                </span>
                <span className="font-display text-2xl tabular-nums text-ink">
                  {formatBookingCents(quote.renterTotalCents)}
                </span>
              </div>
              {quote.depositAmountCents > 0 && (
                // NAMES NO MECHANISM (guardrail 3.9). This said "a
                // refundable hold on your card at pickup", which is wrong
                // twice over: D5 places the authorization at APPROVAL,
                // not at pickup, and phase 3C — the code that would place
                // it — is unbuilt, so there is no PaymentIntent and no
                // card on file anywhere in this flow.
                <p className="mt-1 text-[11px] tabular-nums text-mute">
                  This car carries a refundable{" "}
                  {formatBookingCents(quote.depositAmountCents)} security deposit.
                  Nothing is placed on your card now — the operator confirms
                  the deposit terms with you.
                </p>
              )}
              {/* What the submit ACTUALLY carries, and the two paths say
                  different true things.

                  On the BOOKING path this number is not an estimate: the
                  route recomputes it server-side and freezes the
                  snapshot onto the rental_bookings row (0047), and 0047's
                  trigger makes the quote columns immutable — a
                  counter-offer is a new row with a new price, never an
                  edit to this one. So the operator answers these dates at
                  this price; they do not revise it in place.

                  On the INQUIRY path there is no row and no freeze, so
                  the operator genuinely does confirm the final number
                  when they reply. Neither sentence mentions a card,
                  a hold or a guarantee (guardrail 3.9) — nothing in this
                  flow collects one. */}
              <p className="mt-1.5 text-[11px] text-mute">
                {bookingPath
                  ? "Calculated from this car's listed daily rate and locked to your request. Nothing is charged now — the operator has 24 hours to confirm these dates, or propose alternates."
                  : "Calculated from this car's listed daily rate. Nothing is charged now — the operator confirms the dates and the final price with you."}
              </p>
            </div>
          )}
          {/* role="alert": a stale calendar rejecting a range is the one
              case worth interrupting for, and it was landing in a bare
              <p> that assistive tech never announced. */}
          {!quote && quoteNote && (
            <p role="alert" className="mt-2 text-xs text-warn-deep">
              {quoteNote}
            </p>
          )}
        </div>
      ) : (
        <div>
          {shouldShowDegradedNote(availability.reason) && availability.message && (
            <p
              role="status"
              className="mb-3 rounded-xl border border-rule bg-cream-2/40 px-4 py-3 text-xs text-ink-soft"
            >
              {availability.message} Send your dates anyway and the operator
              will come back to you.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-mute">
                Start
              </span>
              <input
                type="date"
                required
                value={startDate}
                min={todayStr || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-mute">
                Return
              </span>
              <input
                type="date"
                required
                value={endDate}
                min={startDate || todayStr || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
        </div>
      )}

      {/* The one nudge a signed-out visitor gets on a bookable car.
          NOT a wall: the form below still works and still lands the lead
          (that is the doctrine this funnel is built on). It exists
          because the booking path needs a session at the moment of
          submit — signUp here uses the email-confirmation flow and
          returns none — so a visitor who ALREADY has an account is one
          click from the better outcome, and nobody else is blocked.
          `next` returns them to this exact car. */}
      {availability.kind === "on" && authStatus === "anon" && (
        <p className="rounded-xl border border-rule bg-cream-2/40 px-4 py-3 text-[11px] leading-relaxed text-ink-soft">
          Already have a RYDA account?{" "}
          <Link
            href={`/signin?next=${encodeURIComponent(`/rent/${vehicleSlug}`)}`}
            className={`rounded-sm font-medium text-red hover:text-red-deep ${FOCUS_RING}`}
          >
            Sign in
          </Link>{" "}
          to send these dates as a booking request the operator answers
          directly. Otherwise fill this in and we&apos;ll route it to them —
          either way, no card.
        </p>
      )}

      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-mute">
          Full name
        </span>
        <input
          type="text"
          required
          autoComplete="name"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
      </label>

      {showAccountFields && (
        <>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              Password
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <span className="mt-1.5 block text-[11px] text-mute">
              This creates your RYDA account — 30 seconds, no card.
            </span>
          </label>
        </>
      )}

      {/* THE THREE FIELDS THE BOOKING PATH DOES NOT RENDER, and the
          reason is the same for all of them: POST /api/rental-bookings
          has nowhere to put them. 0047 stores no free-text note and no
          marketing preference, and parseCreateBody reads exactly four
          keys. Collecting a note into a request that discards it is the
          same broken promise as quoting a booking the button cannot
          create — the defect this file was opened to fix — so on that
          path they are absent rather than ignored.

          Booking-scoped renter↔operator messaging is build-loop 2E and
          opens at confirmation (D6); the marketing preference is
          editable on /account/profile. Phone is optional on a lead and
          the operator reaches a booked renter through the account. */}
      {showLeadExtras && (
        <>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              Phone <span className="normal-case tracking-normal">(optional)</span>
            </span>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+1 305 555 0145"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              Anything else{" "}
              <span className="normal-case tracking-normal">(optional)</span>
            </span>
            <textarea
              rows={3}
              placeholder="Delivery address, occasion, questions…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputCls} h-auto py-3`}
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 px-1 text-xs">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => {
                setMarketingOptIn(e.target.checked);
                setOptInTouched(true);
              }}
              className="mt-0.5 h-4 w-4 accent-red"
            />
            <span className="text-mute">
              Send me Miami drops and member offers. Unsubscribe any time.
            </span>
          </label>
        </>
      )}

      {status === "error" && (
        <p role="alert" className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red">
          {errorMessage ||
            "Something went wrong. Try again, or email hello@ryda.pro."}
          {/* A dead session is the one refusal with a single obvious
              fix, so it gets the link rather than "try again". */}
          {needsSignIn && (
            <>
              {" "}
              <Link
                href={`/signin?next=${encodeURIComponent(`/rent/${vehicleSlug}`)}`}
                className={`rounded-sm font-medium underline hover:text-red-deep ${FOCUS_RING}`}
              >
                Sign in
              </Link>{" "}
              and your dates will still be here.
            </>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className={`inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-7 text-sm font-semibold text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
      >
        {status === "submitting"
          ? "Sending request…"
          : bookingPath
            ? "Request these dates"
            : "Request this car"}
      </button>

      {/* GUARDRAIL 3.9: state what the code does. On the booking path the
          submit creates a rental_bookings row and touches Stripe nowhere
          — no SetupIntent, no card, no hold — so the footnote says only
          that, and the "never costs you more than going direct" claim
          (which belongs to the lead funnel, and which phase 4A sweeps
          when the on-platform rail lands) is not repeated over a request
          that carries a frozen price. */}
      <p className="text-center text-[11px] leading-relaxed text-mute">
        {bookingPath ? (
          <>
            No card, no charge — RYDA collects nothing on a request, and
            these dates aren&apos;t held until the operator confirms. By
            requesting you agree to RYDA&apos;s{" "}
          </>
        ) : (
          <>
            Your price is the operator&apos;s price — inquiring through RYDA
            never costs you more than going direct. By requesting you agree
            to RYDA&apos;s{" "}
          </>
        )}
        <Link
          href="/legal/privacy"
          className={`rounded-sm underline hover:text-ink ${FOCUS_RING}`}
        >
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

const inputCls =
  "mt-2 h-11 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20";
