"use client";

// Slim, single-line email capture for the home hero. Wraps the same
// /api/waitlist endpoint the signup form uses, but with no name/market
// fields — just intent. Designed to fit inside a tight hero column
// without dominating the visual hierarchy.

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function InlineEmailCapture({
  source = "home-hero",
  placeholder = "you@example.com",
  buttonLabel = "Notify me →",
}: {
  source?: string;
  placeholder?: string;
  buttonLabel?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") || "").trim();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: "",
          market: "Miami",
          source,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setStatus("error");
          setError(j.error || "Too many requests. Try again in a minute.");
          return;
        }
        throw new Error(j.error || "network");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error && err.message !== "network"
          ? err.message
          : "Something went wrong. Try again in a sec.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-full border border-rule bg-cream-2 px-5 py-3 text-sm text-ink">
        Thanks. We&apos;ll be in touch when there&apos;s news worth
        sharing.
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
    >
      <label htmlFor={`inline-email-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`inline-email-${source}`}
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder={placeholder}
        disabled={status === "submitting"}
        className="h-11 min-w-0 flex-1 rounded-full border border-rule bg-surface px-5 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream transition-colors hover:bg-red disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : buttonLabel}
      </button>
      {error ? (
        <p className="basis-full text-xs text-red">{error}</p>
      ) : null}
    </form>
  );
}
