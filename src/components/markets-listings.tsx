"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  VEHICLES,
  formatUSD,
  computeShareEconomics,
  computeRentalEconomics,
  HOLDING_YEARS,
  type Vehicle,
} from "@/lib/market-data";

type SortOption =
  | "featured"
  | "price-low"
  | "price-high"
  | "year-new"
  | "year-old"
  | "power-high"
  | "available";

type StatusFilter = "all" | "available" | "sold";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: low → high" },
  { value: "price-high", label: "Price: high → low" },
  { value: "year-new", label: "Year: newest" },
  { value: "year-old", label: "Year: oldest" },
  { value: "power-high", label: "Power: highest" },
  { value: "available", label: "Most shares left" },
];

const ANY = "__any__";

function formatListingPeriod(start: string, end: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(start)} → ${fmt(end)}`;
}

function powerToNumber(spec: string) {
  // "830 hp" → 830 ; "1,080 hp" → 1080
  const cleaned = spec.replace(/,/g, "");
  const m = cleaned.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function MarketsListings() {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string>(ANY);
  const [market, setMarket] = useState<string>(ANY);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [cylinders, setCylinders] = useState<string>(ANY);
  const [category, setCategory] = useState<string>(ANY);
  const [drive, setDrive] = useState<string>(ANY);
  const [sort, setSort] = useState<SortOption>("featured");

  // Build dropdown options from data
  const brands = useMemo(
    () => Array.from(new Set(VEHICLES.map((v) => v.brand))).sort(),
    [],
  );
  const markets = useMemo(
    () => Array.from(new Set(VEHICLES.map((v) => v.market))).sort(),
    [],
  );
  const cylinderOptions = useMemo(
    () =>
      Array.from(new Set(VEHICLES.map((v) => v.cylinders))).sort(
        (a, b) => a - b,
      ),
    [],
  );
  const categories = useMemo(
    () => Array.from(new Set(VEHICLES.map((v) => v.category))).sort(),
    [],
  );

  // Filter
  const filtered: Vehicle[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VEHICLES.filter((v) => {
      // Free-text search across name, brand, market, symbol — covers
      // most of how a buyer would mention the car.
      if (q) {
        const haystack =
          `${v.name} ${v.brand} ${v.market} ${v.symbol} ${v.year}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (brand !== ANY && v.brand !== brand) return false;
      if (market !== ANY && v.market !== market) return false;
      if (status === "available" && v.sharesAvailable === 0) return false;
      if (status === "sold" && v.sharesAvailable > 0) return false;
      if (cylinders !== ANY && String(v.cylinders) !== cylinders) return false;
      if (category !== ANY && v.category !== category) return false;
      if (drive !== ANY && v.drive !== drive) return false;
      return true;
    });
  }, [query, brand, market, status, cylinders, category, drive]);

  // Sort
  const visible = useMemo(() => {
    const out = [...filtered];
    switch (sort) {
      case "price-low":
        out.sort((a, b) => a.pricePerShare - b.pricePerShare);
        break;
      case "price-high":
        out.sort((a, b) => b.pricePerShare - a.pricePerShare);
        break;
      case "year-new":
        out.sort((a, b) => b.year - a.year);
        break;
      case "year-old":
        out.sort((a, b) => a.year - b.year);
        break;
      case "power-high":
        out.sort(
          (a, b) => powerToNumber(b.specs.power) - powerToNumber(a.specs.power),
        );
        break;
      case "available":
        out.sort((a, b) => b.sharesAvailable - a.sharesAvailable);
        break;
      case "featured":
      default:
        // Available first, then by per-share price ascending
        out.sort((a, b) => {
          const aAvail = a.sharesAvailable > 0 ? 0 : 1;
          const bAvail = b.sharesAvailable > 0 ? 0 : 1;
          if (aAvail !== bAvail) return aAvail - bAvail;
          return a.pricePerShare - b.pricePerShare;
        });
    }
    return out;
  }, [filtered, sort]);

  // Counter
  const totalListed = visible.length;
  const totalSum = visible.reduce((acc, v) => acc + v.fullPrice, 0);
  const totalAvailableShares = visible.reduce(
    (acc, v) => acc + v.sharesAvailable,
    0,
  );

  const anyFilterActive =
    query.trim().length > 0 ||
    brand !== ANY ||
    market !== ANY ||
    status !== "all" ||
    cylinders !== ANY ||
    category !== ANY ||
    drive !== ANY;

  function clearAll() {
    setQuery("");
    setBrand(ANY);
    setMarket(ANY);
    setStatus("all");
    setCylinders(ANY);
    setCategory(ANY);
    setDrive(ANY);
    setSort("featured");
  }

  return (
    <section>
      {/* Filter bar */}
      <div className="border-b border-rule bg-cream-2/50">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:px-10">
          {/* Search */}
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
              Search
            </span>
            <div className="mt-1.5 flex h-11 items-center rounded-full border border-rule bg-surface px-4 transition-colors focus-within:border-ink">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
                className="mr-2 shrink-0 text-mute"
              >
                <circle
                  cx="6"
                  cy="6"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M9.5 9.5L13 13"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try Ferrari, Miami, Coupe…"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-mute focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="ml-2 shrink-0 rounded-full px-2 text-xs text-mute hover:text-ink"
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>
          </label>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <FilterSelect
              label="Brand"
              value={brand}
              onChange={setBrand}
              options={[
                { value: ANY, label: "All brands" },
                ...brands.map((b) => ({ value: b, label: b })),
              ]}
            />
            <FilterSelect
              label="Location"
              value={market}
              onChange={setMarket}
              options={[
                { value: ANY, label: "All locations" },
                ...markets.map((m) => ({ value: m, label: m })),
              ]}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              label="Cylinders"
              value={cylinders}
              onChange={setCylinders}
              options={[
                { value: ANY, label: "Any cylinder" },
                ...cylinderOptions.map((c) => ({
                  value: String(c),
                  label: c === 0 ? "Electric" : `${c} cyl`,
                })),
              ]}
            />
            <FilterSelect
              label="Type"
              value={category}
              onChange={setCategory}
              options={[
                { value: ANY, label: "All types" },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
            <FilterSelect
              label="Drive"
              value={drive}
              onChange={setDrive}
              options={[
                { value: ANY, label: "Any drive" },
                { value: "RWD", label: "RWD" },
                { value: "AWD", label: "AWD" },
              ]}
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

      {/* Counter / summary strip */}
      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-4 px-6 py-5 sm:px-10">
          <p className="text-sm text-ink-soft">
            <span className="font-display text-xl text-ink tabular-nums">
              {totalListed}
            </span>
            <span className="ml-2">
              {totalListed === 1 ? "vehicle" : "vehicles"} listed
            </span>
            {totalAvailableShares > 0 ? (
              <span className="ml-2 text-mute">
                · {totalAvailableShares} shares available
              </span>
            ) : null}
          </p>
          <p className="text-sm text-ink-soft">
            Combined sticker{" "}
            <span className="ml-1 font-display text-xl text-ink tabular-nums">
              {formatUSD(totalSum)}
            </span>
          </p>
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
              <VehicleCard key={v.symbol} vehicle={v} />
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

function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  const isSold = v.sharesAvailable === 0;
  const stickerSavings = v.fullPrice - v.pricePerShare;
  const econ = computeShareEconomics(v);
  const rental = computeRentalEconomics(v);
  // Rental opt-in: profit when inflows (rental + sale) exceed outflows
  // (share price + carrying). Return % is profit / capital deployed.
  const rentalIncome2yr = rental.perShareTotalIncome;
  const rentedNet = econ.netCost - rentalIncome2yr;       // < 0 when you profit
  const rentedProfit = -rentedNet;                        // positive when you profit
  const rentedReturnPct =
    econ.totalSpend === 0 ? 0 : (rentedProfit / econ.totalSpend) * 100;
  const rentedIsPositive = rentedProfit > 0;

  return (
    <Link
      href={`/markets/${v.symbol}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-lg"
    >
      {/* Image with brand badge + status */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
        <Image
          src={v.hero}
          alt={`${v.year} ${v.name}`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            v.flipImage ? "-scale-x-100" : ""
          }`}
          style={{ objectPosition: v.imagePosition ?? "center" }}
        />

        {/* Brand badge top-left */}
        <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur">
          {v.brand}
        </span>

        {/* Status pill top-right */}
        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur ${
            isSold
              ? "bg-mute/90 text-cream"
              : "bg-red/95 text-cream"
          }`}
        >
          {isSold ? "Sold out" : "Available"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title + subtitle */}
        <div>
          <h3 className="font-display text-xl text-ink leading-tight">
            {v.name}
          </h3>
          <p className="mt-1 text-xs text-mute">
            {v.year} · {v.category}
          </p>
        </div>

        {/* Listing period */}
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-mute">
          Listing window
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {formatListingPeriod(v.listingStart, v.listingEnd)}
        </p>

        {/* Specs grid 2x2 */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-rule bg-cream-2/40 p-3">
          <Spec label="Power" value={v.specs.power} />
          <Spec
            label="Cylinder"
            value={v.cylinders === 0 ? "Electric" : `${v.cylinders} cyl`}
          />
          <Spec label="Drive" value={v.drive} />
          <Spec label="0–60" value={v.specs.zeroToSixty} />
        </div>

        {/* Location chip */}
        <div className="mt-4 flex items-center gap-2 text-xs text-ink-soft">
          <span aria-hidden className="inline-block">
            <svg
              width="12"
              height="14"
              viewBox="0 0 12 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
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
          </span>
          <span>{v.market}, USA</span>
        </div>

        {/* Price block */}
        <div className="mt-5 border-t border-rule pt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                Per share
              </p>
              <p className="font-display text-2xl text-ink tabular-nums">
                {formatUSD(v.pricePerShare)}
              </p>
              <p className="mt-1 text-[11px] text-ink-soft tabular-nums">
                Net cost:{" "}
                <span className="font-medium text-ink">
                  ~{formatUSD(econ.netCost)}
                </span>{" "}
                after {HOLDING_YEARS}-yr sale of vehicle
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                Instead of
              </p>
              <p className="text-sm text-mute line-through tabular-nums">
                {formatUSD(v.fullPrice)}
              </p>
              <p className="mt-1 text-[11px] text-mute tabular-nums">
                ~{formatUSD(econ.netPerDay)}/day
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-mute">
            You save {formatUSD(stickerSavings)} vs full ownership · ~30
            days/yr per share
          </p>
          {v.rentalAvailable && rental.perShareAnnualIncome > 0 ? (
            <div
              className={`mt-3 rounded-lg border p-3 ${
                rentedIsPositive
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-rule bg-cream-2/40"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-mute">
                With rental opt-in · 2-yr math
              </p>
              <dl className="mt-2 space-y-1 text-[11px] tabular-nums text-ink-soft">
                <MathRow
                  sign="−"
                  label="Share price (your buy-in)"
                  value={formatUSD(econ.buyIn)}
                  cost
                />
                <MathRow
                  sign="−"
                  label="2-yr carrying cost"
                  value={formatUSD(econ.totalCarrying)}
                  cost
                />
                <MathRow
                  sign="+"
                  label="Projected rental income (2 yrs)"
                  value={formatUSD(rentalIncome2yr)}
                  positive
                />
                <MathRow
                  sign="+"
                  label={`Projected sale price (${100 - econ.depreciationPct}% of buy-in)`}
                  value={formatUSD(econ.estimatedResale)}
                  positive
                />
              </dl>
              <div
                className={`mt-2 flex items-baseline justify-between border-t pt-2 text-xs ${
                  rentedIsPositive
                    ? "border-emerald-500/30"
                    : "border-rule"
                }`}
              >
                <span className="font-medium text-ink">
                  Net ({HOLDING_YEARS} yrs)
                </span>
                <span
                  className={`font-display text-base tabular-nums ${
                    rentedIsPositive ? "text-emerald-600" : "text-red"
                  }`}
                >
                  = {rentedIsPositive ? "+ " : "− "}
                  {formatUSD(Math.abs(rentedProfit))}
                  <span className="ml-1.5 align-baseline text-[10px] font-normal opacity-75">
                    {rentedIsPositive ? "+" : ""}
                    {rentedReturnPct.toFixed(2)}%
                  </span>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* CTA */}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-ink-soft">
            {isSold
              ? "Join waitlist"
              : `${v.sharesAvailable} of ${v.shares} shares left`}
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red transition-colors group-hover:text-red-deep">
            View details
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-mute">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function MathRow({
  sign,
  label,
  value,
  positive,
  cost,
}: {
  sign: "+" | "−";
  label: string;
  value: string;
  positive?: boolean;
  cost?: boolean;
}) {
  const tone = positive
    ? "text-emerald-600"
    : cost
      ? "text-red"
      : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="flex items-baseline gap-1.5">
        <span className={`w-2 text-center font-medium ${tone}`}>{sign}</span>
        <span>{label}</span>
      </span>
      <span className={`tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
