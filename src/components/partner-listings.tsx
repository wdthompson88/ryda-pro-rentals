"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PARTNER_VEHICLES,
  brandTint,
  type PartnerVehicle,
} from "@/lib/partner-fleet";
import { formatUSD } from "@/lib/market-data";

type SortOption =
  | "featured"
  | "price-low"
  | "price-high"
  | "savings";

const ANY = "__any__";

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: ANY, label: "All types" },
  { value: "Exotic", label: "Exotic" },
  { value: "Convertible", label: "Convertible" },
  { value: "SUV", label: "SUV" },
  { value: "Sedan", label: "Sedan" },
  { value: "7-Seater", label: "7-Seater" },
  { value: "EV", label: "EV" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: low → high" },
  { value: "price-high", label: "Price: high → low" },
  { value: "savings", label: "Biggest discount" },
];

const PRICE_BUCKETS: {
  value: string;
  label: string;
  test?: (rate: number) => boolean;
}[] = [
  { value: ANY, label: "Any price" },
  { value: "u200", label: "Under $200/day", test: (r) => r < 200 },
  { value: "200-500", label: "$200 – $500/day", test: (r) => r >= 200 && r < 500 },
  { value: "500-1000", label: "$500 – $1,000/day", test: (r) => r >= 500 && r < 1_000 },
  { value: "1000+", label: "$1,000+/day", test: (r) => r >= 1_000 },
];

