"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";

// /signup — front-end member account creation. Drives the user to the
// guided onboarding (KYC, preferences, age verification) once an account
// is created. Preserves `?next=` so post-onboarding the member is
// returned to the gated action they tried to take (e.g. claim a share,
// request a rental). Real auth ships at Miami launch.

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpPageInner />
    </Suspense>
  );
}

function SignUpPageInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/onboarding";
  const reason = searchParams.get("reason"); // "rent" | "buy" | "checkout"

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agedConfirmed, setAgedConfirmed] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reasonCopy =
    reason === "rent"
      ? "One quick step before you book."
      : reason === "buy"
        ? "One quick step before you claim your share."
        : reason === "checkout"
          ? "One quick step before you reserve."
          : "Start your application.";

  const reasonSub =
    reason === "rent" || reason === "buy" || reason === "checkout"
      ? "Browsing is open to everyone — we just need an account before you can transact. 60 seconds."
      : "We review every applicant before Miami launch. The full onboarding takes ~8 minutes (identity check + preferences) and you can save and return.";

  const ready =
    name.trim().length >= 2 &&
    email.includes("@") &&
    password.length >= 8 &&
    agedConfirmed &&
    tosAccepted;

  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);

    // Always persist to the waitlist regardless of auth path — it's
    // the lead-attribution surface (market, source) and works even if
    // auth isn't configured yet.
    void fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name,
        market: "Miami",
        source: reason ? `signup:${reason}` : "signup",
      }),
    }).catch(() => {
      /* Soft-fail — don't block the user. */
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
            data: { name, marketing_opt_in: marketingOptIn },
          },
        });
        if (err) throw err;
        setSubmitted(true);
      } else {
        // Supabase not configured — simulate. Replace with real auth on
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
              complete your member profile — or pick up where you left off.
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
            Create account
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">{reasonCopy}</h1>
          <p className="mt-2 text-sm text-ink-soft">{reasonSub}</p>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            <Field
              label="Full name"
              id="signup-name"
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={setName}
              autoComplete="name"
              required
            />
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

            {/* Age verification — required for both renters (driver age 28+
                everywhere, partner-imposed) and co-owners (LLC member
                eligibility). Surface here so it's not a surprise later. */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-cream-2/40 p-3 text-xs">
              <input
                type="checkbox"
                checked={agedConfirmed}
                onChange={(e) => setAgedConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red"
              />
              <span className="text-ink-soft">
                I confirm I'm <strong className="text-ink">28 or older</strong>{" "}
                — required to drive any vehicle in the RYDA fleet.
              </span>
            </label>

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
              {submitting ? "Creating account…" : "Create account →"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-mute">
            Browsing the fleet doesn't require an account — we ask only when
            you're ready to rent or claim a share.
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
