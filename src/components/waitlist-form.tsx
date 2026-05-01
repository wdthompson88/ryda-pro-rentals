"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

// Optional source attribution — pages that mount the form on a
// specific surface (e.g. /investors, /founding-members) can pass
// a label so the team email + DB row reflects where the lead came
// from. Omitted defaults to "waitlist-form".
export function WaitlistForm({ source = "waitlist-form" }: { source?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      email: String(data.get("email") || "").trim(),
      name: String(data.get("name") || "").trim(),
      market: String(data.get("market") || "Miami"),
      source,
    };

    if (!payload.email || !payload.email.includes("@")) {
      setStatus("error");
      setError("Please enter a valid email.");
      return;
    }

    try {
      const res = await fetch("/api/waitlist", {
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
      <div className="rounded-2xl border border-cream/20 bg-cream/5 px-6 py-10 text-cream">
        <p className="font-display text-2xl">You're on the list.</p>
        <p className="mt-3 text-sm text-cream/70">
          We'll reach out personally as we open Miami membership. Welcome.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-xl flex-col gap-3">
      <label htmlFor="waitlist-name" className="sr-only">
        Your name
      </label>
      <input
        id="waitlist-name"
        type="text"
        name="name"
        placeholder="Your name"
        autoComplete="name"
        className="h-12 rounded-full border border-cream/20 bg-cream/5 px-5 text-cream placeholder:text-cream/50 focus:border-red focus:outline-none focus:ring-2 focus:ring-red/30"
      />
      <label htmlFor="waitlist-email" className="sr-only">
        Email address (required)
      </label>
      <input
        id="waitlist-email"
        type="email"
        name="email"
        placeholder="Email address"
        autoComplete="email"
        required
        aria-required="true"
        className="h-12 rounded-full border border-cream/20 bg-cream/5 px-5 text-cream placeholder:text-cream/50 focus:border-red focus:outline-none focus:ring-2 focus:ring-red/30"
      />
      <label htmlFor="waitlist-market" className="sr-only">
        Primary market
      </label>
      <select
        id="waitlist-market"
        name="market"
        defaultValue="Miami"
        className="h-12 rounded-full border border-cream/20 bg-cream/5 px-5 text-cream focus:border-red focus:outline-none focus:ring-2 focus:ring-red/30"
      >
        <option value="Miami">Miami (launching first)</option>
        <option value="LA">Los Angeles</option>
        <option value="NY">New York</option>
        <option value="Other">Somewhere else</option>
      </select>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="h-12 rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Request membership"}
      </button>
      {status === "error" && error && (
        <p className="mt-2 text-sm text-red" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
