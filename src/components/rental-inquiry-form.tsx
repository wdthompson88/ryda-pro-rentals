"use client";

// Rental inquiry form — the conversion surface of the rentals-first
// funnel. Lives in the /rent/[symbol] booking column and posts to
// POST /api/rental-inquiry (structured lead → routed to a vetted Miami
// operator, who closes the rental on their own contract/insurance).
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
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import { useAuthStatus } from "@/lib/use-auth-status";
import { useRentalProfile } from "@/lib/use-rental-profile";
import { formatUSD } from "@/lib/market-data";
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

/**
 * Cents as dollars, showing cents only when the amount is not whole.
 *
 * formatUSD rounds to whole dollars, and 0044 constrains daily_rate_cents
 * only to `> 0` — so a $1,450.50 rate rendered "$1,451 × 3 nights"
 * beside a "$4,352" total that does not multiply out. Formatting each
 * figure from its own exact cents keeps the arithmetic checkable, which
 * is the entire reason the two sit on one tabular-nums row.
 */
function formatCents(cents: number): string {
  return formatUSD(cents / 100, { decimals: cents % 100 === 0 ? 0 : 2 });
}

// What happened to the parallel account-creation attempt (anon path
// only). Rendered as a sub-note in the success state — never blocks
// or fails the inquiry itself.
type AccountNote = null | "created" | "existing" | "failed";

// Local YYYY-MM-DD (not toISOString, which is UTC and rolls a Miami
// evening over to tomorrow's date).
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prettyDate(iso: string): string {
  // Noon anchor dodges timezone off-by-one when parsing a bare date.
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const { status: authStatus, user } = useAuthStatus();
  // Prefill source for signed-in members. Enabled only once authed so
  // anon visitors never fire a doomed 401 fetch.
  const { profile } = useRentalProfile(authStatus === "authed");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  const [quote, setQuote] = useState<PublicRentalQuote | null>(null);
  // The server's reason a chosen range did not price. Normally
  // unreachable — the picker greys those days out — but a stale calendar
  // (an operator approving somebody else's request while this page sat
  // open) is exactly the case worth surfacing rather than swallowing.
  const [quoteNote, setQuoteNote] = useState<string | null>(null);

  // One idempotency token per mount. Never rendered, so the SSR/client
  // value mismatch is harmless.
  const [clientToken] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

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

  useEffect(() => {
    let cancelled = false;
    setAvailability({ kind: "loading" });
    (async () => {
      try {
        const res = await fetch(
          `/api/rental-availability/${encodeURIComponent(vehicleSlug)}`,
        );
        const body = (await res.json()) as RentalAvailabilityResponse;
        if (cancelled) return;
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
  }, [vehicleSlug]);

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
    const key = `${availability.data.listing.listingId}:${availability.data.openDays.length}`;
    if (seededFor.current === key) return;
    seededFor.current = key;

    if (startDate && endDate && checkOpenRange(startDate, endDate, rules).ok) return;
    const seed = firstBookableRange(rules, startDate || undefined);
    setStartDate(seed?.startDate ?? "");
    setEndDate(seed?.endDate ?? "");
  }, [availability, rules, startDate, endDate]);

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
  }, [availability.kind, vehicleSlug, startDate, endDate]);

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const invalid = validate();
    if (invalid) {
      setErrorMessage(invalid);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

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
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          The <span className="font-medium text-ink">{vehicleName}</span>,{" "}
          {prettyDate(startDate)} – {prettyDate(endDate)} in {market}. A vetted
          Miami operator will reply shortly.
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
            <Link href="/signin?next=%2Faccount%2Frequests" className="text-red hover:text-red-deep">
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
            className="mt-4 inline-flex text-xs font-medium text-red hover:text-red-deep"
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
                  {formatCents(quote.dailyRateCents)} × {quote.nights} night
                  {quote.nights === 1 ? "" : "s"}
                </span>
                <span className="font-display text-2xl tabular-nums text-ink">
                  {formatCents(quote.renterTotalCents)}
                </span>
              </div>
              {quote.depositAmountCents > 0 && (
                // NAMES NO MECHANISM (guardrail 3.9). This said "a
                // refundable hold on your card at pickup", which is wrong
                // twice over: D5 places the authorization at APPROVAL,
                // not at pickup, and phase 3C — the code that would place
                // it — is unbuilt, so there is no PaymentIntent and no
                // card on file anywhere in this flow.
                <p className="mt-1 text-[11px] text-mute">
                  This car carries a refundable{" "}
                  {formatCents(quote.depositAmountCents)} security deposit.
                  Nothing is placed on your card now — the operator confirms
                  the deposit terms with you.
                </p>
              )}
              {/* What the submit ACTUALLY carries. The request sends the
                  dates and the car; the price is RYDA's calculation from
                  the operator's listed rate, and the operator confirms
                  the final number when they reply — which is the same
                  promise the rest of this page makes. */}
              <p className="mt-1.5 text-[11px] text-mute">
                Calculated from this car&apos;s listed daily rate. Nothing is
                charged now — the operator confirms the dates and the final
                price with you.
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
          Anything else <span className="normal-case tracking-normal">(optional)</span>
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

      {status === "error" && (
        <p role="alert" className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red">
          {errorMessage ||
            "Something went wrong. Try again, or email hello@ryda.pro."}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-7 text-sm font-semibold text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Sending request…" : "Request this car"}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-mute">
        Your price is the operator&apos;s price — inquiring through RYDA never
        costs you more than going direct. By requesting you agree to RYDA&apos;s{" "}
        <Link href="/legal/privacy" className="underline hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

const inputCls =
  "mt-2 h-11 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20";
