"use client";

// The rental listings grid: every car a partner operator lists with
// RYDA, in ONE filterable card grid. Each card links to a detail page at
// /rent/[slug], which resolves the slug back to a PartnerVehicle.
//
// There is exactly one rail. RYDA owns no vehicle and rents none of its
// own — the RYDA-owned fleet (and with it `kind`, `isCoOwnable`, and the
// co-ownable-first sort tier) was removed in Aug 2026.

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MarketplaceCard } from "@/components/marketplace-card";
import {
  PARTNER_VEHICLES,
  getPartnerHero,
  type PartnerVehicle,
} from "@/lib/partner-fleet";

// ─────────────────────────────────────────────────────────────────────────
// Normalized listing shape
// ─────────────────────────────────────────────────────────────────────────

// Exported so the DB-backed read path (src/lib/rental-listings-db.ts)
// is type-checked against the exact shape this grid renders. When
// rental inventory finishes moving into the database (build loop 0A →
// 2C) this type and its adapters should move to src/lib/.
export type RentalListing = {
  slug: string;             // route param: partner.slug
  make: string;
  model: string;
  year?: number;
  category: string;
  dailyRate: number;
  regularRate?: number;     // discounted-vs-sticker price
  market: string;
  hero?: string;
  milesIncluded?: string;   // operator's own mileage term, e.g. "100 mi/day"
};

function partnerToListing(p: PartnerVehicle): RentalListing {
  return {
    slug: p.slug,
    make: p.make,
    model: p.model,
    year: p.year,
    category: p.category,
    dailyRate: p.dailyRate,
    regularRate: p.regularRate,
    market: p.market,
    hero: getPartnerHero(p),
    milesIncluded: p.milesIncluded,
  };
}

const ALL_LISTINGS: RentalListing[] = PARTNER_VEHICLES.map(partnerToListing);

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

// Exactly the PartnerCategory union, nothing more. "Coupe", "GT" and
// "Hypercar" used to live here because the RYDA-owned fleet was typed
// on its own category union; with that fleet gone they matched zero
// inventory, so picking one dropped the visitor on the empty state.
// A filter that can only ever return nothing is worse than no filter.
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
  // A "$3,000+/day" bucket sat here and matched zero cars — the same
  // fault as the "Coupe"/"GT"/"Hypercar" categories above, and the same
  // fix. An option that can only ever return the empty state advertises
  // inventory at a price nobody can rent.
];

// Year buckets. Operator inventory is recent but not always the current
// model year, and most entries carry no `year` at all — a year filter
// therefore hides more cars than it finds, which is why the neutral
// "Any year" is the default. (No "member" framing here: RYDA has no
// membership, and copy in this tree kept re-seeding one from comments.)
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
  const [sort, setSort] = useState<SortOption>("featured");

  const makes = useMemo(
    () =>
      Array.from(new Set(ALL_LISTINGS.map((v) => v.make))).sort(),
    [],
  );

  // Markets surfaced in the filter, derived from the listings and
  // nothing else. Los Angeles and New York were force-injected here as
  // "the canonical RYDA markets"; both are deleted. Zero cars are
  // listed in either — PartnerVehicle.market is the literal type
  // "Miami" — so the dropdown was offering two cities as places RYDA
  // operates, which is the same claim the counter strip, the schema's
  // areaServed and the deleted city pages were all stripped of. A
  // filter that can only return nothing is not UX; it is a market
  // claim.
  const locations = useMemo(
    () => Array.from(new Set(ALL_LISTINGS.map((v) => v.market))).sort(),
    [],
  );

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
      return true;
    });
  }, [query, location, make, category, priceBucket, yearBucket]);

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
        // One rail, so there is no tier to lead with: the headline cars
        // are simply the most expensive ones.
        out.sort((a, b) => b.dailyRate - a.dailyRate);
    }
    return out;
  }, [filtered, sort]);

  const totalListed = visible.length;
  // Markets actually represented in what is on screen. The counter strip
  // used to print a hard-coded "· Miami · LA · NYC" whenever no location
  // filter was set — a claim of inventory in two cities that have none,
  // sitting directly beside the count of cars that are all in one. It is
  // derived now, so the strip can only ever name a market a visitor can
  // scroll to; PartnerVehicle.market is the literal type "Miami", so
  // today that is exactly "Miami".
  const marketsShown = useMemo(
    () => Array.from(new Set(visible.map((v) => v.market))).sort().join(" · "),
    [visible],
  );
  // No minRate/maxRate here any more. The strip printed "From $X to $Y
  // / day" across whatever was on screen — a rate statistic computed
  // over partner-fleet.ts, which is the operator's rate table and not
  // RYDA's to summarise. Each card still shows the operator's own rate
  // for that car, which is a fact about one listing rather than a
  // claim about the fleet.

  const anyFilterActive =
    query.trim().length > 0 ||
    location !== ANY ||
    make !== ANY ||
    category !== ANY ||
    priceBucket !== ANY ||
    yearBucket !== ANY;

  function clearAll() {
    setQuery("");
    setLocation(ANY);
    setMake(ANY);
    setCategory(ANY);
    setPriceBucket(ANY);
    setYearBucket(ANY);
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
            ) : marketsShown ? (
              <span className="ml-1.5 text-mute">in {marketsShown}</span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Card grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        {visible.length === 0 ? (
          <EmptyState onReset={clearAll} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((v) => (
              <MarketplaceCard key={v.slug} vehicle={v} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  // The Los-Angeles/New-York "no operator lists a car here yet" panel
  // that used to branch off this component is deleted with the two
  // cities that reached it — heading, the "opens when operators in
  // {location} list on it" line, and the "Tell us you want {location}"
  // CTA into /contact. It could only render for a location the filter
  // no longer offers, and it cited
  // src/app/locations/_components/planned-market.tsx, deleted in the
  // same strip. One generic empty state remains.
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