export function PartnerListings() {
  const [make, setMake] = useState<string>(ANY);
  const [category, setCategory] = useState<string>(ANY);
  const [priceBucket, setPriceBucket] = useState<string>(ANY);
  const [sort, setSort] = useState<SortOption>("featured");

  const makes = useMemo(
    () =>
      Array.from(new Set(PARTNER_VEHICLES.map((v) => v.make))).sort(),
    [],
  );

  const filtered: PartnerVehicle[] = useMemo(() => {
    return PARTNER_VEHICLES.filter((v) => {
      if (make !== ANY && v.make !== make) return false;
      if (category !== ANY && v.category !== category) return false;
      if (priceBucket !== ANY) {
        const bucket = PRICE_BUCKETS.find((b) => b.value === priceBucket);
        if (bucket?.test && !bucket.test(v.dailyRate)) return false;
      }
      return true;
    });
  }, [make, category, priceBucket]);

  const visible = useMemo(() => {
    const out = [...filtered];
    switch (sort) {
      case "price-low":
        out.sort((a, b) => a.dailyRate - b.dailyRate);
        break;
      case "price-high":
        out.sort((a, b) => b.dailyRate - a.dailyRate);
        break;
      case "savings":
        out.sort((a, b) => {
          const aPct = (a.regularRate - a.dailyRate) / a.regularRate;
          const bPct = (b.regularRate - b.dailyRate) / b.regularRate;
          return bPct - aPct;
        });
        break;
      case "featured":
      default:
        // Exotics first, then by price descending (showcase top-tier first)
        out.sort((a, b) => {
          const aTier = a.category === "Exotic" ? 0 : 1;
          const bTier = b.category === "Exotic" ? 0 : 1;
          if (aTier !== bTier) return aTier - bTier;
          return b.dailyRate - a.dailyRate;
        });
    }
    return out;
  }, [filtered, sort]);

  const totalListed = visible.length;
  const minRate = visible.reduce(
    (acc, v) => Math.min(acc, v.dailyRate),
    Number.MAX_SAFE_INTEGER,
  );
  const maxRate = visible.reduce((acc, v) => Math.max(acc, v.dailyRate), 0);

  const anyFilterActive =
    make !== ANY || category !== ANY || priceBucket !== ANY;

  function clearAll() {
    setMake(ANY);
    setCategory(ANY);
    setPriceBucket(ANY);
    setSort("featured");
  }

  return (
    <section>
      {/* Filter bar */}
      <div className="border-b border-rule bg-cream-2/50">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:px-10">
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect
              label="Make"
              value={make}
              onChange={setMake}
              options={[
                { value: ANY, label: "All makes" },
                ...makes.map((m) => ({ value: m, label: m })),
              ]}
            />
            <FilterSelect
              label="Type"
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
            />
            <FilterSelect
              label="Price"
              value={priceBucket}
              onChange={setPriceBucket}
              options={PRICE_BUCKETS.map((b) => ({
                value: b.value,
                label: b.label,
              }))}
            />

            <div className="ml-auto flex items-end gap-3">
              {anyFilterActive ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-10 rounded-full border border-rule bg-surface px-4 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  Reset
                </button>
              ) : null}
              <FilterSelect
                label="Sort"
                value={sort}
                onChange={(v) => setSort(v as SortOption)}
                options={SORT_OPTIONS}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Counter strip */}
      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-4 px-6 py-5 sm:px-10">
          <p className="text-sm text-ink-soft">
            <span className="font-display text-xl text-ink tabular-nums">
              {totalListed}
            </span>
            <span className="ml-2">
              {totalListed === 1 ? "vehicle" : "vehicles"} available · Miami
            </span>
          </p>
          {totalListed > 0 ? (
            <p className="text-sm text-ink-soft tabular-nums">
              From{" "}
              <span className="font-display text-xl text-ink">
                {formatUSD(minRate)}
              </span>{" "}
              to{" "}
              <span className="font-display text-xl text-ink">
                {formatUSD(maxRate)}
              </span>
              <span className="ml-1 text-mute">/ day</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* Card grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-rule bg-surface p-12 text-center">
            <p className="font-display text-xl text-ink">
              No vehicles match those filters.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Try widening your search or{" "}
              <button
                type="button"
                onClick={clearAll}
                className="text-red underline-offset-4 hover:underline"
              >
                reset all filters
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((v) => (
              <PartnerCard key={v.slug} vehicle={v} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-full border border-rule bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path fill=%22none%22 stroke=%22%239A9590%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M3 5l3 3 3-3%22/></svg>')] bg-[right_0.85rem_center] bg-no-repeat px-4 pr-9 text-sm text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PartnerCard({ vehicle: v }: { vehicle: PartnerVehicle }) {
  const savings = v.regularRate - v.dailyRate;
  const savingsPct = Math.round((savings / v.regularRate) * 100);
  const tint = brandTint(v.make);

  // Internal inquiry URL — keeps the customer relationship with RYDA.
  // White-label arrangement: RYDA brand, RYDA inquiry, RYDA handles the
  // booking with operations partner behind the scenes.
  const inquiryHref = `/contact?type=Rental&note=${encodeURIComponent(
    `Rental inquiry: ${v.make} ${v.model}${v.year ? ` (${v.year})` : ""} · ${v.market}`,
  )}#form`;

  return (
    <Link
      href={inquiryHref}
      className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-lg"
    >
      {/* Image with badges */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden"
        style={{ backgroundColor: tint }}
      >
        {v.hero ? (
          <Image
            src={v.hero}
            alt={`${v.make} ${v.model}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          // Placeholder for cars without confirmed photos yet
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.08), transparent 50%)",
              }}
            />
            <div className="relative text-center text-cream/90">
              <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">
                {v.make}
              </p>
              <p className="mt-1 font-display text-xl">{v.model}</p>
            </div>
          </div>
        )}

        {/* Brand badge top-left */}
        <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur">
          {v.make}
        </span>

        {/* Discount badge top-right (if meaningful) */}
        {savingsPct >= 10 ? (
          <span className="absolute right-3 top-3 rounded-full bg-red/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cream backdrop-blur">
            Save {savingsPct}%
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
            {v.make}
            {v.year ? ` · ${v.year}` : ""}
          </p>
          <h3 className="mt-1 font-display text-xl text-ink leading-tight">
            {v.model}
          </h3>
          <p className="mt-1 text-xs text-mute">{v.category}</p>
        </div>

        {/* Location + miles */}
        <div className="mt-4 flex items-center gap-3 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <svg
              width="11"
              height="13"
              viewBox="0 0 12 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M6 13C6 13 11 8.5 11 5.5C11 2.46243 8.76142 0 6 0C3.23858 0 1 2.46243 1 5.5C1 8.5 6 13 6 13Z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle
                cx="6"
                cy="5.5"
                r="1.6"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            {v.market}
          </span>
          {v.milesIncluded ? (
            <span className="text-mute">· {v.milesIncluded} included</span>
          ) : null}
        </div>

        {/* Price block */}
        <div className="mt-5 border-t border-rule pt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                Daily rate
              </p>
              <p className="font-display text-2xl text-ink tabular-nums">
                {formatUSD(v.dailyRate)}
                <span className="ml-1 text-sm text-mute">/day</span>
              </p>
            </div>
            {savings > 0 ? (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                  Regular
                </p>
                <p className="text-sm text-mute line-through tabular-nums">
                  {formatUSD(v.regularRate)}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-ink-soft">100 mi/day included</p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red transition-colors group-hover:text-red-deep">
            Inquire to book
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
