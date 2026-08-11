"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StepProgress } from "@/components/step-progress";
import { authedFetch } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase";

// Basic → Phone → Personal → Identity → Done. The wizard used to carry
// two more steps between Identity and Done — "Financial" (interest +
// co-ownership disclaimer acknowledgment) and "Tier" (Core/Blue/Black
// share-buy-in credits) — both of which described the retired
// co-ownership product and were removed in the rentals-first strip.
// The Identity step stays: it is the Stripe Identity entry point and is
// wanted for renter verification.
const STEPS = ["Basic", "Phone", "Personal", "Identity", "Done"];
const IDENTITY_STEP = STEPS.indexOf("Identity");

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  // True once Stripe has bounced the user back here from the hosted
  // Identity flow. Threaded into the Identity step because the webhook
  // that flips the row to 'verified' is out-of-band — see below.
  const [kycReturned, setKycReturned] = useState(false);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Stripe Identity returns to `/onboarding?kyc=ok` (the return_url is
  // built in api/kyc/start). The wizard's position is component state,
  // so without this the user would land back on step 1 having just
  // completed step 4. Read from window rather than useSearchParams to
  // avoid forcing a Suspense boundary on an already-client page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("kyc") !== "ok") return;
    setKycReturned(true);
    setStep(IDENTITY_STEP);
  }, []);

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Member onboarding
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
          {STEPS[step] === "Done"
            ? "You're all set."
            : "Let's get you set up."}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Step {step + 1} of {STEPS.length} · Most members complete this in
          under 8 minutes.
        </p>

        <div className="mt-12 rounded-2xl border border-rule bg-surface p-8 sm:p-10">
          <StepProgress steps={STEPS} current={step} />

          {step === 0 && <Basic onNext={next} />}
          {step === 1 && <Phone onNext={next} onBack={back} />}
          {step === 2 && <Personal onNext={next} onBack={back} />}
          {step === 3 && (
            <Identity onNext={next} onBack={back} returned={kycReturned} />
          )}
          {step === 4 && <Done />}
        </div>

        <p className="mt-6 text-center text-xs text-mute">
          Your progress saves automatically. You can pick up where you left off.
        </p>
      </section>
    </>
  );
}

// ── Step components ─────────────────────────────────────────────

// Basic — the ONE place name + phone are ever typed. Email autofills
// from the auth session (typed once at signup, or supplied by the
// OAuth provider) and is read-only when known. Name prefills from
// whatever the sign-in method already told us: social providers put
// name/full_name in user_metadata, so a Google/Facebook/Microsoft
// signup usually just confirms and continues. On continue, the values
// persist to user_metadata so no later step ever re-asks.
function Basic({ onNext }: { onNext: () => void }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // True once the session supplied the email — the field locks then,
  // it's an account fact, not a preference. Without a session (or
  // without Supabase configured) the field stays editable so the demo
  // flow still works.
  const [emailLocked, setEmailLocked] = useState(false);
  // "unknown" until getUser resolves. Continue is gated on it so an
  // early click can't persist empty strings over provider-supplied
  // metadata (the prefill race), and copy/persistence can be honest
  // about whether a session exists at all.
  const [session, setSession] = useState<"unknown" | "authed" | "anon">(
    supabase ? "unknown" : "anon",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.user) {
          setSession("anon");
          return;
        }
        setSession("authed");
        if (data.user.email) {
          setEmail(data.user.email);
          setEmailLocked(true);
        }
        const meta = (data.user.user_metadata ?? {}) as Record<
          string,
          unknown
        >;
        let metaFirst =
          typeof meta.first_name === "string" ? meta.first_name : "";
        let metaLast =
          typeof meta.last_name === "string" ? meta.last_name : "";
        if (!metaFirst && !metaLast) {
          // OAuth providers send a single display name — split it once
          // here so the user can correct rather than re-type.
          const full =
            typeof meta.full_name === "string"
              ? meta.full_name
              : typeof meta.name === "string"
                ? meta.name
                : "";
          const parts = full.trim().split(/\s+/).filter(Boolean);
          metaFirst = parts[0] ?? "";
          metaLast = parts.slice(1).join(" ");
        }
        // Functional merges: the prefill must never clobber anything
        // the user already typed while getUser was in flight.
        if (metaFirst) setFirst((prev) => prev || metaFirst);
        if (metaLast) setLast((prev) => prev || metaLast);
        const metaPhone = typeof meta.phone === "string" ? meta.phone : "";
        if (metaPhone) setPhone((prev) => prev || metaPhone);
      })
      .catch(() => {
        if (!cancelled) setSession("anon");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Basic is the sole place name + phone are collected, so blank is
  // not an option here — this is the validation /signup used to do.
  const complete =
    first.trim().length > 0 &&
    last.trim().length > 0 &&
    phone.trim().length > 0;

  async function saveAndContinue() {
    if (saving) return;
    if (supabase && session === "authed") {
      setSaving(true);
      // Persist only real values — never write an empty string or
      // null over metadata (GoTrue shallow-merges, so a blank write
      // would erase a provider-supplied name/phone).
      const f = first.trim();
      const l = last.trim();
      const p = phone.trim();
      const data: Record<string, unknown> = {};
      if (f) data.first_name = f;
      if (l) data.last_name = l;
      if (f || l) data.name = `${f} ${l}`.trim();
      if (p) data.phone = p;
      try {
        // supabase-js RESOLVES with { error } (it doesn't reject) —
        // check it rather than relying on .catch.
        const { error } = await supabase.auth.updateUser({ data });
        if (error) {
          console.warn("[onboarding] profile save failed:", error.message);
        }
      } catch {
        // Network-level failure — the wizard must keep flowing.
      }
      setSaving(false);
    }
    onNext();
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Tell us about you.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        {emailLocked
          ? "Your email carries over from sign-in — just add your name and number. You'll never be asked for these again."
          : "We'll start with the basics. Takes 30 seconds."}
      </p>
      {session === "anon" && supabase && (
        <p className="mt-4 rounded-xl border border-rule bg-cream-2/40 p-3 text-xs text-ink-soft">
          You're not signed in yet — confirm your email (check your
          inbox) and sign in first so these details save to your
          account. You can still preview the steps now.
        </p>
      )}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          autoComplete="given-name"
          value={first}
          onChange={setFirst}
        />
        <Field
          label="Last name"
          autoComplete="family-name"
          value={last}
          onChange={setLast}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          readOnly={emailLocked}
          hint={emailLocked ? "From your sign-in." : undefined}
        />
        <Field
          label="Phone"
          type="tel"
          placeholder="+1"
          autoComplete="tel"
          value={phone}
          onChange={setPhone}
        />
      </div>
      <NextButton
        onClick={() => void saveAndContinue()}
        disabled={session === "unknown" || !complete || saving}
        label={saving ? "Saving" : "Continue"}
      />
    </div>
  );
}

