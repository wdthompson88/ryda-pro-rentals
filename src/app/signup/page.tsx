"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/safe-next";

// /signup, front-end account creation for both account types:
//   - Member (default): drives to the guided onboarding (KYC,
//     preferences, age verification) once an account is created.
//   - Fleet partner (?as=partner, linked from /partners): collects
//     company details and drives to the /partner dashboard, where the
//     application shows as pending until an admin approves it.
// Preserves `?next=` so post-onboarding the member is returned to the
// gated action they tried to take (e.g. claim a share, request a
// rental). Real auth ships at Miami launch.

export default function SignUpPage() {
  // The form lives inside a Suspense boundary because it depends on
  // useSearchParams (Next 16 forces this). That means the SSR HTML
  // renders the fallback, so any <h1> inside SignUpPageInner is
  // invisible to crawlers + screen readers until hydration.
  //
  // The hidden H1 lives in the Suspense FALLBACK rather than as a
  // sibling outside it (per codex re-review of the cleanup batch):
  //   - SSR + non-JS clients get the H1 from the fallback
  //   - After hydration, the fallback is replaced by SignUpPageInner
  //     which renders its own visible H1 (line 168 / 210). One H1
  //     visible at any moment, never two.
  return (
    <Suspense fallback={<h1 className="sr-only">Apply for RYDA membership</h1>}>
      <SignUpPageInner />
    </Suspense>
  );
}

function SignUpPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get("reason"); // "rent" | "buy" | "checkout"

  // /signup?as=partner preselects the Fleet Partner path (the CTA on
  // /partners deep-links here). The toggle in the form switches freely.
  const [accountType, setAccountType] = useState<"member" | "partner">(
    searchParams.get("as") === "partner" ? "partner" : "member",
  );

  // Sanitize `?next=` against open-redirect / javascript: scheme tricks.
  // Anything not a same-origin path falls back to the type's home:
  // members continue to onboarding, partners land on their dashboard
  // (which tracks the pending application) after the email round-trip.
  const next = safeNext(
    searchParams.get("next"),
    accountType === "partner" ? "/partner" : "/onboarding",
  );

  // If a signed-in member lands on /signup (clicked an old marketing
  // link, etc.), bounce them to the gated destination — they don't
  // need to create another account.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) router.replace(next);
    });
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Partner-only fields.
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [agedConfirmed, setAgedConfirmed] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reasonCopy =
    accountType === "partner"
      ? "Partner with RYDA."
      : reason === "rent"
        ? "One quick step before you book."
        : reason === "buy"
          ? "One quick step before you claim your share."
          : reason === "checkout"
            ? "One quick step before you reserve."
            : "Start your application.";

  const reasonSub =
    accountType === "partner"
      ? "Tell us about your company and fleet. We respond to every partner application personally within 3 business days — your dashboard tracks the review."
      : reason === "rent" || reason === "buy" || reason === "checkout"
        ? "Browsing is open to everyone, we just need an account before you can transact. 60 seconds."
        : "We review every applicant before Miami launch. The full onboarding takes ~8 minutes (identity check + preferences) and you can save and return.";

  // Composed display/legal name for surfaces that want one string
  // (waitlist, emails, the partner contact). The split parts are what
  // downstream identity flows use — KYC verified outputs and the
  // onboarding form are already first/last shaped.
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  // Partners attest company details instead of the 28+ driver check
  // (they operate the cars, members drive them).
  const ready =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    email.includes("@") &&
    password.length >= 8 &&
    tosAccepted &&
    (accountType === "partner" ? company.trim().length >= 2 : agedConfirmed);

  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);

    // Always persist to the waitlist regardless of auth path, it's
    // the lead-attribution surface (market, source) and works even if
    // auth isn't configured yet.
    void fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: fullName,
        market: "Miami",
        source:
          accountType === "partner"
            ? "signup:partner"
            : reason
              ? `signup:${reason}`
              : "signup",
      }),
    }).catch(() => {
      /* Soft-fail, don't block the user. */
    });

    try {
      // Real account creation when Supabase is configured. Magic-link
      // flow: signUp creates the user; user gets a confirmation email;
      // clicking the link returns them to /auth/callback?next=...
      if (supabase) {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            // Persist self-attested age confirmation + marketing opt-in
            // to user_metadata. NOTE: user_metadata is user-editable, so
            // this is an audit-trail signature, NOT a security primitive.
            // Real age/identity verification happens in /onboarding KYC,
            // which writes to a server-owned `members` table that the
            // rental API checks before any booking can be created.
            //
            // Partner signup follows the same trust model: the
            // partner_* keys are a REQUEST that /api/partner/me turns
            // into a partner_accounts row with status 'pending' on
            // first authenticated visit. Only the admin-gated
            // /api/admin/partners route can approve.
            data: {
              // Split parts are canonical (matches KYC verified-output
              // and onboarding field shape); `name` stays as the
              // composed string so existing consumers keep working.
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              name: fullName,
              marketing_opt_in: marketingOptIn,
              ...(accountType === "partner"
                ? {
                    account_type: "partner",
                    partner_intent: true,
                    partner_company: company.trim(),
                    partner_phone: phone.trim() || null,
                  }
                : {
                    aged_confirmed: true,
                    aged_confirmed_at: new Date().toISOString(),
                  }),
            },
          },
        });
        if (err) throw err;
        setSubmitted(true);
      } else {
        // Supabase not configured, simulate. Replace with real auth on
        // launch by setting NEXT_PUBLIC_SUPABASE_URL + ANON_KEY.
        await new Promise((r) => setTimeout(r, 600));
        setSubmitted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <>
        <SiteHeader />
        <section className="flex min-h-[80vh] items-center justify-center px-6 py-20">
          <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-8 sm:p-10 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream-2 text-2xl text-ink">
              ✓
            </div>
            <h1 className="mt-5 font-display text-3xl text-ink">
              {accountType === "partner"
                ? "Application received."
                : "Account created."}
            </h1>
            <p className="mt-3 text-sm text-ink-soft">
              We've emailed{" "}
              <span className="font-medium text-ink">{email}</span> to confirm
              your account.{" "}
              {accountType === "partner"
                ? "Once you're in, your partner dashboard tracks the fleet review — we respond to every application within 3 business days."
                : "Continue to onboarding to verify your identity and complete your member profile, or pick up where you left off."}
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href={next}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
              >
                {accountType === "partner"
                  ? "Go to your partner dashboard →"
                  : next === "/onboarding"
                    ? "Continue to onboarding →"
                    : "Continue where I left off →"}
              </Link>
              {accountType !== "partner" && next !== "/onboarding" && (
                <Link
                  href="/onboarding"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
                >
                  Complete onboarding first
                </Link>
              )}
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <section className="flex min-h-[80vh] items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-8 sm:p-10 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Create account
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">{reasonCopy}</h1>
          <p className="mt-2 text-sm text-ink-soft">{reasonSub}</p>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            {/* Account type. Member is the default; the /partners
                marketing page deep-links here with ?as=partner. */}
            <div
              role="radiogroup"
              aria-label="Account type"
              className="grid grid-cols-2 gap-1.5 rounded-xl border border-rule bg-cream-2/40 p-1.5"
            >
              <TypeOption
                label="Member"
                hint="Rent + co-own"
                active={accountType === "member"}
                onSelect={() => setAccountType("member")}
              />
              <TypeOption
                label="Fleet partner"
                hint="List your cars"
                active={accountType === "partner"}
                onSelect={() => setAccountType("partner")}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                id="signup-first-name"
                type="text"
                placeholder="Jane"
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
                required
              />
              <Field
                label="Last name"
                id="signup-last-name"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
                required
              />
            </div>
            {accountType === "partner" && (
              <>
                <Field
                  label="Company"
                  id="signup-company"
                  type="text"
                  placeholder="Your rental company"
                  value={company}
                  onChange={setCompany}
                  autoComplete="organization"
                  required
                />
                <Field
                  label="Phone (optional)"
                  id="signup-phone"
                  type="tel"
                  placeholder="+1 (305) 555-0100"
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                />
              </>
            )}
            <Field
              label="Email"
              id="signup-email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              id="signup-password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              hint="8+ characters. We recommend a passphrase."
            />

            {/* Age verification, required for both renters (driver age 28+
                everywhere, partner-imposed) and co-owners (LLC member
                eligibility). Surface here so it's not a surprise later.
                Fleet partners operate cars rather than drive ours, so
                they skip this attestation. */}
            {accountType !== "partner" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-cream-2/40 p-3 text-xs">
                <input
                  type="checkbox"
                  checked={agedConfirmed}
                  onChange={(e) => setAgedConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-red"
                />
                <span className="text-ink-soft">
                  I confirm I'm{" "}
                  <strong className="text-ink">28 or older</strong>, required
                  to drive any vehicle in the RYDA fleet.
                </span>
              </label>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-cream-2/40 p-3 text-xs">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red"
              />
              <span className="text-ink-soft">
                I agree to RYDA's{" "}
                <Link
                  href="/legal/terms"
                  className="underline hover:text-ink"
                  target="_blank"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/privacy"
                  className="underline hover:text-ink"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 px-1 text-xs">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red"
              />
              <span className="text-mute">
                Send me launch updates and new vehicle drops. Unsubscribe any
                time.
              </span>
            </label>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!ready || submitting}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Creating account…"
                : accountType === "partner"
                  ? "Apply to partner →"
                  : "Create account →"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-mute">
            {accountType === "partner"
              ? "No commitment — applying starts a conversation about whether RYDA is the right channel for your fleet."
              : "Browsing the fleet doesn't require an account, we ask only when you're ready to rent or claim a share."}
          </p>

          <div className="mt-10 border-t border-rule pt-6 text-center text-sm text-ink-soft">
            Already a member?{" "}
            <Link
              href={`/signin${next !== "/onboarding" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-medium text-red hover:text-red-deep"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Segmented account-type option. Active option reads as a raised card
// on the cream-2 track; inactive stays quiet.
function TypeOption({
  label,
  hint,
  active,
  onSelect,
}: {
  label: string;
  hint: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`flex flex-col items-start rounded-lg px-3.5 py-2.5 text-left transition-colors ${
        active
          ? "border border-rule bg-surface shadow-sm"
          : "border border-transparent hover:bg-cream-2/60"
      }`}
    >
      <span
        className={`text-sm font-medium ${active ? "text-ink" : "text-ink-soft"}`}
      >
        {label}
      </span>
      <span className="mt-0.5 text-[11px] text-mute">{hint}</span>
    </button>
  );
}

function Field({
  label,
  id,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
  hint,
}: {
  label: string;
  id: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-wider text-mute"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-required={required}
        className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      />
      {hint ? <p className="mt-1.5 text-[11px] text-mute">{hint}</p> : null}
    </div>
  );
}
