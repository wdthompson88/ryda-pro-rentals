"use client";

// /admin/vehicle-enrichment — VIN decode tool. Paste a VIN, get
// vPIC's decoded specs + recall count, optionally hit CarsXE for
// the richer spec sheet.
//
// Free for vPIC + recalls. CarsXE returns mock data unless
// CARSXE_API_KEY is set.

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";

type DecodeResponse = {
  decoded: {
    vin: string;
    year: number | null;
    make: string | null;
    model: string | null;
    trim: string | null;
    bodyClass: string | null;
    engineCylinders: number | null;
    engineDisplacementL: number | null;
    fuelType: string | null;
    driveType: string | null;
    transmission: string | null;
    manufacturer: string | null;
    plantCity: string | null;
    plantCountry: string | null;
  };
  recallCount: number;
  recalls: Array<{
    campaignNumber: string;
    reportDate: string;
    component: string;
    summary: string;
  }>;
  carsxe: {
    hpHorsepower: number | null;
    torqueFtLbs: number | null;
    zeroToSixtyMph: number | null;
    topSpeedMph: number | null;
    msrpUsd: number | null;
    raw: { __mock?: boolean };
  } | null;
  carsxeMode: "live" | "mock";
};

export default function VehicleEnrichmentPage() {
  const [vin, setVin] = useState("");
  const [data, setData] = useState<DecodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await authedFetch("/api/admin/vin-decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin: vin.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decode failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Admin · Vehicle enrichment
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">VIN decode</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">
          Paste a 17-character VIN to pull canonical specs from NHTSA
          vPIC (free, federal data) + active recall count. Used when
          adding a new vehicle to the fleet — saves typing, prevents
          spec typos.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 flex flex-wrap items-end gap-3"
        >
          <label className="flex-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
              VIN
            </span>
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              required
              minLength={17}
              maxLength={17}
              placeholder="ZFF99SMA0R0000000"
              className="mt-1 block w-full rounded-lg border border-rule bg-cream-2/40 px-3 py-2 text-sm font-mono uppercase text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-red disabled:opacity-50"
          >
            {loading ? "Decoding..." : "Decode"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-xl border border-red/40 bg-red/5 p-4 text-sm text-ink">
            {error}
          </div>
        )}

        {data && (
          <div className="mt-10 space-y-8">
            {/* Decoded specs */}
            <section className="rounded-2xl border border-rule bg-surface p-6">
              <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-red">
                vPIC decoded specs
              </h2>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                {Object.entries(data.decoded)
                  .filter(([k]) => k !== "vin" && k !== "raw")
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-mute">
                        {k.replace(/([A-Z])/g, " $1").trim()}
                      </dt>
                      <dd className="mt-0.5 text-ink">
                        {v ?? <span className="italic text-mute">—</span>}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>

            {/* Recalls */}
            <section className="rounded-2xl border border-rule bg-surface p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-red">
                  Recall status
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider ${
                    data.recallCount === 0
                      ? "bg-success/20 text-success-deep"
                      : "bg-red/15 text-red"
                  }`}
                >
                  {data.recallCount} open
                </span>
              </div>
              {data.recallCount === 0 ? (
                <p className="mt-3 text-sm italic text-mute">
                  No active NHTSA recalls for this year/make/model.
                </p>
              ) : (
                <ul className="mt-4 space-y-3 text-sm">
                  {data.recalls.map((r) => (
                    <li
                      key={r.campaignNumber}
                      className="rounded-lg border border-rule p-3"
                    >
                      <p className="font-medium text-ink">{r.component}</p>
                      <p className="mt-1 text-xs text-ink-soft">{r.summary}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-mute">
                        Campaign {r.campaignNumber} ·{" "}
                        {new Date(r.reportDate).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* CarsXE (if live) */}
            {data.carsxe && !data.carsxe.raw.__mock && (
              <section className="rounded-2xl border border-marine/40 bg-marine/5 p-6">
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-marine">
                  CarsXE spec sheet
                </h2>
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                  <Fact label="Horsepower" value={data.carsxe.hpHorsepower} unit="hp" />
                  <Fact label="Torque" value={data.carsxe.torqueFtLbs} unit="lb-ft" />
                  <Fact
                    label="0–60 mph"
                    value={data.carsxe.zeroToSixtyMph}
                    unit="s"
                  />
                  <Fact
                    label="Top speed"
                    value={data.carsxe.topSpeedMph}
                    unit="mph"
                  />
                  <Fact
                    label="MSRP"
                    value={data.carsxe.msrpUsd}
                    prefix="$"
                  />
                </dl>
              </section>
            )}
            {data.carsxeMode === "mock" && (
              <p className="text-xs italic text-mute">
                CarsXE is in mock mode — set CARSXE_API_KEY in Vercel env
                to fetch the real spec sheet.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function Fact({
  label,
  value,
  unit,
  prefix,
}: {
  label: string;
  value: number | null;
  unit?: string;
  prefix?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-mute">
        {label}
      </dt>
      <dd className="mt-0.5 text-ink">
        {value !== null ? (
          <>
            {prefix}
            {value.toLocaleString()}
            {unit && <span className="ml-1 text-mute">{unit}</span>}
          </>
        ) : (
          <span className="italic text-mute">—</span>
        )}
      </dd>
    </div>
  );
}
