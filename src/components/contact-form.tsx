"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const VALID_TYPES = ["Membership", "Concierge Ownership", "Rental", "Press", "Partnership", "Investor", "Other"] as const;
type InquiryType = (typeof VALID_TYPES)[number];

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [type, setType] = useState<InquiryType>("Membership");

  // Read ?type= from the URL after mount so deep-linked CTAs from elsewhere
  // on the site (e.g. /press, /investors, /contact?type=Press) pre-select
  // the right inquiry type. Done in useEffect to avoid Next.js static-
  // prerender bail-outs from useSearchParams.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("type");
    if (param && (VALID_TYPES as readonly string[]).includes(param)) {
      setType(param as InquiryType);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      phone: String(data.get("phone") || ""),
      type: String(data.get("type") || "Other"),
      market: String(data.get("market") || "Miami"),
      message: String(data.get("message") || ""),
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
        <p className="font-display text-2xl text-ink">Thanks — message received.</p>
        <p className="mt-3 text-sm text-ink-soft">
          A team member will respond within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <Select name="market" label="Market" options={["Miami", "Los Angeles", "New York", "Not sure"]} />
      <div className="hidden sm:block" />
      <div className="sm:col-span-2">
        <label
          htmlFor="contact-message"
          className="block text-xs font-medium uppercase tracking-wider text-mute"
        >
          Message <span aria-hidden="true" className="text-red">*</span>
          <span className="sr-only">required</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={20}
          rows={5}
          aria-required="true"
          className="mt-2 w-full rounded-xl border border-rule bg-surface px-4 py-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
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
          className="h-12 rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red disabled:opacity-50"
        >
          {status === "submitting" ? "Sending..." : "Send message"}
        </button>
      </div>
      {status === "error" && (
        <p className="sm:col-span-2 text-sm text-red">
          {errorMessage ||
            "Something went wrong. Try emailing hello@ryda.com instead."}
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
            <span aria-hidden="true" className="text-red">*</span>
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
        className="mt-2 h-12 w-full rounded-xl border border-rule bg-surface px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
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
        className="mt-2 h-12 w-full rounded-xl border border-rule bg-surface px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
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
