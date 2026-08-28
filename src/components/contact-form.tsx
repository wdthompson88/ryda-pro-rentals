"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type Status = "idle" | "submitting" | "success" | "error";

// "Membership" is gone from the picker: there is no membership in this
// platform, so offering it as an inquiry type advertises a product that
// does not exist. /api/contact still accepts the value (it is a wider
// allow-list), so any old deep link degrades to "Other" rather than 400.
const VALID_TYPES = ["Rental", "Press", "Partnership", "Investor", "Other"] as const;
type InquiryType = (typeof VALID_TYPES)[number];

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [type, setType] = useState<InquiryType>("Rental");
  // CTA-attribution string passed via `?note=` from upstream pages
  // (e.g. "Fleet Partner Program question"). We display it as a pinned
  // reference badge above the form AND submit it as `context` so the
  // team email + DB row reflects which surface produced the lead.
  const [ctaNote, setCtaNote] = useState<string | null>(null);

  // Read URL params after mount so deep-linked CTAs from elsewhere
  // on the site (e.g. /press, /investors, /contact?type=Press) pre-select
  // the right inquiry type AND surface the asset/intent as context.
  // Done in useEffect to avoid Next.js static-prerender bail-outs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const param = params.get("type");
    if (param && (VALID_TYPES as readonly string[]).includes(param)) {
      setType(param as InquiryType);
    }
    const note = params.get("note");
    if (note) {
      // Cap at 256 chars to match the API field length and prevent a
      // pathological URL from blowing out the badge layout.
      setCtaNote(note.slice(0, 256));
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    // Clear any prior error message so a stale 429 copy doesn't display
    // alongside a fresh fetch-level failure on the same form.
    setErrorMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      phone: String(data.get("phone") || ""),
      type: String(data.get("type") || "Other"),
      market: String(data.get("market") || "Miami"),
      message: String(data.get("message") || ""),
      // Surface the upstream CTA reference (vehicle, hull, intent) so
      // the team email subject + body + DB row carry attribution.
      context: ctaNote || "",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // Surface API error message (e.g. 429 rate limit) when present.
        const j = await res.json().catch(() => ({}));
        setErrorMessage(j.error || (res.status === 429
          ? "Too many requests. Try again in a minute."
          : null));
        throw new Error(j.error || "Submission failed.");
      }
      setStatus("success");
      setErrorMessage(null);
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-rule bg-cream-2 px-8 py-10">
        <p className="font-display text-2xl text-ink">Thanks, message received.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {ctaNote ? (
        <div className="sm:col-span-2 border-t border-rule pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
            Reference
          </p>
          <p className="mt-2 text-[15px] italic text-ink">{ctaNote}</p>
        </div>
      ) : null}
      <Input name="name" label="Full name" required />
      <Input name="email" label="Email" type="email" required />
      <Input name="phone" label="Phone (optional)" />
      <Select
        name="type"
        label="Inquiry type"
        options={VALID_TYPES as unknown as string[]}
        value={type}
        onChange={(v) => setType(v as InquiryType)}
      />
      {/* Miami is the only market with any inventory; Los Angeles and
          New York were removed rather than presented as places RYDA
          operates. /api/contact maps anything else to "Not sure". */}
      <Select name="market" label="Market" options={["Miami", "Not sure"]} />
      <div className="hidden sm:block" />
      <div className="sm:col-span-2">
        <label
          htmlFor="contact-message"
          className="block text-xs font-medium uppercase tracking-wider text-mute"
        >
          Message <span aria-hidden="true" className="text-mute">*</span>
          <span className="sr-only">required</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={20}
          rows={5}
          aria-required="true"
          className="mt-2 w-full rounded-2xl border border-rule bg-surface px-5 py-3 text-[15px] text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
          placeholder="Tell us a bit about what you're looking for..."
        />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-mute">
          By submitting you agree to RYDA&apos;s{" "}
          <Link href="/legal/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-12 rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "submitting" ? "Sending..." : "Send message"}
        </button>
      </div>
      {status === "error" && (
        <p className="sm:col-span-2 text-sm text-red">
          {errorMessage ||
            "Something went wrong. Try emailing hello@ryda.pro instead."}
        </p>
      )}
    </form>
  );
}

function Input({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  const id = `contact-${name}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-wider text-mute"
      >
        {label}
        {required && (
          <>
            {" "}
            <span aria-hidden="true" className="text-mute">*</span>
            <span className="sr-only">required</span>
          </>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        aria-required={required || undefined}
        autoComplete={
          name === "name"
            ? "name"
            : name === "email"
              ? "email"
              : name === "phone"
                ? "tel"
                : undefined
        }
        className="mt-2 h-12 w-full rounded-full border border-rule bg-surface px-5 text-[15px] text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      />
    </div>
  );
}

function Select({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
}) {
  const id = `contact-${name}`;
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
        name={name}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        defaultValue={value === undefined ? options[0] : undefined}
        className="mt-2 h-12 w-full rounded-full border border-rule bg-surface px-5 text-[15px] text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
