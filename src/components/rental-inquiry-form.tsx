"use client";

// Rental inquiry form — the conversion surface of the rentals-first
// funnel. Lives in the /rent/[symbol] booking column and posts to
// POST /api/rental-inquiry (structured lead → RYDA's inbox → forwarded
// by hand to the Miami operator, who closes the rental on their own
// contract/insurance). Not "routed to a vetted operator": nothing
// routes and nothing vets beyond Stripe Connect onboarding.
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

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import { useAuthStatus } from "@/lib/use-auth-status";
import { useRentalProfile } from "@/lib/use-rental-profile";

type Status = "idle" | "submitting" | "success" | "error";

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
}: {
  vehicleSlug: string;
  vehicleName: string;
  market: string;
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
  // Marketing consent is no longer asked for on this form (the
  // pre-ticked "Miami drops and member offers" box is deleted — see the
  // note where it used to render). The value is still submitted because
  // the API upserts rental_profiles from it: false for anyone not
  // signed in, and for a signed-in member whatever they already chose
  // on /account/profile, so sending a request neither enrolls them nor
  // silently opts them out.
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // `min` attrs + default dates are set post-mount (not at render) so
  // the statically-prerendered page never hydrates against a stale
  // build-time date. Same pattern as contact-form's URL-param read.
  const [todayStr, setTodayStr] = useState("");

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

  // Carry a signed-in member's STORED marketing consent through the
  // submit unchanged. Same precedence as /account/profile:
  // rental_profiles boolean overrides user_metadata. Without this the
  // API's upsert would write false over a preference the member set
  // elsewhere.
  useEffect(() => {
    if (authStatus !== "authed") return;
    let stored = user?.user_metadata?.marketing_opt_in !== false;
    if (typeof profile?.marketingOptIn === "boolean") {
      stored = profile.marketingOptIn;
    }
    setMarketingOptIn(stored);
  }, [authStatus, user, profile]);

  const showAccountFields = authStatus !== "authed";

  function validate(): string | null {
    if (!startDate || !endDate) return "Pick your dates first.";
    // ISO date strings compare correctly as strings.
    if (todayStr && startDate < todayStr)
      return "Start date can't be in the past.";
    if (endDate < startDate) return "Return date must be on or after the start.";
    // UTC-anchored, matching the server's validateRentalInquiry math.
    // Local-time parsing would count a DST fall-back hour into the
    // span and wrongly reject an exactly-30-day rental.
    const span =
      (Date.parse(`${endDate}T00:00:00Z`) -
        Date.parse(`${startDate}T00:00:00Z`)) /
      86_400_000;
    // "— we'll arrange it" deleted: RYDA arranges no rental. The lead
    // goes to the operator and the operator decides.
    if (span > 30) return "For rentals over 30 days, contact us directly.";
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
        {/* "A vetted Miami operator will reply shortly." is deleted.
            Three things wrong with one sentence: nothing in this
            codebase measures a reply time, so "shortly" is a promise
            with no mechanism behind it; the lead does not reach the
            operator on submit (PARTNER_INQUIRY_EMAILS is empty, so it
            lands in RYDA's inbox and a person forwards it); and
            "vetted" describes Stripe Connect onboarding of a business
            and a bank account, not a check on the car or the operator.
            The state now says what was sent and nothing about what
            happens next. */}
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          The <span className="font-medium text-ink">{vehicleName}</span>,{" "}
          {prettyDate(startDate)} – {prettyDate(endDate)} in {market}.
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
      {/* Dates */}
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

      {/* A marketing-consent checkbox stood here reading "Send me Miami
          drops and member offers", pre-ticked. Deleted rather than
          relabelled: there is no drops programme and no membership, so
          the box described a product that does not exist, and a
          pre-ticked consent for it is the one thing that must not ship.
          RYDA sends no marketing email today. The submitted value is
          now a signed-in member's stored preference (set on
          /account/profile) and false for everyone else, so requesting a
          car enrolls nobody. */}

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
