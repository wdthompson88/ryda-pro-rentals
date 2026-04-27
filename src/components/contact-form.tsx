"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

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
      // Reuses the waitlist endpoint as a generic-inbox sink for now.
      // Will get its own table when Supabase is wired up.
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, source: "contact" }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
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
      <Select name="type" label="Inquiry type" options={["Membership", "Press", "Partnership", "Investor", "Other"]} />
      <Select name="market" label="Market" options={["Miami", "Los Angeles", "New York", "Not sure"]} />
      <div className="hidden sm:block" />
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium uppercase tracking-wider text-mute">
          Message
        </label>
        <textarea
          name="message"
          required
          minLength={20}
          rows={5}
          className="mt-2 w-full rounded-xl border border-rule bg-surface px-4 py-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
          placeholder="Tell us a bit about what you're looking for..."
        />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-mute">
          By submitting you agree to RYDA&apos;s{" "}
          <a href="/legal/privacy" className="underline hover:text-ink">Privacy Policy</a>.
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
          Something went wrong. Try emailing hello@ryda.com instead.
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
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-mute">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 h-11 w-full rounded-xl border border-rule bg-surface px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      />
    </div>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-mute">
        {label}
      </label>
      <select
        name={name}
        className="mt-2 h-11 w-full rounded-xl border border-rule bg-surface px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
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
