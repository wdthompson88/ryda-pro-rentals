"use client";

// The two doors between "Request these dates" and a request actually
// leaving the browser. Founder decision (2026-08-26), modelled on
// Zocdoc's review step: pick dates → sign in → confirm who you are →
// send. Nothing in this file talks to an API; it collects, validates
// and hands back, and RentalInquiryForm does the sending.
//
//   RentalSignInDialog   no session. Sign in or create an account
//                        RIGHT HERE — password, the configured OAuth
//                        providers, a magic link — and the popup then
//                        becomes the confirm step. Anything that must
//                        leave the page (an OAuth redirect, an email
//                        link, the MFA challenge) carries the car AND
//                        the chosen dates in `next`, so the visitor
//                        lands back with them still selected. "Not now"
//                        simply closes it — the dates stay on the page.
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
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog } from "@/components/dialog";
import { OAuthButtons } from "@/components/oauth-buttons";
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

// ── Sign in first — without leaving the car ──────────────────────────
//
// The whole of /signin's mechanics, in the popup: email + password,
// the configured OAuth providers, a magic link for the forgotten
// password, and the TOTP step-up when an account has it. Plus /signup's
// create-account path. The one thing that cannot stay in the popup is a
// round trip the browser must make — an OAuth redirect, an email link —
// and each of those lands on /auth/callback?next=<this car + dates>,
// so the visitor comes back to the dates they picked and the confirm
// step reopens by itself (RentalInquiryForm's returnedWithDates).
//
// This component never closes itself on success. A password sign-in
// flips the session, useAuthStatus hears it through onAuthStateChange,
// and the form swaps this dialog for RentalConfirmDialog — the click's
// intent was to request, and that is what it goes on to do.

type SignInMode = "signin" | "signup";

/** Supabase's sentences are for developers. These are for the renter. */
function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/invalid login credentials/i.test(msg)) {
    return "That email and password don't match.";
  }
  if (/email not confirmed/i.test(msg)) {
    return "Confirm your email first — the link is in your inbox.";
  }
  if (/rate limit|too many/i.test(msg)) {
    return "Too many attempts. Try again in a minute.";
  }
  return msg || "Something went wrong. Try again.";
}

export function RentalSignInDialog({
  open,
  onClose,
  returnTo,
}: {
  open: boolean;
  onClose: () => void;
  /** Same-origin path a round trip (OAuth, an email link, the MFA
   *  challenge) comes back to — the car, with the dates in the query
   *  so they survive it (safeNext allows `?`). */
  returnTo: string;
}) {
  const titleId = useId();
  const fieldId = useId();
  const router = useRouter();
  const [mode, setMode] = useState<SignInMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** An email is on its way; the popup now says so instead of asking
   *  for a password. `confirm` after signUp, `magic` after a link. */
  const [sent, setSent] = useState<null | "confirm" | "magic">(null);

  // Fresh on each open. The email survives a Back-and-reopen — it is
  // the one thing worth not retyping — the rest does not.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setMode("signin");
      setPassword("");
      setError(null);
      setSent(null);
      setBusy(false);
    }
    wasOpen.current = open;
  }, [open]);

  function callbackUrl(): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/auth/callback?next=${encodeURIComponent(returnTo)}`;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!email.includes("@")) {
      setError("Enter your email.");
      return;
    }
    if (mode === "signup" ? password.length < 8 : password.length < 1) {
      setError(
        mode === "signup"
          ? "A password of at least 8 characters."
          : "Enter your password.",
      );
      return;
    }
    if (!supabase) {
      setError("Sign-in isn't available right now. Try again shortly.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        // MFA step-up, exactly as /signin does it: a password sign-in
        // lands at aal1, and an account with an enrolled TOTP factor
        // must pass the challenge before it counts. That page cannot
        // live in a popup, so it gets `next` and brings the renter back.
        const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (
          aal.data?.nextLevel === "aal2" &&
          aal.data.currentLevel !== "aal2"
        ) {
          router.push(
            `/auth/mfa-challenge?next=${encodeURIComponent(returnTo)}`,
          );
          return;
        }
        // Signed in. Nothing more to do here — see the header.
        return;
      }

      // Create an account. Same call and the same metadata /signup
      // makes (an explicit marketing_opt_in: false — the toggle lives
      // on /account/profile). Email confirmation, when the project has
      // it on, returns no session, so the popup turns into "check your
      // email" and the link brings them back here.
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl(),
          data: { marketing_opt_in: false },
        },
      });
      if (err) throw err;
      if (data.session) return; // confirmation off: already signed in
      if (
        // Enumeration protection: an existing email "succeeds" with a
        // user that has no identities. Say so, and offer the other door.
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        setMode("signin");
        setError("You already have a RYDA account with this email — sign in instead.");
        return;
      }
      setSent("confirm");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  // The forgotten-password door, as on /signin: a link to whatever
  // email is typed above. No password involved.
  async function magicLink() {
    if (busy) return;
    if (!email.includes("@")) {
      setError("Enter your email above first.");
      return;
    }
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (err) throw err;
      setSent("magic");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const emailId = `${fieldId}-email`;
  const passwordId = `${fieldId}-password`;

  if (sent) {
    return (
      <Dialog open={open} onClose={onClose} labelledBy={titleId}>
        <h2 id={titleId} className="font-display text-2xl leading-tight text-ink">
          Check your email
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          We sent {sent === "confirm" ? "a confirmation" : "a sign-in"} link to{" "}
          <span className="font-medium text-ink">{email}</span>. Open it and
          you&apos;ll land back on this car with your dates still selected.
        </p>
        <div className="mt-6 grid gap-2">
          <button type="button" onClick={onClose} data-autofocus="" className={SECONDARY_BTN}>
            Back to the car
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} dismissable={!busy}>
      <form onSubmit={submit} noValidate>
        <h2 id={titleId} className="font-display text-2xl leading-tight text-ink">
          {mode === "signin"
            ? "Sign in to request these dates"
            : "Create an account to request these dates"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Your request goes to the operator with your name and phone number,
          so it needs an account behind it. Your dates stay right here.
        </p>

        {/* Two doors, one control. Buttons rather than links: neither
            navigates, and the choice must survive a failed attempt. */}
        <div
          role="group"
          aria-label="Sign in or create an account"
          className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-rule bg-cream-2/40 p-1"
        >
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              disabled={busy}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`h-9 rounded-full text-sm font-medium transition-colors ${FOCUS_RING} ${
                mode === m
                  ? "bg-ink text-cream"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <OAuthButtons
            next={returnTo}
            verb={mode === "signin" ? "Continue" : "Sign up"}
          />
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor={emailId} className={LABEL}>
              Email
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              data-autofocus=""
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor={passwordId} className={LABEL}>
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signin" ? "Your password" : "At least 8 characters"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className={INPUT}
            />
          </div>
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
          <button type="submit" disabled={busy} className={PRIMARY_BTN}>
            {busy
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => void magicLink()}
              disabled={busy}
              className={`rounded-sm py-2 text-center text-xs font-medium text-ink-soft hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}
            >
              Forgot your password? Email me a sign-in link
            </button>
          ) : (
            <p className="py-2 text-center text-[11px] leading-relaxed text-mute">
              Free to join. We&apos;ll email you a confirmation link that brings
              you straight back here.
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`rounded-sm py-2 text-center text-xs font-medium text-ink-soft hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}
          >
            Not now
          </button>
        </div>
      </form>
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
