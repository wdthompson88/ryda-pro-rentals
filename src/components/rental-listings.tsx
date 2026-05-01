"use client";

// Unified rental listings — RYDA co-ownership fleet + extended Miami
// inventory in ONE filterable card grid. Each card links to a detail
// page at /rent/[slug] regardless of which fleet it came from. The
// route handler resolves slug → Vehicle (RYDA) or PartnerVehicle.

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  VEHICLES,
  formatUSD,
  type Vehicle,
} from "@/lib/market-data";
import {
  PARTNER_VEHICLES,
  brandTint,
  getPartnerHero,
  type PartnerVehicle,
} from "@/lib/partner-fleet";

// ─────────────────────────────────────────────────────────────────────────
// Normalized listing shape
// ─────────────────────────────────────────────────────────────────────────

type RentalListing = {
  slug: string;             // route param: vehicle.symbol.toLowerCase() OR partner.slug
  kind: "ryda" | "partner";
  make: string;
  model: string;
  year?: number;
  category: string;
  dailyRate: number;
  regularRate?: number;     // discounted-vs-sticker price (partner cars only)
  market: string;
  hero?: string;
  flipImage?: boolean;
  imagePosition?: string;
  trackEligible?: boolean;
  isCoOwnable: boolean;     // RYDA fleet → can also claim a share
  sharesAvailable?: number; // RYDA fleet only
};

function vehicleToListing(v: Vehicle): RentalListing {
  return {
    slug: v.symbol.toLowerCase(),
    kind: "ryda",
    make: v.brand,
    model: v.name.replace(`${v.brand} `, "").trim() || v.name,
    year: v.year,
    category: v.category,
    dailyRate: v.rentalDailyRate,
    market: v.market,
    hero: v.hero,
    flipImage: v.flipImage,
    imagePosition: v.imagePosition,
    trackEligible: v.trackEligible,
    isCoOwnable: true,
    sharesAvailable: v.sharesAvailable,
  };
}

function partnerToListing(p: PartnerVehicle): RentalListing {
  return {
    slug: p.slug,
    kind: "partner",
    make: p.make,
    model: p.model,
    year: p.year,
    category: p.category,
    dailyRate: p.dailyRate,
    regularRate: p.regularRate,
    market: p.market,
    hero: getPartnerHero(p),
    isCoOwnable: false,
  };
}

const ALL_LISTINGS: RentalListing[] = [
  ...VEHICLES.filter((v) => v.rentalAvailable).map(vehicleToListing),
  ...PARTNER_VEHICLES.map(partnerToListing),
];

// ─────────────────────────────────────────────────────────────────────────
// Filters & sort
// ─────────────────────────────────────────────────────────────────────────

type SortOption =
  | "featured"
  | "price-low"
  | "price-high"
  | "savings"
  | "year-new";

const ANY = "__any__";

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: ANY, label: "All types" },
  { value: "Coupe", label: "Coupe" },
  { value: "Convertible", label: "Convertible" },
  { value: "GT", label: "GT" },
  { value: "Hypercar", label: "Hypercar" },
  { value: "Exotic", label: "Exotic" },
  { value: "SUV", label: "SUV" },
  { value: "Sedan", label: "Sedan" },
  { value: "7-Seater", label: "7-Seater" },
  { value: "EV", label: "EV" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: low → high" },
  { value: "price-high", label: "Price: high → low" },
  { value: "year-new", label: "Year: newest" },
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
  { value: "1000-3000", label: "$1,000 – $3,000/day", test: (r) => r >= 1_000 && r < 3_000 },
  { value: "3000+", label: "$3,000+/day", test: (r) => r >= 3_000 },
];

