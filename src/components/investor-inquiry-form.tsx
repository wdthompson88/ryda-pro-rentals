"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const CHECK_SIZES = ["$25K–$50K", "$50K–$250K", "$250K–$1M", "$1M+"] as const;

export function InvestorInquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      firm: String(data.get("firm") || "").trim(),
      check_size: String(data.get("check_size") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
    };

    if (!payload.email || !payload.email.includes("@")) {
      setStatus("error");
      setError("Please enter a valid email.");
      return;
    }
    if (!payload.name) {
      setStatus("error");
      setError("Please enter your name.");
      return;
    }

    try {
      const res = await fetch("/api/investor-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Submission failed.");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-rule bg-surface px-6 py-10 text-ink">
        {/* The second line promised the deck "within 24 hours" and a
            diligence call. Nothing measures or queues against a response
            time, and no diligence process exists in this repo — deleted
            rather than restated more vaguely. */}
        <p className="font-display text-2xl">Thanks, we'll be in touch.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-10 grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
      <Input id="investor-name" name="name" label="Your name" autoComplete="name" required />
      <Input id="investor-email" name="email" type="email" label="Email address" autoComplete="email" required />
      <Input id="investor-firm" name="firm" label="Firm (optional)" className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <label htmlFor="investor-check-size" className="sr-only">
          Anticipated check size
        </label>
        <select
          id="investor-check-size"
          name="check_size"
          defaultValue=""
          className="h-12 w-full rounded-full border border-rule bg-surface px-5 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
        >
          <option value="" disabled>
            Anticipated check size
          </option>
          {CHECK_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="investor-notes" className="sr-only">
          Anything we should know
        </label>
        <textarea
          id="investor-notes"
          name="notes"
          placeholder="Anything we should know? (optional)"
          rows={4}
          className="w-full rounded-2xl border border-rule bg-surface px-5 py-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
        />
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="h-12 rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
      >
        {status === "submitting" ? "Submitting…" : "Request the deck"}
      </button>
      {status === "error" && error && (
        <p className="text-sm text-red sm:col-span-2" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function Input({
  id,
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
        {props.required ? " (required)" : ""}
      </label>
      <input
        {...props}
        id={id}
        placeholder={label}
        aria-required={props.required || undefined}
        className="h-12 w-full rounded-full border border-rule bg-surface px-5 text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      />
    </div>
  );
}