function Phone({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Verify your phone.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        We sent a 6-digit code to your number. Type it below.
      </p>
      <fieldset className="mt-8 border-0 p-0">
        <legend className="sr-only">6-digit phone verification code</legend>
        <div className="mx-auto flex max-w-sm justify-between gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <input
              key={i}
              id={`onboarding-otp-${i + 1}`}
              name={`otp-${i + 1}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Verification code digit ${i + 1} of 6`}
              className="h-14 w-12 rounded-xl border border-rule bg-cream text-center font-display text-2xl text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
            />
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-mute">
          Didn't get it?{" "}
          <button type="button" className="text-red hover:text-red-deep">
            Resend
          </button>
        </p>
      </fieldset>
      <BackNext onBack={onBack} onNext={onNext} />
    </div>
  );
}

function Personal({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Personal details.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Required for insurance underwriting. RYDA membership is 28+.
      </p>
      <div className="mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date of birth" type="date" />
          <Field label="Driver's license #" />
        </div>
        <Field label="Street address" autoComplete="street-address" />
        <div className="grid grid-cols-3 gap-4">
          <Field label="City" autoComplete="address-level2" />
          <Field label="State" autoComplete="address-level1" />
          <Field label="ZIP" autoComplete="postal-code" />
        </div>
      </div>
      <BackNext onBack={onBack} onNext={onNext} />
    </div>
  );
}

// Identity — the one step in this wizard wired to a real backend.
// POSTs to /api/kyc/start, which mints a Stripe Identity session and
// returns a hosted URL; we hand the browser over to Stripe and it
// returns to /onboarding?kyc=ok.
//
// Phases: "unknown" until the status check resolves (the CTA stays
// disabled so an early click can't mint a session for someone already
// verified), then "none" (no attempt, or a terminal one worth retrying),
// "pending" (submitted, Stripe still processing), or "verified".
type KycPhase = "unknown" | "none" | "pending" | "verified";

