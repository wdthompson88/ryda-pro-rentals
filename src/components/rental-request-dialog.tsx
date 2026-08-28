"use client";

// The two doors between "Request these dates" and a request actually
// leaving the browser. Founder decision (2026-08-26), modelled on
// Zocdoc's review step: pick dates → sign in → confirm who you are →
// send. Nothing in this file talks to an API; it collects, validates
// and hands back, and RentalInquiryForm does the sending.
//
//   RentalSignInDialog   no session. Sign in / create an account, with
//                        the car AND the chosen dates in `next` so the
//                        visitor lands back here with them still
//                        selected. "Not now" simply closes it — the
//                        dates stay on the page.
//
//   RentalConfirmDialog  signed in. The car, the dates and the price
//                        about to be asked for, then the renter's
//                        details — full name, email (read-only, from
//                        the account), phone, date of birth — prefilled
//                        from what is on file and editable in place.
//                        "Send request" validates them with the same
//                        function the booking API runs
//                        (renter-details.ts) and hands them up; the
//                        form saves them to the profile, then submits.
//
// The confirm dialog never claims a card, a hold or a guarantee —
// nothing in this flow collects one (guardrail 3.9). Its footnote says
// what the send does and no more.

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Dialog } from "@/components/dialog";
import {
  FOCUS_RING,
  formatBookingCents,
  formatBookingDay,
} from "@/lib/rental-booking-display";
import { RENTAL_MIN_AGE_YEARS } from "@/lib/rental-eligibility";
import {
  validateRenterDetails,
  type RenterDetails,
  type RenterDetailsField,
  type RenterDetailsProblem,
} from "@/lib/renter-details";
import type { PublicRentalQuote } from "@/lib/rental-quote";

const PRIMARY_BTN = `inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-7 text-sm font-semibold text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
const SECONDARY_BTN = `inline-flex h-12 w-full items-center justify-center rounded-full border border-rule bg-surface px-7 text-sm font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
const INPUT =
  "mt-2 h-11 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20 aria-[invalid=true]:border-red";
const LABEL = "block text-xs font-medium uppercase tracking-wider text-mute";

// ── Sign in first ─────────────────────────────────────────────────────

export function RentalSignInDialog({
  open,
  onClose,
  returnTo,
}: {
  open: boolean;
  onClose: () => void;
  /** Same-origin path to come back to — the car, with the dates in the
   *  query so they survive the round trip (safeNext allows `?`). */
  returnTo: string;
}) {
  const titleId = useId();
  const next = encodeURIComponent(returnTo);
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="font-display text-2xl leading-tight text-ink">
        Sign in to request these dates
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Your request goes to the operator with your name and phone number,
        so it needs an account behind it. Your dates stay saved while you
        sign in.
      </p>
      <div className="mt-6 grid gap-2">
        <Link href={`/signin?next=${next}`} data-autofocus="" className={PRIMARY_BTN}>
          Sign in
        </Link>
        <Link href={`/signup?next=${next}`} className={SECONDARY_BTN}>
          Create an account
        </Link>
        <button
          type="button"
          onClick={onClose}
          className={`mt-1 rounded-sm py-2 text-center text-xs font-medium text-ink-soft hover:text-ink ${FOCUS_RING}`}
        >
          Not now
        </button>
      </div>
    </Dialog>
  );
}

// ── Confirm your details ──────────────────────────────────────────────

export type RentalRequestSummary = {
  vehicleName: string;
  market: string;
  startDate: string;
  endDate: string;
  /** The server's quote when this send creates a booking request; null
   *  on the inquiry path, where the operator confirms the price. */
  quote: PublicRentalQuote | null;
};

