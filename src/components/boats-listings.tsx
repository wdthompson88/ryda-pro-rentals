"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BOATS,
  formatUSD,
  computeBoatShareEconomics,
  computeBoatRentalEconomics,
  BOATS_HOLDING_YEARS,
  type Boat,
} from "@/lib/boat-data";
import { Reveal, RevealStagger } from "@/components/reveal";

// motion(Link) + spring hover, parallels VehicleCard.
const MotionLink = motion.create(Link);

// Boats power-filter listing, parallel of components/portfolio-listings.tsx.
// Same UI shape (search + filter dropdowns + sort + summary strip + card
// grid), same VehicleCard depth ported as BoatCard. The two listings
// pages should now read identically across cars and boats verticals.

type SortOption =
  | "featured"
  | "price-low"
  | "price-high"
  | "year-new"
  | "year-old"
  | "length-high"
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
  { value: "length-high", label: "Length: longest" },
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

export function BoatsListings() {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string>(ANY);
  const [market, setMarket] = useState<string>(ANY);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<string>(ANY);
  const [sort, setSort] = useState<SortOption>("featured");

  const brands = useMemo(
    () => Array.from(new Set(BOATS.map((b) => b.brand))).sort(),
    [],
  );
  const markets = useMemo(
    () => Array.from(new Set(BOATS.map((b) => b.market))).sort(),
    [],
  );
  const categories = useMemo(
    () => Array.from(new Set(BOATS.map((b) => b.category))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    return BOATS.filter((b) => {
      if (
        query &&
        !`${b.brand} ${b.model} ${b.name} ${b.market} ${b.category}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false;
      }
      if (brand !== ANY && b.brand !== brand) return false;
      if (market !== ANY && b.market !== market) return false;
      if (status === "available" && b.sharesAvailable === 0) return false;
      if (status === "sold" && b.sharesAvailable > 0) return false;
      if (category !== ANY && b.category !== category) return false;
      return true;
    });
  }, [query, brand, market, status, category]);

  const visible = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "price-low":
        arr.sort((a, b) => a.pricePerShare - b.pricePerShare);
        break;
      case "price-high":
        arr.sort((a, b) => b.pricePerShare - a.pricePerShare);
        break;
      case "year-new":
        arr.sort((a, b) => b.year - a.year);
        break;
      case "year-old":
        arr.sort((a, b) => a.year - b.year);
        break;
      case "length-high":
        arr.sort((a, b) => b.lengthFt - a.lengthFt);
        break;
      case "available":
        arr.sort((a, b) => b.sharesAvailable - a.sharesAvailable);
        break;
      default:
        // featured = data order
        break;
    }
    return arr;
  }, [filtered, sort]);

  const totalListed = visible.length;
  const totalAvailableShares = visible.reduce(
    (n, b) => n + b.sharesAvailable,
    0,
  );
  const combinedSticker = visible.reduce((n, b) => n + b.fullPrice, 0);

  const anyFilterActive =
    query !== "" ||
    brand !== ANY ||
    market !== ANY ||
    status !== "all" ||
    category !== ANY ||
    sort !== "featured";

  function clearAll() {
    setQuery("");
    setBrand(ANY);
    setMarket(ANY);
    setStatus("all");
    setCategory(ANY);
    setSort("featured");
  }

  return (
    <section>
      {/* Filter bar */}
      <div className="border-y border-rule bg-cream-2/40">
        <div className="mx-auto max-w-7xl px-6 py-5 sm:px-10">
          <label className="block text-sm">
            <span className="sr-only">Search the boats portfolio</span>
            <div className="flex h-12 items-center rounded-full border border-rule bg-surface px-5 text-ink transition-colors focus-within:border-marine">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden
                className="mr-2 shrink-0 text-mute"
              >
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try Wajer, Pershing, Miami, Day Cruiser…"
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
              label="Type"
              value={category}
              onChange={setCategory}
              options={[
                { value: ANY, label: "All types" },
                ...categories.map((c) => ({ value: c, label: c })),
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
              {totalListed === 1 ? "hull" : "hulls"} listed
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
              {formatUSD(combinedSticker)}
            </span>
          </p>
        </div>
      </div>

      {/* Card grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-rule bg-surface p-12 text-center">
            <p className="font-display text-xl text-ink">
              No hulls match those filters.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Try widening your search or{" "}
              <button
                type="button"
                onClick={clearAll}
                className="text-marine underline-offset-4 hover:underline"
              >
                reset all filters
              </button>
              .
            </p>
          </div>
        ) : (
          <RevealStagger
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            staggerMs={60}
          >
            {visible.map((b) => (
              <BoatCard key={b.slug} boat={b} />
            ))}
          </RevealStagger>
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

// BoatCard, full-depth listing card, mirrors components/portfolio-listings.tsx
// VehicleCard structure:
//   1. Hero image with brand badge top-left + status pill top-right
//   2. Title (boat name) + subtitle (year · category)
//   3. Listing window
//   4. 2x2 spec grid (Power / Length / Top speed / Capacity)
//   5. Location chip
//   6. Price block (per share + instead-of) + savings line
//   7. Charter opt-in 2-yr math box (green when net positive)
//   8. Footer: shares-left text + "View details →"
function BoatCard({ boat: b }: { boat: Boat }) {
  const prefersReduce = useReducedMotion();
  const isSold = b.sharesAvailable === 0;
  const stickerSavings = b.fullPrice - b.pricePerShare;
  const econ = computeBoatShareEconomics(b);
  const rental = computeBoatRentalEconomics(b);
  const rentalIncome = rental.perShareTotalIncome;
  const rentedNet = econ.netCost - rentalIncome;
  const rentedProfit = -rentedNet;
  const rentedReturnPct =
    econ.totalSpend === 0 ? 0 : (rentedProfit / econ.totalSpend) * 100;
  const rentedIsPositive = rentedProfit > 0;

  return (
    <MotionLink
      href={`/boats/portfolio/${b.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface hover:border-ink/40"
      whileHover={
        prefersReduce ? undefined : { y: -3, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.18)" }
      }
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      {/* Image with brand badge + status. Wrapper applies the
          render-time crop (boats source photos have similar empty
          backgrounds to cars). See portfolio-listings.tsx
          VehicleCard for the full reasoning on the two-layer
          transform structure. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
        <div className="absolute inset-0 origin-center scale-[1.14] transition-transform duration-500 group-hover:scale-[1.18]">
          <Image
            src={b.hero}
            alt={`${b.year} ${b.name}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
            style={{
              objectPosition: b.imagePosition ?? "center 55%",
              transform: b.flipImage ? "scaleX(-1)" : undefined,
            }}
          />
        </div>

        {/* Brand badge top-left */}
        <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur">
          {b.brand}
        </span>

        {/* Status pill top-right (marine accent on boats; role+aria
            so it's announced as state, not just visual color). */}
        <span
          role="status"
          aria-label={isSold ? "Status: Sold out" : "Status: Available"}
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur ${
            isSold ? "bg-ink/80 text-cream" : "bg-marine/95 text-cream"
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
            {b.name}
          </h3>
          <p className="mt-1 text-xs text-mute">
            {b.year} · {b.category}
          </p>
        </div>

        {/* Listing period */}
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-mute">
          Listing window
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {formatListingPeriod(b.listingStart, b.listingEnd)}
        </p>

        {/* Specs grid 2x2, boats analog to the cars Power/Cyl/Drive/0-60 */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-rule bg-cream-2/40 p-3">
          <Spec label="Power" value={`${b.totalHp.toLocaleString()} hp`} />
          <Spec label="Length" value={`${b.lengthFt}′`} />
          <Spec label="Top speed" value={`${b.maxSpeedKnots} kts`} />
          <Spec label="Capacity" value={`${b.capacity} guests`} />
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
          <span>{b.hailingPort}</span>
        </div>

        {/* Price block */}
        <div className="mt-5 border-t border-rule pt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                Per share
              </p>
              <p className="font-display text-2xl text-ink tabular-nums">
                {formatUSD(b.pricePerShare)}
              </p>
              <p className="mt-1 text-[11px] text-ink-soft tabular-nums">
                Net cost:{" "}
                <span className="font-medium text-ink">
                  ~{formatUSD(econ.netCost)}
                </span>{" "}
                after {BOATS_HOLDING_YEARS}-yr sale of vessel
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                Instead of
              </p>
              <p className="text-sm text-mute line-through tabular-nums">
                {formatUSD(b.fullPrice)}
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
          {b.rentalAvailable && rental.perShareAnnualIncome > 0 ? (
            <div
              className={`mt-3 rounded-lg border p-3 ${
                rentedIsPositive
                  ? "border-success/40 bg-success/5"
                  : "border-rule bg-cream-2/40"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-mute">
                With charter opt-in · {BOATS_HOLDING_YEARS}-yr math
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
                  label={`${BOATS_HOLDING_YEARS}-yr carrying cost`}
                  value={formatUSD(econ.totalCarrying)}
                  cost
                />
                <MathRow
                  sign="+"
                  label={`Projected charter income (${BOATS_HOLDING_YEARS} yrs)`}
                  value={formatUSD(rentalIncome)}
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
                    ? "border-success/30"
                    : "border-rule"
                }`}
              >
                <span className="font-medium text-ink">
                  Net ({BOATS_HOLDING_YEARS} yrs)
                </span>
                <span
                  className={`font-display text-base tabular-nums ${
                    rentedIsPositive ? "text-success" : "text-red"
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
              : `${b.sharesAvailable} of ${b.shares} shares left`}
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-marine transition-colors group-hover:text-marine-deep">
            View details
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </div>
    </MotionLink>
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
    ? "text-success"
    : cost
      ? "text-red"
      : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-2">
        <span className={`tabular-nums ${tone}`}>{sign}</span>
        <span>{label}</span>
      </div>
      <span className={`tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
