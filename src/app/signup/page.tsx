"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/safe-next";

// /signup, traditional account creation (modeled on the mainstable
// signup: minimal fields, neutral copy, passive consent line — NOT an
// application funnel). Name + email + password; identity, age (28+),
// and preferences live in the guided onboarding AFTER the account
// exists. Preserves `?next=` so post-onboarding the member is returned
// to the gated action they tried to take (e.g. claim a share, request
// a rental). Real auth ships at Miami launch.

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
    <Suspense fallback={<h1 className="sr-only">Create your RYDA account</h1>}>
      <SignUpPageInner />
    </Suspense>
  );
}

function SignUpPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Sanitize `?next=` against open-redirect / javascript: scheme tricks.
  // Anything not a same-origin path falls back to /onboarding.
  const next = safeNext(searchParams.get("next"), "/onboarding");
  const reason = searchParams.get("reason"); // "rent" | "buy" | "checkout"

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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reasonCopy =
    reason === "rent"
      ? "One quick step before you book."
      : reason === "buy"
        ? "One quick step before you claim your share."
        : reason === "checkout"
          ? "One quick step before you reserve."
          : "Create your account.";

  const reasonSub =
    reason === "rent" || reason === "buy" || reason === "checkout"
      ? "Browsing is open to everyone, we just need an account before you can transact. 60 seconds."
      : "Free to join. An account unlocks rentals, bookings, and co-ownership — browsing stays open to everyone.";

  // Composed display/legal name for surfaces that want one string
  // (waitlist, emails). The split parts are what downstream identity
  // flows use — KYC verified outputs and the onboarding form are
  // already first/last shaped.
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  // Traditional setup: no attestation checkboxes here. Identity, age
  // (28+), and preferences all live in onboarding/booking; ToS/privacy
  // consent is the passive line under the submit button.
  const ready =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    email.includes("@") &&
    password.length >= 8;

  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);

    // Always persist to the waitlist regardless of auth path, it's
    // the lead-attribution surface (market, source) and works even if
    // auth isn't configured yet. Attribution ONLY — this is not
    // marketing consent (there is no opt-in at signup), so any send
    // pipeline must check marketing_opt_in, not this table.
    void fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: fullName,
        market: "Miami",
        source: reason ? `signup:${reason}` : "signup",
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
            // NOTE: user_metadata is user-editable, so nothing here is
            // a security primitive. Age/identity verification happens
            // in /onboarding KYC, which writes to a server-owned
            // `members` table that the rental API checks before any
            // booking can be created.
            data: {
              // Split parts are canonical (matches KYC verified-output
              // and onboarding field shape); `name` stays as the
              // composed string so existing consumers keep working.
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              name: fullName,
              // No marketing opt-in exists at signup (traditional
              // setup). Explicit false matters on this branch: the
              // account profile and rental-inquiry form treat an
              // ABSENT flag as opted-in (`!== false`), so omitting it
              // would silently auto-enroll every new account. Users
              // opt in from /account/profile or the inquiry form.
              marketing_opt_in: false,
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
              Account created.
            </h1>
            <p className="mt-3 text-sm text-ink-soft">
              We've emailed{" "}
              <span className="font-medium text-ink">{email}</span> to confirm
              your account. Continue to onboarding to verify your identity and
              complete your member profile, or pick up where you left off.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href={next}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
              >
                {next === "/onboarding"
                  ? "Continue to onboarding →"
                  : "Continue where I left off →"}
              </Link>
              {next !== "/onboarding" && (
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
            Sign up
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">{reasonCopy}</h1>
          <p className="mt-2 text-sm text-ink-soft">{reasonSub}</p>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
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
              {submitting ? "Creating account…" : "Create account →"}
            </button>

            {/* Passive consent, the traditional pattern — no checkbox
                gauntlet before a person can hold an account. */}
            <p className="text-center text-xs text-mute">
              By creating an account you agree to RYDA's{" "}
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
            </p>
          </form>

          <p className="mt-5 text-center text-xs text-mute">
            RYDA membership is 28+ — identity and eligibility are verified
            during onboarding, not here.
          </p>

          <div className="mt-10 border-t border-rule pt-6 text-center text-sm text-ink-soft">
            Already have an account?{" "}
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
