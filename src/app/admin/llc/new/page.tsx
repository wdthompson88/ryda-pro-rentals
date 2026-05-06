"use client";

// /admin/llc/new — admin form to trigger a new LLC formation.
//
// Default state: Florida-formed LLC for one of the existing
// VEHICLES/BOATS in the catalog. Operator can override the LLC name
// (Firstbase will reject if state-unique-name fails) and the
// principal/manager fields.
//
// IMPORTANT: this page is purely UI scaffolding. The "Form LLC"
// submit hits POST /api/admin/llc which routes through the resolved
// adapter (mock by default, real Firstbase only when keys are set
// AND mode=live). The user explicitly asked: NO smoke test until a
// real car is in the fleet — so live mode requires a deliberate env
// var change.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

type FormState = {
  assetType: "vehicle" | "boat";
  vehicleSymbol: string;
  boatSlug: string;
  llcName: string;
  state: "FL" | "DE" | "WY" | "CA" | "NY";
  managerName: string;
  managerEmail: string;
  principalLine1: string;
  principalCity: string;
  principalPostal: string;
};

const DEFAULT: FormState = {
  assetType: "vehicle",
  vehicleSymbol: "",
  boatSlug: "",
  llcName: "",
  state: "FL",
  managerName: "RYDA Manager LLC",
  managerEmail: "ops@ryda.pro",
  principalLine1: "",
  principalCity: "Miami",
  principalPostal: "",
};

export default function NewLLCPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill the LLC name from the chosen asset to save typing.
  // E.g. F458 → "RYDA F458 LLC".
  const suggestedLlcName = useMemo(() => {
    if (form.assetType === "vehicle" && form.vehicleSymbol) {
      return `RYDA ${form.vehicleSymbol} LLC`;
    }
    if (form.assetType === "boat" && form.boatSlug) {
      const slug = form.boatSlug.toUpperCase().replace(/-/g, " ");
      return `RYDA ${slug} LLC`;
    }
    return "";
  }, [form.assetType, form.vehicleSymbol, form.boatSlug]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Build idempotency key from the asset + form state. Two clicks
    // on Submit with the same form will reuse the existing row.
    const idempotencyKey = `llc-${form.assetType}-${form.vehicleSymbol || form.boatSlug}-${form.state}-v1`;

    const payload = {
      vehicleSymbol:
        form.assetType === "vehicle" ? form.vehicleSymbol : undefined,
      boatSlug: form.assetType === "boat" ? form.boatSlug : undefined,
      vehicleDescription:
        form.assetType === "vehicle"
          ? VEHICLES.find((v) => v.symbol === form.vehicleSymbol)?.name ?? ""
          : BOATS.find((b) => b.slug === form.boatSlug)?.name ?? "",
      state: form.state,
      llcName: form.llcName || suggestedLlcName,
      principalAddress: {
        line1: form.principalLine1,
        city: form.principalCity,
        state: form.state,
        postalCode: form.principalPostal,
        country: "US" as const,
      },
      manager: {
        fullName: form.managerName,
        email: form.managerEmail,
        role: "manager" as const,
        address: {
          line1: form.principalLine1,
          city: form.principalCity,
          state: form.state,
          postalCode: form.principalPostal,
          country: "US" as const,
        },
      },
      idempotencyKey,
    };

    try {
      const res = await authedFetch("/api/admin/llc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.details?.join?.(", ") ?? json.error ?? `${res.status}`,
        );
      }
      router.push(`/admin/llc/${json.llc_entity_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <Link
          href="/admin/llc"
          className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
        >
          ← Back to LLCs
        </Link>
        <h1 className="mt-4 font-display text-4xl text-ink">
          Form new LLC
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Trigger a single-purpose LLC formation through the configured
          provider. Per-LLC cost in live mode: ~$524 ($399 platform + $125
          Florida filing). Sandbox + mock modes are free.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 space-y-8 rounded-2xl border border-rule bg-surface p-6 sm:p-8"
        >
          {/* Asset selection */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-medium uppercase tracking-[0.18em] text-red">
              Asset
            </legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="assetType"
                  checked={form.assetType === "vehicle"}
                  onChange={() => update("assetType", "vehicle")}
                />
                Vehicle
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="assetType"
                  checked={form.assetType === "boat"}
                  onChange={() => update("assetType", "boat")}
                />
                Boat
              </label>
            </div>
            {form.assetType === "vehicle" ? (
              <Select
                label="Vehicle"
                value={form.vehicleSymbol}
                onChange={(v) => update("vehicleSymbol", v)}
                options={[
                  { value: "", label: "— pick a vehicle —" },
                  ...VEHICLES.map((v) => ({
                    value: v.symbol,
                    label: `${v.symbol} · ${v.year} ${v.name}`,
                  })),
                ]}
                required
              />
            ) : (
              <Select
                label="Boat"
                value={form.boatSlug}
                onChange={(v) => update("boatSlug", v)}
                options={[
                  { value: "", label: "— pick a boat —" },
                  ...BOATS.map((b) => ({
                    value: b.slug,
                    label: `${b.slug} · ${b.year} ${b.name}`,
                  })),
                ]}
                required
              />
            )}
          </fieldset>

          {/* LLC details */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-medium uppercase tracking-[0.18em] text-red">
              LLC details
            </legend>
            <Input
              label="LLC name"
              value={form.llcName || suggestedLlcName}
              onChange={(v) => update("llcName", v)}
              placeholder={suggestedLlcName || "RYDA F458 LLC"}
              required
            />
            <Select
              label="State of formation"
              value={form.state}
              onChange={(v) =>
                update("state", v as FormState["state"])
              }
              options={[
                { value: "FL", label: "Florida (recommended for Miami fleet)" },
                { value: "DE", label: "Delaware" },
                { value: "WY", label: "Wyoming" },
                { value: "CA", label: "California" },
                { value: "NY", label: "New York" },
              ]}
            />
          </fieldset>

          {/* Principal address */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-medium uppercase tracking-[0.18em] text-red">
              Principal address
            </legend>
            <Input
              label="Address line 1"
              value={form.principalLine1}
              onChange={(v) => update("principalLine1", v)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={form.principalCity}
                onChange={(v) => update("principalCity", v)}
                required
              />
              <Input
                label="Postal code"
                value={form.principalPostal}
                onChange={(v) => update("principalPostal", v)}
                required
              />
            </div>
          </fieldset>

          {/* Manager */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-medium uppercase tracking-[0.18em] text-red">
              Manager (RYDA designee)
            </legend>
            <Input
              label="Manager full name"
              value={form.managerName}
              onChange={(v) => update("managerName", v)}
              required
            />
            <Input
              label="Manager email"
              type="email"
              value={form.managerEmail}
              onChange={(v) => update("managerEmail", v)}
              required
            />
            <p className="text-xs text-mute">
              SSN/ITIN and other sensitive identifiers are NOT collected
              here — they go through the Firstbase hosted form after the
              vendor invites the manager via email.
            </p>
          </fieldset>

          {error && (
            <div className="rounded-lg border border-red/40 bg-red/5 p-3 text-sm text-ink">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-rule pt-6">
            <Link
              href="/admin/llc"
              className="text-sm text-ink-soft hover:text-ink"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-red disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Form LLC →"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
        {props.label}
      </span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        className="mt-1 block w-full rounded-lg border border-rule bg-cream-2/40 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
      />
    </label>
  );
}

function Select<T extends string>(props: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
        {props.label}
      </span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        required={props.required}
        className="mt-1 block w-full rounded-lg border border-rule bg-cream-2/40 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