// Year buckets — partner inventory is recent but not always current model;
// "Newer than 2022" matches member expectation around modern luxury.
const YEAR_BUCKETS: {
  value: string;
  label: string;
  test?: (year: number | undefined) => boolean;
}[] = [
  { value: ANY, label: "Any year" },
  { value: "2024+", label: "2024 or newer", test: (y) => !!y && y >= 2024 },
  { value: "2022+", label: "2022 or newer", test: (y) => !!y && y >= 2022 },
  { value: "2020+", label: "2020 or newer", test: (y) => !!y && y >= 2020 },
];

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export function RentalListings() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<string>(ANY);
  const [make, setMake] = useState<string>(ANY);
  const [category, setCategory] = useState<string>(ANY);
  const [priceBucket, setPriceBucket] = useState<string>(ANY);
  const [yearBucket, setYearBucket] = useState<string>(ANY);
  const [coOwnableOnly, setCoOwnableOnly] = useState(false);
  const [trackOnly, setTrackOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("featured");

  const makes = useMemo(
    () =>
      Array.from(new Set(ALL_LISTINGS.map((v) => v.make))).sort(),
    [],
  );

  // Markets surfaced in the filter — include all RYDA markets (Miami,
  // Los Angeles, New York) even if the inventory in some markets is
  // Coming Soon. Partner inventory is Miami-only today but the
  // architecture is ready for partner fleets in other cities.
  const locations = useMemo(() => {
    const set = new Set<string>(ALL_LISTINGS.map((v) => v.market));
    // Force the canonical RYDA markets to appear even when a market has
    // no inventory yet — clearer "Coming soon" UX than silently hiding.
    ["Miami", "Los Angeles", "New York"].forEach((m) => set.add(m));
    return Array.from(set).sort();
  }, []);

  const filtered: RentalListing[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_LISTINGS.filter((v) => {
      if (q) {
        const haystack =
          `${v.make} ${v.model} ${v.market} ${v.category} ${v.year ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (location !== ANY && v.market !== location) return false;
      if (make !== ANY && v.make !== make) return false;
      if (category !== ANY && v.category !== category) return false;
      if (priceBucket !== ANY) {
        const bucket = PRICE_BUCKETS.find((b) => b.value === priceBucket);
        if (bucket?.test && !bucket.test(v.dailyRate)) return false;
      }
      if (yearBucket !== ANY) {
        const bucket = YEAR_BUCKETS.find((b) => b.value === yearBucket);
        if (bucket?.test && !bucket.test(v.year)) return false;
      }
      if (coOwnableOnly && !v.isCoOwnable) return false;
      if (trackOnly && !v.trackEligible) return false;
      return true;
    });
  }, [query, location, make, category, priceBucket, yearBucket, coOwnableOnly, trackOnly]);

  const visible = useMemo(() => {
    const out = [...filtered];
    switch (sort) {
      case "price-low":
        out.sort((a, b) => a.dailyRate - b.dailyRate);
        break;
      case "price-high":
        out.sort((a, b) => b.dailyRate - a.dailyRate);
        break;
      case "year-new":
        out.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
      case "savings":
        out.sort((a, b) => {
          const aPct = a.regularRate ? (a.regularRate - a.dailyRate) / a.regularRate : 0;
          const bPct = b.regularRate ? (b.regularRate - b.dailyRate) / b.regularRate : 0;
          return bPct - aPct;
        });
        break;
      case "featured":
      default:
        // RYDA fleet first (co-own option), then by price descending
        out.sort((a, b) => {
          const aTier = a.isCoOwnable ? 0 : 1;
          const bTier = b.isCoOwnable ? 0 : 1;
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
    query.trim().length > 0 ||
    location !== ANY ||
    make !== ANY ||
    category !== ANY ||
    priceBucket !== ANY ||
    yearBucket !== ANY ||
    coOwnableOnly ||
    trackOnly;

  function clearAll() {
    setQuery("");
    setLocation(ANY);
    setMake(ANY);
    setCategory(ANY);
    setPriceBucket(ANY);
    setYearBucket(ANY);
    setCoOwnableOnly(false);
    setTrackOnly(false);
    setSort("featured");
  }

  // Active-filter chip strip — quick at-a-glance read of what's currently
  // filtered, with single-click removal. Pacaso uses the same pattern.
  type Chip = { label: string; onClear: () => void };
  const chips: Chip[] = [];
  if (query.trim()) chips.push({ label: `“${query.trim()}”`, onClear: () => setQuery("") });
  if (location !== ANY) chips.push({ label: location, onClear: () => setLocation(ANY) });
  if (make !== ANY) chips.push({ label: make, onClear: () => setMake(ANY) });
  if (category !== ANY) chips.push({ label: category, onClear: () => setCategory(ANY) });
  if (priceBucket !== ANY) {
    const lbl = PRICE_BUCKETS.find((b) => b.value === priceBucket)?.label;
    if (lbl) chips.push({ label: lbl, onClear: () => setPriceBucket(ANY) });
  }
  if (yearBucket !== ANY) {
    const lbl = YEAR_BUCKETS.find((b) => b.value === yearBucket)?.label;
    if (lbl) chips.push({ label: lbl, onClear: () => setYearBucket(ANY) });
  }
  if (coOwnableOnly)
    chips.push({ label: "Co-ownership", onClear: () => setCoOwnableOnly(false) });
  if (trackOnly)
    chips.push({ label: "Track-ready", onClear: () => setTrackOnly(false) });

  return (
    <section>
      {/* Filter bar — sticky so filters stay accessible while browsing */}
      <div className="sticky top-0 z-30 border-b border-rule bg-cream-2/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-5 sm:px-10">
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
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
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
                placeholder="Try Ferrari, Miami, Convertible, 2024…"
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

          {/* Filter row — Location is first because it's the most
              consequential decision (Miami today, LA + NY soon). */}
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <FilterSelect
              label="Location"
              value={location}
              onChange={setLocation}
              options={[
                { value: ANY, label: "All locations" },
                ...locations.map((m) => ({ value: m, label: m })),
              ]}
            />
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
            <FilterSelect
              label="Year"
              value={yearBucket}
              onChange={setYearBucket}
              options={YEAR_BUCKETS.map((b) => ({
                value: b.value,
                label: b.label,
              }))}
            />

            {/* Toggles for boolean attributes — distinct visual treatment
                from selects so members can tell them apart. */}
            <FilterToggle
              label="Co-ownership"
              active={coOwnableOnly}
              onClick={() => setCoOwnableOnly((v) => !v)}
            />
            <FilterToggle
              label="Track-ready"
              active={trackOnly}
              onClick={() => setTrackOnly((v) => !v)}
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

          {/* Active filter chips — appear only when filters are applied.
              Each chip clears its filter on click. */}
          {chips.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                Filtering by
              </span>
              {chips.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={c.onClear}
                  aria-label={`Remove filter: ${c.label}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  <span>{c.label}</span>
                  <span className="text-mute group-hover:text-ink" aria-hidden>
                    ×
                  </span>
                </button>
              ))}
            </div>
          ) : null}
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
              {totalListed === 1 ? "vehicle" : "vehicles"} available
            </span>
            {location !== ANY ? (
              <span className="ml-2 text-mute">in {location}</span>
            ) : (
              <span className="ml-2 text-mute">· Miami · LA · NYC</span>
            )}
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
          <EmptyState
            location={location !== ANY ? location : null}
            onReset={clearAll}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((v) => (
              <RentalCard key={`${v.kind}-${v.slug}`} listing={v} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({
  location,
  onReset,
}: {
  location: string | null;
  onReset: () => void;
}) {
  // Special case: filtered to LA or NY where partner fleet hasn't shipped
  // yet. Show a "Coming soon" treatment instead of the generic empty state.
  const isComingSoonMarket =
    location === "Los Angeles" || location === "New York";
  if (isComingSoonMarket) {
    return (
      <div className="rounded-2xl border border-rule bg-surface p-12 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          {location} · Coming soon
        </p>
        <p className="mt-3 font-display text-2xl text-ink">
          The {location} fleet ships with the local launch.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          We&apos;re assembling fleet partners and storage in {location} now.
          Want first-look access when listings open? Tell us and we&apos;ll
          get in touch.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/contact?type=Membership&note=${encodeURIComponent(`Want ${location} rental access`)}#form`}
            className="inline-flex h-11 items-center justify-center rounded-full bg-red px-5 text-sm font-medium text-cream hover:bg-red-deep"
          >
            Notify me at launch →
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
          >
            See Miami inventory instead
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-rule bg-surface p-12 text-center">
      <p className="font-display text-xl text-ink">
        No vehicles match those filters.
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        Try widening your search or{" "}
        <button
          type="button"
          onClick={onReset}
          className="text-red underline-offset-4 hover:underline"
        >
          reset all filters
        </button>
        .
      </p>
    </div>
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

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        Toggle
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={label}
        onClick={onClick}
        className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors ${
          active
            ? "border-red bg-red text-cream hover:bg-red-deep"
            : "border-rule bg-surface text-ink-soft hover:border-ink hover:text-ink"
        }`}
      >
        <span
          aria-hidden
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            active ? "border-cream bg-cream" : "border-rule bg-surface"
          }`}
        >
          {active && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
              <path
                d="M2 4.5L4 6.5L7.5 2.5"
                stroke="#DC4747"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        {label}
      </button>
    </label>
  );
}

function RentalCard({ listing: v }: { listing: RentalListing }) {
  const savings = v.regularRate ? v.regularRate - v.dailyRate : 0;
  const savingsPct = v.regularRate
    ? Math.round((savings / v.regularRate) * 100)
    : 0;
  const tint = brandTint(v.make);
  const hasShare = v.isCoOwnable && (v.sharesAvailable ?? 0) > 0;

  return (
    <Link
      href={`/rent/${v.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-lg"
    >
      {/* Image with badges */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden"
        style={{ backgroundColor: v.kind === "partner" ? tint : undefined }}
      >
        {v.hero ? (
          <Image
            src={v.hero}
            alt={`${v.make} ${v.model}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
              v.flipImage ? "-scale-x-100" : ""
            }`}
            style={{ objectPosition: v.imagePosition ?? "center" }}
            unoptimized={v.kind === "partner"}
          />
        ) : (
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

        {/* Track-ready or savings badge top-right */}
        {v.trackEligible ? (
          <span className="absolute right-3 top-3 rounded-full bg-red/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cream backdrop-blur">
            Track-ready
          </span>
        ) : savingsPct >= 10 ? (
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
          <span className="text-mute">· 100 mi/day included</span>
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
            {v.regularRate && savings > 0 ? (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                  Regular
                </p>
                <p className="text-sm text-mute line-through tabular-nums">
                  {formatUSD(v.regularRate)}
                </p>
              </div>
            ) : hasShare ? (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                  Or own a share
                </p>
                <p className="text-sm text-red tabular-nums">
                  {v.sharesAvailable} of 10 left
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-ink-soft">
            {hasShare ? "Co-ownership available" : "100 mi/day included"}
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red transition-colors group-hover:text-red-deep">
            View details
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
