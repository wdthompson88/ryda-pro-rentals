"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StepProgress } from "@/components/step-progress";

const STEPS = ["Basic", "Phone", "Personal", "Identity", "Financial", "Tier", "Done"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Membership application
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
          {step === 3 && <Identity onNext={next} onBack={back} />}
          {step === 4 && <Financial onNext={next} onBack={back} />}
          {step === 5 && <Tier onNext={next} onBack={back} />}
          {step === 6 && <Done />}
        </div>

        <p className="mt-6 text-center text-xs text-mute">
          Your progress saves automatically. You can pick up where you left off.
        </p>
      </section>
    </>
  );
}

// ── Step components ─────────────────────────────────────────────

function Basic({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Tell us about you.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        We'll start with the basics. Takes 30 seconds.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" autoComplete="given-name" />
        <Field label="Last name" autoComplete="family-name" />
        <Field label="Email" type="email" autoComplete="email" />
        <Field label="Phone" type="tel" placeholder="+1" autoComplete="tel" />
      </div>
      <NextButton onClick={onNext} />
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

function Identity({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Identity verification.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        We use Persona to verify your government ID and run a quick liveness
        check. Takes 2–3 minutes.
      </p>
      <div className="mt-8 space-y-4">
        <Bullet ok>Government photo ID (front + back)</Bullet>
        <Bullet ok>Selfie liveness check</Bullet>
        <Bullet ok>SSN last-4 (US members)</Bullet>
        <Bullet>Soft credit pull (no impact on your score)</Bullet>
      </div>
      <button className="mt-8 h-12 w-full rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep">
        Continue with Persona →
      </button>
      <p className="mt-4 text-center text-xs text-mute">
        Persona stores verification data, not RYDA. See our{" "}
        <Link href="/legal/privacy" className="underline hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
      <BackNext onBack={onBack} onNext={onNext} hideNext />
    </div>
  );
}

function Financial({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">A bit about you.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Helps us match you to the right vehicles, markets, and member events.
        No accredited-investor status or financial qualification required —
        RYDA is a luxury access platform, not an investment platform.
      </p>
      <div className="mt-8 space-y-5">
        <Select
          label="Why are you interested in RYDA?"
          options={[
            "I love these cars and want to drive more of them",
            "I want a Ferrari without buying one outright",
            "I rent exotics now and the math no longer works",
            "I'm exploring, not sure yet",
          ]}
        />
        <Select
          label="How often do you drive a supercar today?"
          options={[
            "Never, but I want to",
            "A few days a year (rentals, friends' cars)",
            "I own one already and want a second flavor",
            "Regularly via track days or a club",
          ]}
        />
        <Select
          label="Primary market"
          options={["Miami", "Los Angeles", "New York", "I travel between these cities", "Somewhere else"]}
        />
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-mute">
            Anything we should know? (optional)
          </label>
          <textarea
            rows={3}
            className="mt-2 w-full rounded-xl border border-rule bg-cream px-4 py-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
            placeholder="Track-day enthusiast, prefer naturally aspirated V8s, occasional Aspen trips..."
          />
        </div>
        <label className="flex items-start gap-3 text-xs text-ink-soft">
          <input type="checkbox" className="mt-0.5 accent-red" />
          <span>
            I acknowledge the{" "}
            <Link href="/legal/disclaimer" className="underline hover:text-ink">
              Co-Ownership Disclaimer
            </Link>
            . I understand co-ownership stakes are not investments and the
            cars I co-own will depreciate over time.
          </span>
        </label>
      </div>
      <BackNext onBack={onBack} onNext={onNext} />
    </div>
  );
}

function Tier({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [tier, setTier] = useState<"core" | "blue" | "black">("blue");
  return (
    <div>
      <h2 className="font-display text-2xl text-ink">Pick a tier.</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Most active members start on Blue. Upgrade or downgrade anytime.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-3">
        <TierOption
          name="RYDA Core"
          price="Free"
          tagline="Browse, rent, and claim co-ownership shares. Standard handover."
          selected={tier === "core"}
          onClick={() => setTier("core")}
        />
        <TierOption
          name="RYDA Blue"
          price="$500 / yr"
          tagline="$200 buy-in credit · 1 free delivery · monthly meetups · member-to-member transfers."
          selected={tier === "blue"}
          onClick={() => setTier("blue")}
          badge="Most chosen"
        />
        <TierOption
          name="RYDA Black"
          price="$1,500 / yr"
          tagline="$500 share credit · 3 deliveries · 3 service hrs · flagship events · dedicated contact."
          selected={tier === "black"}
          onClick={() => setTier("black")}
        />
      </div>
      <BackNext onBack={onBack} onNext={onNext} />
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
        Welcome to RYDA. Your application is under review, we'll send a
        decision within 5 business days.
      </p>
      <div className="mt-8 rounded-xl border border-rule bg-cream-2/40 p-5 text-left text-sm">
        <p className="font-medium text-ink">Member #00104, Pending review</p>
        <ul className="mt-3 space-y-2 text-ink-soft">
          <li>· Identity verification: Submitted</li>
          <li>· Financial qualification: Submitted</li>
          <li>· Membership tier: RYDA Core</li>
          <li>· Status: Under review</li>
        </ul>
      </div>
      <Link
        href="/markets"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
      >
        Browse vehicles →
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
}: {
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
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
        className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      />
    </div>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  const id = fieldId(label);
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-wider text-mute"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Bullet({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <li className="flex items-start gap-3 text-sm text-ink-soft">
      <span className={`mt-0.5 ${ok ? "text-red" : "text-red"}`}>
        {ok ? "✓" : "·"}
      </span>
      <span>{children}</span>
    </li>
  );
}

function NextButton({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-10 h-12 w-full rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
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

function TierOption({
  name,
  price,
  tagline,
  selected,
  onClick,
  badge,
}: {
  name: string;
  price: string;
  tagline: string;
  selected: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full rounded-2xl border p-6 text-left transition-colors ${
        selected ? "border-red bg-red/5" : "border-rule bg-cream hover:border-ink-soft"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 right-6 rounded-full bg-red px-3 py-1 text-xs font-medium text-cream">
          {badge}
        </span>
      )}
      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg text-ink">{name}</p>
        <p className="font-display text-xl text-ink tabular-nums">{price}</p>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{tagline}</p>
    </button>
  );
}
