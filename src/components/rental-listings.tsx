"use client";

// Unified rental listings, RYDA co-ownership fleet + extended Miami
// inventory in ONE filterable card grid. Each card links to a detail
// page at /rent/[slug] regardless of which fleet it came from. The
// route handler resolves slug → Vehicle (RYDA) or PartnerVehicle.

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

// Year buckets, partner inventory is recent but not always current model;
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

// URL-aware wrapper for /rent. Reads ?q= with useSearchParams — a
// client-side read, so the page itself stays a static prerender (mount
// this inside a <Suspense> boundary; the hook suspends during
// prerender). .get() returns the FIRST value of a repeated ?q=a&q=b,
// matching the old server-side normalization.
//
// The key remount is the point: initialQuery only seeds state, so
// without it a same-route navigation (/rent?q=urus → header "Browse" →
// /rent, or back/forward between two queries) would leave the grid,
// search box, and count strip filtered by a stale query that
// contradicts the URL. Keying by the query resets the grid to match
// the URL on every query change.
export function RentalListingsFromUrl() {
  const q = useSearchParams().get("q") ?? undefined;
  return <RentalListings key={q ?? ""} initialQuery={q} />;
}

export function RentalListings({
  initialQuery,
}: {
  initialQuery?: string;
} = {}) {
  // initialQuery seeds the search box from /rent?q=… (landing-page hero
  // search). State-seed only — after mount the input owns the value, so
  // typing here never rewrites the URL. URL→state sync across
  // navigations is RentalListingsFromUrl's job (key remount above).
  const [query, setQuery] = useState(initialQuery ?? "");
  const [location, setLocation] = useState<string>(ANY);
  const [make, setMake] = useState<string>(ANY);
  const [category, setCategory] = useState<string>(ANY);
  const [priceBucket, setPriceBucket] = useState<string>(ANY);
  const [yearBucket, setYearBucket] = useState<string>(ANY);
  const [trackOnly, setTrackOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("featured");

  const makes = useMemo(
    () =>
      Array.from(new Set(ALL_LISTINGS.map((v) => v.make))).sort(),
    [],
  );

  // Markets surfaced in the filter, include all RYDA markets (Miami,
  // Los Angeles, New York) even if the inventory in some markets is
  // Coming Soon. Partner inventory is Miami-only today but the
  // architecture is ready for partner fleets in other cities.
  const locations = useMemo(() => {
    const set = new Set<string>(ALL_LISTINGS.map((v) => v.market));
    // Force the canonical RYDA markets to appear even when a market has
    // no inventory yet, clearer "Coming soon" UX than silently hiding.
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
      if (trackOnly && !v.trackEligible) return false;
      return true;
    });
  }, [query, location, make, category, priceBucket, yearBucket, trackOnly]);

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
    trackOnly;

  function clearAll() {
    setQuery("");
    setLocation(ANY);
    setMake(ANY);
    setCategory(ANY);
    setPriceBucket(ANY);
    setYearBucket(ANY);
    setTrackOnly(false);
    setSort("featured");
  }

  // Active-filter chip strip, quick at-a-glance read of what's currently
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
  if (trackOnly)
    chips.push({ label: "Track-ready", onClear: () => setTrackOnly(false) });

  return (
    <section>
      {/* Filter bar, sticky so filters stay accessible while browsing.
          top-18 stacks it just below the sticky 71px site header.
          Tight h-9 controls — Cars & Bids density. Below lg the row
          scrolls horizontally; at lg+ it wraps instead (the full control
          set is ~1.4k px wide, wider than the max-w-7xl content box, so a
          single non-scrolling row would bleed off-screen) and ml-auto
          right-aligns the Reset/Sort group on its line. */}
      <div className="sticky top-18 z-30 border-b border-rule bg-cream-2/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-2.5 sm:px-10">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible">
            {/* Search */}
            <div className="flex h-9 w-48 flex-none items-center rounded-full border border-rule bg-surface px-3 transition-colors focus-within:border-ink lg:w-52">
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
                placeholder="Search the fleet"
                aria-label="Search the fleet"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-mute focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="ml-1 shrink-0 rounded-full px-1 text-xs text-mute hover:text-ink"
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>

            {/* Selects — the neutral first option ("All locations", …) is
                the visible label; aria-label carries the name for AT. */}
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

            {/* Boolean chip toggle — filled red reads as pressed. */}
            <FilterToggle
              label="Track-ready"
              active={trackOnly}
              onClick={() => setTrackOnly((v) => !v)}
            />

            <div className="ml-auto flex flex-none items-center gap-2">
              {anyFilterActive ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-9 flex-none rounded-full border border-rule bg-surface px-3 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
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

          {/* Active filter chips, appear only when filters are applied.
              Each chip clears its filter on click. */}
          {chips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                Filtering by
              </span>
              {chips.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={c.onClear}
                  aria-label={`Remove filter: ${c.label}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-0.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
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

      {/* Counter strip — deliberately OUTSIDE the sticky wrapper so it
          scrolls away with the page instead of eating pinned height. */}
      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-3 px-6 py-2 sm:px-10">
          <p className="text-xs text-ink-soft">
            <span className="font-display text-base text-ink tabular-nums">
              {totalListed}
            </span>
            <span className="ml-1.5">
              {totalListed === 1 ? "vehicle" : "vehicles"} available
            </span>
            {location !== ANY ? (
              <span className="ml-1.5 text-mute">in {location}</span>
            ) : (
              <span className="ml-1.5 text-mute">· Miami · LA · NYC</span>
            )}
          </p>
          {totalListed > 0 ? (
            <p className="text-xs text-ink-soft tabular-nums">
              From{" "}
              <span className="font-display text-base text-ink">
                {formatUSD(minRate)}
              </span>{" "}
              to{" "}
              <span className="font-display text-base text-ink">
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
  // No caption above the control — the neutral first option ("All makes",
  // "Any price", …) is the visible label; aria-label names it for AT.
  // Chevron is an inline SVG on text-mute (token-driven — no raw hex).
  return (
    <span className="relative flex-none">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-9 w-full cursor-pointer appearance-none rounded-full border border-rule bg-surface px-3 pr-8 text-sm text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mute"
      >
        <path
          d="M3 5l3 3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
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
  // Compact chip button — filled red when pressed, hairline pill when not.
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 flex-none rounded-full border px-3.5 text-sm font-medium transition-colors ${
        active
          ? "border-red bg-red text-cream hover:bg-red-deep"
          : "border-rule bg-surface text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function RentalCard({ listing: v }: { listing: RentalListing }) {
  const savings = v.regularRate ? v.regularRate - v.dailyRate : 0;
  const savingsPct = v.regularRate
    ? Math.round((savings / v.regularRate) * 100)
    : 0;
  const tint = brandTint(v.make);

  // Dense Mainstable-style card: the photo carries the badges AND the
  // price chip, so the body stays three short lines and the 4-up grid
  // shows far more inventory per screen. The whole card is the link.
  return (
    <Link
      href={`/rent/${v.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-lg"
    >
      {/* Photo — brand chip top-left, track/save badge top-right (never
          stacked), price chip bottom-right. */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden"
        style={{ backgroundColor: v.kind === "partner" ? tint : undefined }}
      >
        {v.hero ? (
          <Image
            src={v.hero}
            alt={`${v.make} ${v.model}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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

        {/* Price chip bottom-right — dark so it reads on any photo. The
            regular-rate strikethrough rides inside the chip so the partner
            discount stays visible without a second price block. */}
        <span className="absolute bottom-3 right-3 inline-flex items-baseline gap-1.5 rounded-full bg-ink/85 px-3 py-1 backdrop-blur">
          {v.regularRate && savings > 0 ? (
            <span className="text-[11px] text-cream/70 line-through tabular-nums">
              {formatUSD(v.regularRate)}
            </span>
          ) : null}
          <span className="font-display text-base text-cream tabular-nums">
            {formatUSD(v.dailyRate)}
          </span>
          <span className="text-[11px] text-cream/70">/day</span>
        </span>
      </div>

      {/* Body — three short lines; mt-auto pins the location line so card
          bottoms align across a row even when a model name wraps. */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg leading-tight text-ink">
          {v.model}
        </h3>
        <p className="mt-1 text-xs text-mute">
          {[v.make, v.year, v.category].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-mute">
          <span>{v.market} · 100 mi/day</span>
          <span
            aria-hidden
            className="transition-all group-hover:translate-x-0.5 group-hover:text-red"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
