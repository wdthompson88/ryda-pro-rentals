"use client";

// /admin/comparables/[vehicle_symbol] — per-vehicle comparable
// curation. Add new comps, edit existing ones, delete stale ones.
//
// Workflow for the curator:
//  1. Open classic.com/m/<make>/<model> in a new tab
//  2. Find 3-5 recent sales (last ~12 months preferred)
//  3. Paste each into the form below with source URL + lot # + price
//  4. Hit Save; the comp appears on the public listing within 5 min
//     (page revalidate)

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { VEHICLES } from "@/lib/market-data";

type Row = {
  id: string;
  vehicle_symbol: string;
  sale_date: string;
  year_make_model: string;
  trim_notes: string | null;
  sale_price_cents: number;
  source_name: string;
  source_url: string;
  lot_number: string | null;
  notes: string | null;
};

const EMPTY_FORM = {
  saleDate: "",
  yearMakeModel: "",
  trimNotes: "",
  salePriceUsd: "",     // displayed in dollars; converted to cents on save
  sourceName: "",
  sourceUrl: "",
  lotNumber: "",
  notes: "",
};

export default function VehicleComparablesPage({
  params,
}: {
  params: Promise<{ vehicle_symbol: string }>;
}) {
  const { vehicle_symbol } = use(params);
  const vehicle = VEHICLES.find((v) => v.symbol === vehicle_symbol);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const res = await authedFetch(
        `/api/admin/comparables?vehicle_symbol=${encodeURIComponent(vehicle_symbol)}`,
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const json = (await res.json()) as { rows: Row[] };
      setRows(json.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle_symbol]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cents = Math.round(parseFloat(form.salePriceUsd || "0") * 100);
      if (!Number.isFinite(cents) || cents <= 0)
        throw new Error("Sale price must be a positive number");
      const payload = {
        vehicleSymbol: vehicle_symbol,
        saleDate: form.saleDate,
        yearMakeModel: form.yearMakeModel,
        trimNotes: form.trimNotes || null,
        salePriceCents: cents,
        sourceName: form.sourceName,
        sourceUrl: form.sourceUrl,
        lotNumber: form.lotNumber || null,
        notes: form.notes || null,
      };
      const res = await authedFetch("/api/admin/comparables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.details?.join?.(", ") ?? json.error ?? "Save failed",
        );
      }
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this comp?")) return;
    const res = await authedFetch(`/api/admin/comparables/${id}`, {
      method: "DELETE",
    });
    if (res.ok) await reload();
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
        <Link
          href="/admin/comparables"
          className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
        >
          ← Back to all comparables
        </Link>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              #{vehicle_symbol} · Comparables
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink">
              {vehicle ? `${vehicle.year} ${vehicle.name}` : vehicle_symbol}
            </h1>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm text-ink-soft">
          Pull 3-5 recent comparable sales from classic.com,
          Bring a Trailer, or RM Sotheby&apos;s. Display cites your
          source URL + auction house + sale date — credibility comes
          from named transactions, not estimates.
        </p>

        {/* Existing rows */}
        <section className="mt-10">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-mute">
            Curated comps ({rows?.length ?? 0})
          </h2>
          {rows && rows.length === 0 && (
            <p className="mt-3 text-sm italic text-mute">
              None yet. Add the first below.
            </p>
          )}
          {rows && rows.length > 0 && (
            <ul className="mt-4 space-y-3">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-rule bg-surface p-4"
                >
                  <div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-medium text-ink">
                        {r.year_make_model}
                      </span>
                      <span className="text-xs text-mute">
                        {new Date(r.sale_date).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-medium tabular-nums text-success-deep">
                        ${(r.sale_price_cents / 100).toLocaleString()}
                      </span>
                    </div>
                    {r.trim_notes && (
                      <p className="mt-1 text-xs text-ink-soft">
                        {r.trim_notes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-mute">
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-ink"
                      >
                        {r.source_name}
                        {r.lot_number ? ` · ${r.lot_number}` : ""}
                      </a>
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="text-[11px] font-medium uppercase tracking-wider text-red hover:underline"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Add form */}
        <section className="mt-12">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-mute">
            Add a comparable
          </h2>
          <form
            onSubmit={onAdd}
            className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-rule bg-surface p-6 sm:grid-cols-2"
          >
            <Input
              label="Sale date"
              type="date"
              value={form.saleDate}
              onChange={(v) => setForm({ ...form, saleDate: v })}
              required
            />
            <Input
              label="Sale price (USD)"
              type="number"
              step="0.01"
              value={form.salePriceUsd}
              onChange={(v) => setForm({ ...form, salePriceUsd: v })}
              placeholder="384500"
              required
            />
            <Input
              label="Year + make + model"
              value={form.yearMakeModel}
              onChange={(v) => setForm({ ...form, yearMakeModel: v })}
              placeholder="2024 Ferrari 296 GTB"
              className="sm:col-span-2"
              required
            />
            <Input
              label="Trim / notes (optional)"
              value={form.trimNotes}
              onChange={(v) => setForm({ ...form, trimNotes: v })}
              placeholder="Assetto Fiorano, 9,200 mi, Rosso Corsa"
              className="sm:col-span-2"
            />
            <Input
              label="Source name"
              value={form.sourceName}
              onChange={(v) => setForm({ ...form, sourceName: v })}
              placeholder="RM Sotheby's"
              required
            />
            <Input
              label="Lot number (optional)"
              value={form.lotNumber}
              onChange={(v) => setForm({ ...form, lotNumber: v })}
              placeholder="Lot 174"
            />
            <Input
              label="Source URL"
              type="url"
              value={form.sourceUrl}
              onChange={(v) => setForm({ ...form, sourceUrl: v })}
              placeholder="https://rmsothebys.com/auctions/..."
              className="sm:col-span-2"
              required
            />
            <Input
              label="Curator notes (optional)"
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              placeholder="Hammered above estimate; clean Carfax."
              className="sm:col-span-2"
            />
            {error && (
              <div className="rounded-lg border border-red/40 bg-red/5 p-3 text-sm text-ink sm:col-span-2">
                {error}
              </div>
            )}
            <div className="flex justify-end sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-red disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add comparable"}
              </button>
            </div>
          </form>
        </section>
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
  step?: string;
  className?: string;
}) {
  return (
    <label className={`block ${props.className ?? ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
        {props.label}
      </span>
      <input
        type={props.type ?? "text"}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        className="mt-1 block w-full rounded-lg border border-rule bg-cream-2/40 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
      />
    </label>
  );
}