export function RentalConfirmDialog({
  open,
  onClose,
  summary,
  email,
  initial,
  busy,
  error,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  summary: RentalRequestSummary;
  /** The account's email — shown, not edited (it is the login). */
  email: string;
  /** What is on file. Seeds the fields each time the dialog opens, and
   *  fills any still-blank field if it arrives after (the profile read
   *  is async) — never over something being typed. */
  initial: RenterDetails;
  /** A send is in flight: fields and buttons lock, Escape does nothing. */
  busy: boolean;
  /** A refusal from the send itself (the API, the network), shown above
   *  the button so the renter can fix and resend without losing the
   *  dialog. Field problems are found here and shown at the field. */
  error: string | null;
  onSend: (details: RenterDetails) => void;
}) {
  const titleId = useId();
  const fieldId = useId();
  const [details, setDetails] = useState<RenterDetails>(initial);
  const [problem, setProblem] = useState<RenterDetailsProblem | null>(null);

  // Reset to what is on file on each OPEN — a member who edited their
  // name here, pressed Back, then reopened sees the saved value, not the
  // abandoned edit. Read through a ref so a parent re-render with a new
  // `initial` object does not wipe typing mid-dialog.
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDetails(initialRef.current);
      setProblem(null);
    }
    wasOpen.current = open;
  }, [open]);

  // The profile can finish loading after the dialog opened. Fill blanks
  // only.
  useEffect(() => {
    if (!open) return;
    setDetails((cur) => ({
      fullName: cur.fullName || initial.fullName,
      phone: cur.phone || initial.phone,
      dateOfBirth: cur.dateOfBirth || initial.dateOfBirth,
    }));
  }, [open, initial.fullName, initial.phone, initial.dateOfBirth]);

  function set(field: RenterDetailsField, value: string) {
    setDetails((cur) => ({ ...cur, [field]: value }));
    if (problem?.field === field) setProblem(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const p = validateRenterDetails(details, summary.startDate);
    setProblem(p);
    if (p) {
      document.getElementById(`${fieldId}-${p.field}`)?.focus();
      return;
    }
    onSend({
      fullName: details.fullName.trim(),
      phone: details.phone.trim(),
      dateOfBirth: details.dateOfBirth,
    });
  }

  const { quote } = summary;
  // The first blank field takes focus on open; when nothing is blank,
  // the primary button does — a returning member confirms in one press.
  const firstBlank: RenterDetailsField | null = !initial.fullName
    ? "fullName"
    : !initial.phone
      ? "phone"
      : !initial.dateOfBirth
        ? "dateOfBirth"
        : null;

  function field(
    name: RenterDetailsField,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    hint?: string,
  ) {
    const id = `${fieldId}-${name}`;
    const bad = problem?.field === name;
    return (
      <div>
        <label htmlFor={id} className={LABEL}>
          {label}
        </label>
        <input
          id={id}
          value={details[name]}
          onChange={(e) => set(name, e.target.value)}
          disabled={busy}
          aria-invalid={bad || undefined}
          aria-describedby={
            bad ? `${id}-problem` : hint ? `${id}-hint` : undefined
          }
          data-autofocus={firstBlank === name ? "" : undefined}
          className={INPUT}
          {...props}
        />
        {bad ? (
          <p id={`${id}-problem`} role="alert" className="mt-1.5 text-xs text-red">
            {problem.message}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="mt-1.5 text-[11px] text-mute">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} dismissable={!busy}>
      <form onSubmit={submit} noValidate>
        <h2 id={titleId} className="font-display text-2xl leading-tight text-ink">
          Confirm your request
        </h2>

        {/* What is about to be asked for. The total is the server's
            quote, shown verbatim — nothing here multiplies a rate. */}
        <div className="mt-4 rounded-xl border border-rule bg-cream-2/40 p-4">
          <p className="font-medium text-ink">{summary.vehicleName}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {formatBookingDay(summary.startDate)} –{" "}
            {formatBookingDay(summary.endDate)} · {summary.market}
          </p>
          {quote ? (
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-rule pt-3">
              <span className="text-xs tabular-nums text-ink-soft">
                {formatBookingCents(quote.dailyRateCents)} × {quote.nights} night
                {quote.nights === 1 ? "" : "s"}
              </span>
              <span className="font-display text-2xl tabular-nums text-ink">
                {formatBookingCents(quote.renterTotalCents)}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-mute">
              The operator confirms the dates and the final price with you.
            </p>
          )}
        </div>

        <p className="mt-5 text-xs uppercase tracking-[0.16em] text-mute">
          Your details
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          These go to the operator with your request. Any change is saved to
          your profile.
        </p>

        <div className="mt-3 space-y-3">
          {field("fullName", "Full name", {
            type: "text",
            autoComplete: "name",
            placeholder: "As it appears on your ID",
          })}

          <div>
            <span className={LABEL}>Email</span>
            <p className="mt-2 flex h-11 items-center rounded-xl border border-rule bg-cream-2/40 px-4 text-sm text-ink-soft">
              {email || "—"}
            </p>
            <p className="mt-1.5 text-[11px] text-mute">
              From your account — where the operator&apos;s reply lands.
            </p>
          </div>

          {field("phone", "Phone", {
            type: "tel",
            autoComplete: "tel",
            placeholder: "+1 305 555 0145",
          })}

          {field(
            "dateOfBirth",
            "Date of birth",
            { type: "date", autoComplete: "bday" },
            `Renters must be ${RENTAL_MIN_AGE_YEARS} or over on the pickup date.`,
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red"
          >
            {error}
          </p>
        )}

        <div className="mt-5 grid gap-2">
          <button
            type="submit"
            disabled={busy}
            data-autofocus={firstBlank === null ? "" : undefined}
            className={PRIMARY_BTN}
          >
            {busy ? "Sending request…" : "Send request"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={SECONDARY_BTN}
          >
            Back
          </button>
        </div>

        {/* GUARDRAIL 3.9: state what the send does. A booking request
            creates a rental_bookings row and touches Stripe nowhere; an
            inquiry writes a lead. Neither collects a card. */}
        <p className="mt-3 text-center text-[11px] leading-relaxed text-mute">
          No card, no charge — RYDA collects nothing on a request, and{" "}
          {quote
            ? "these dates aren't held until the operator confirms."
            : "the operator confirms the dates and the final price with you."}{" "}
          By sending you agree to RYDA&apos;s{" "}
          <Link
            href="/legal/privacy"
            className={`rounded-sm underline hover:text-ink ${FOCUS_RING}`}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </Dialog>
  );
}