function Identity({
  onNext,
  onBack,
  returned,
}: {
  onNext: () => void;
  onBack: () => void;
  returned: boolean;
}) {
  const [phase, setPhase] = useState<KycPhase>("unknown");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/kyc/status");
        if (cancelled) return;
        if (!res.ok) {
          setPhase("none");
          return;
        }
        const j = await res.json();
        // Only 'processing' and 'verified' mean the user has done their
        // part. requires_input / requires_action / canceled / failed all
        // want another trip through Stripe, so they read as "none" and
        // the CTA offers a retry.
        setPhase(
          j.verified
            ? "verified"
            : j.status === "processing"
              ? "pending"
              : "none",
        );
      } catch {
        // Offline, or the route isn't deployed in this preview. Let the
        // user try the button rather than trapping them on a lookup.
        if (!cancelled) setPhase("none");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startKyc() {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await authedFetch("/api/kyc/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: "/onboarding" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.error || `Could not start verification (${res.status}).`,
        );
      }
      const j = await res.json();
      // The route short-circuits without minting a session when a
      // 'verified' row already exists.
      if (j.kycVerified) {
        setPhase("verified");
        return;
      }
      if (typeof j.url === "string") {
        window.location.href = j.url;
        return;
      }
      throw new Error("No verification URL returned.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start verification.",
      );
    } finally {
      setRunning(false);
    }
  }

  // The webhook that flips the row to 'verified' lands out-of-band, so
  // someone who just finished at Stripe can still read as
  // 'requires_input' here for a few seconds. Treat the return trip
  // itself as enough to move on — this wizard is not the gate. The
  // rental API re-checks verification server-side before any booking.
  const canContinue = phase === "verified" || phase === "pending" || returned;

  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Identity verification.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        We use Stripe Identity to verify your government ID and match it to a
        live selfie. Takes 2–3 minutes.
      </p>
      <ul className="mt-8 space-y-4">
        <Bullet ok>Government photo ID</Bullet>
        <Bullet ok>Live selfie match</Bullet>
        <Bullet>Stripe checks the document — RYDA gets a pass or fail</Bullet>
      </ul>

      {phase === "verified" && (
        <p className="mt-8 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-deep">
          Identity verified. You&rsquo;re all set for this step.
        </p>
      )}

      {phase !== "verified" && (returned || phase === "pending") && (
        <p className="mt-8 rounded-xl border border-warn/30 bg-warn/15 px-4 py-3 text-sm text-warn-deep">
          Verification submitted. Stripe usually clears it within minutes —
          we&rsquo;ll email you when it does. You can continue in the meantime.
        </p>
      )}

      {phase !== "verified" && (
        <button
          type="button"
          onClick={startKyc}
          disabled={running || phase === "unknown"}
          className="mt-8 h-12 w-full rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running
            ? "Opening Stripe…"
            : returned || phase === "pending"
              ? "Restart identity check →"
              : "Continue with Stripe Identity →"}
        </button>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}

      <p className="mt-4 text-center text-xs text-mute">
        Stripe Identity stores verification data, not RYDA. See our{" "}
        <Link href="/legal/privacy" className="underline hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
      <BackNext onBack={onBack} onNext={onNext} hideNext={!canContinue} />
    </div>
  );
}

function Done() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red/10 text-3xl text-red">
        ✓
      </div>
      <h2 className="mt-6 font-display text-3xl text-ink">You're in.</h2>
      <p className="mt-3 text-base text-ink-soft">
        Welcome to RYDA. Your account is active — identity verification
        usually clears within minutes, and we'll email you the moment
        it does.
      </p>
      <div className="mt-8 rounded-xl border border-rule bg-cream-2/40 p-5 text-left text-sm">
        <ul className="space-y-2 text-ink-soft">
          <li>· Identity verification: Processing</li>
          <li>· Account: Active</li>
        </ul>
      </div>
      <Link
        href="/rent"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
      >
        Browse the fleet →
      </Link>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

// Slugifies a label into a stable id ("First name" → "first-name") so each
// onboarding field gets a unique, meaningful id paired with its label.
function fieldId(label: string) {
  return `onboarding-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function Field({
  label,
  type = "text",
  placeholder,
  autoComplete,
  value,
  onChange,
  readOnly,
  hint,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  /** Controlled mode — pass with onChange. Omit for the mock steps
   *  that don't persist yet. */
  value?: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  hint?: string;
}) {
  const id = fieldId(label);
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
        placeholder={placeholder}
        autoComplete={autoComplete}
        readOnly={readOnly}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...(value !== undefined
          ? { value, onChange: (e) => onChange?.(e.target.value) }
          : {})}
        className={`mt-2 h-12 w-full rounded-xl border border-rule px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20 ${
          readOnly ? "cursor-default bg-cream-2/60 text-ink-soft" : "bg-cream"
        }`}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[11px] text-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Bullet({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <li className="flex items-start gap-3 text-sm text-ink-soft">
      <span className="mt-0.5 text-red">{ok ? "✓" : "·"}</span>
      <span>{children}</span>
    </li>
  );
}

function NextButton({
  onClick,
  label = "Continue",
  disabled,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-10 h-12 w-full rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label} →
    </button>
  );
}

function BackNext({
  onBack,
  onNext,
  hideNext,
}: {
  onBack: () => void;
  onNext: () => void;
  hideNext?: boolean;
}) {
  return (
    <div className="mt-10 flex gap-3">
      <button
        onClick={onBack}
        className="h-12 rounded-full border border-rule px-6 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
      >
        ← Back
      </button>
      {!hideNext && (
        <button
          onClick={onNext}
          className="h-12 flex-1 rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
        >
          Continue →
        </button>
      )}
    </div>
  );
}