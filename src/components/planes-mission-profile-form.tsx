"use client";

// Structured mission-profile intake for /planes. Replaces the
// email-only waitlist capture with a 4-question qualifier so we
// can stage outreach by cohort (jet category × annual hours × base).
//
// Submits to /api/contact with type="Other" + a synthesized message
// + context that surfaces the mission profile to the team email
// subject line. The endpoint already supports CTA-context attribution
// (migration 0006).

import { useState } from "react";

type JetClass = "light" | "mid" | "super-mid" | "large" | "undecided";
type AnnualHours = "0-50" | "50-100" | "100-200" | "200+";
type Base = "Miami" | "NYC" | "LA" | "Other";
type Mode = "ownership" | "charter" | "both";

const JET_CLASSES: { value: JetClass; label: string; example: string }[] = [
  { value: "light", label: "Light jet", example: "Phenom 300E, CJ4" },
  { value: "mid", label: "Mid-size jet", example: "Citation XLS, Lear 75" },
  { value: "super-mid", label: "Super-mid", example: "Challenger 350, Praetor 600" },
  { value: "large", label: "Large jet", example: "Gulfstream G450, G550, Falcon 7X" },
  { value: "undecided", label: "Help me decide", example: "Right airframe per mission" },
];

const HOURS: AnnualHours[] = ["0-50", "50-100", "100-200", "200+"];
const BASES: Base[] = ["Miami", "NYC", "LA", "Other"];

export function PlanesMissionProfileForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [jetClass, setJetClass] = useState<JetClass>("light");
  const [hours, setHours] = useState<AnnualHours>("50-100");
  const [base, setBase] = useState<Base>("Miami");
  const [mode, setMode] = useState<Mode>("ownership");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const jetClassLabel = JET_CLASSES.find((j) => j.value === jetClass)?.label ?? jetClass;
    const modeLabel =
      mode === "ownership"
        ? "Ownership"
        : mode === "charter"
          ? "Charter / dry-lease"
          : "Both — open";
    const context = `Planes intake · ${jetClassLabel} · ${hours} hrs/yr · ${base} · ${modeLabel}`;
    const message = `Mission profile from ${name.trim()}:

· Jet class: ${jetClassLabel}
· Annual hours expected: ${hours}
· Primary base: ${base}
· Preference: ${modeLabel}

Reply when RYDA Planes opens the founding cohort window for this profile.`;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: "",
          type: "Other",
          market: base === "NYC" ? "New York" : base === "LA" ? "Los Angeles" : base === "Miami" ? "Miami" : "Not sure",
          message,
          context,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(j.error || "Too many requests. Try again in a minute.");
          return;
        }
        throw new Error(j.error || "Submission failed.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-cream/20 bg-cream/5 p-5">
        <p className="font-display text-lg text-cream">
          Thanks — mission profile received.
        </p>
        <p className="mt-2 text-sm text-cream/70">
          When the founding cohort opens for{" "}
          <span className="text-cream">
            {JET_CLASSES.find((j) => j.value === jetClass)?.label} · {hours} hrs/yr · {base}
          </span>
          , you&apos;ll be among the first contacted.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          autoComplete="name"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 rounded-xl border border-cream/20 bg-cream/10 px-4 text-sm text-cream placeholder:text-cream/40 focus:border-cream/50 focus:outline-none"
        />
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl border border-cream/20 bg-cream/10 px-4 text-sm text-cream placeholder:text-cream/40 focus:border-cream/50 focus:outline-none"
        />
      </div>

      <Field label="Jet class">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {JET_CLASSES.map((j) => (
            <button
              key={j.value}
              type="button"
              onClick={() => setJetClass(j.value)}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                jetClass === j.value
                  ? "border-cream bg-cream/15 text-cream"
                  : "border-cream/20 bg-cream/5 text-cream/70 hover:border-cream/40"
              }`}
            >
              <div className="font-medium">{j.label}</div>
              <div className="mt-0.5 text-cream/50">{j.example}</div>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Annual hours">
          <div className="flex gap-2">
            {HOURS.map((h) => (
              <Pill key={h} active={hours === h} onClick={() => setHours(h)}>
                {h}
              </Pill>
            ))}
          </div>
        </Field>
        <Field label="Primary base">
          <div className="flex gap-2">
            {BASES.map((b) => (
              <Pill key={b} active={base === b} onClick={() => setBase(b)}>
                {b}
              </Pill>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Preference">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Pill active={mode === "ownership"} onClick={() => setMode("ownership")}>
            Ownership
          </Pill>
          <Pill active={mode === "charter"} onClick={() => setMode("charter")}>
            Charter / dry-lease
          </Pill>
          <Pill active={mode === "both"} onClick={() => setMode("both")}>
            Both — open
          </Pill>
        </div>
      </Field>

      {error ? (
        <p className="rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-xs text-cream">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink transition-colors hover:bg-red hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Send mission profile →"}
      </button>
      <p className="text-[11px] text-cream/50">
        We&apos;ll only contact you when the cohort window opens for your
        profile. No interim marketing.
      </p>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-cream/55">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "bg-cream text-ink"
          : "border border-cream/20 bg-cream/5 text-cream/70 hover:border-cream/40"
      }`}
    >
      {children}
    </button>
  );
}
