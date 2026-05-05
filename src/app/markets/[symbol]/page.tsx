import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { OrderPanel } from "@/components/order-panel";
import CostBreakdown, {
  buildCostBreakdownConfig,
} from "@/components/shared/cost-breakdown";
import ShareValueChart, {
  buildShareValueChartConfig,
} from "@/components/shared/share-value-chart";
import CompareCalculator from "@/components/shared/compare-calculator";
import { PhotoGallery } from "@/components/photo-gallery";
import { OwnershipPrimitives } from "@/components/ownership-primitives";
import { BookingTiersExplainer } from "@/components/booking-tiers-explainer";
import { AssetAnatomySections } from "@/components/asset-anatomy";
import { AssetOpsDisclosure } from "@/components/asset-ops-disclosure";
import { RecentComparableSales } from "@/components/recent-comparables";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { VehicleComparable } from "@/lib/vehicle-enrichment";
import {
  VEHICLES,
  getVehicleBySymbol,
  formatUSD,
  computeShareEconomics,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
  RENTAL_DEFAULTS,
} from "@/lib/market-data";

export async function generateStaticParams() {
  return VEHICLES.map((v) => ({ symbol: v.symbol.toLowerCase() }));
}

// ISR — re-render at most every 5 min. Lets newly-added comparables
// surface within minutes without paying the runtime cost of full
// dynamic rendering on every visit.
export const revalidate = 300;

// Map a vehicle to its classic.com market page so the comparables
// block can include a "View live market data on classic.com →"
// outbound link. Best-effort — if classic.com restructures their
// URLs, this just degrades to no link (the block still renders).
function classicComUrlFor(v: { brand: string; name: string; year: number }): string | undefined {
  const brand = v.brand.toLowerCase().replace(/\s+/g, "-");
  // Strip the brand prefix from name + slugify ("Ferrari 296 GTB" → "296-gtb")
  const model = v.name
    .toLowerCase()
    .replace(v.brand.toLowerCase(), "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!brand || !model) return undefined;
  return `https://www.classic.com/m/${brand}/${model}/`;
}

// Fetch hand-curated comparable sales for this vehicle. Returns []
// if Supabase isn't available (build-time fallback) or if no comps
// have been curated yet — display block then renders nothing.
async function getComparablesFor(vehicleSymbol: string): Promise<VehicleComparable[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("vehicle_comparables")
    .select("*")
    .eq("vehicle_symbol", vehicleSymbol)
    .order("sale_date", { ascending: false })
    .limit(5);
  if (error) {
    console.warn("[markets/[symbol]] comparables fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    vehicleSymbol: r.vehicle_symbol,
    saleDate: r.sale_date,
    yearMakeModel: r.year_make_model,
    trimNotes: r.trim_notes,
    salePriceCents: r.sale_price_cents,
    sourceName: r.source_name,
    sourceUrl: r.source_url,
    lotNumber: r.lot_number,
    notes: r.notes,
    curatedBy: r.curated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v) return { title: "RYDA Markets" };
  return {
    title: `${v.name}, ${formatUSD(v.pricePerShare)} per share — RYDA`,
    description: `Co-own a ${v.year} ${v.name}. ${v.sharesAvailable} of ${v.shares} member-managed LLC shares available.`,
  };
}

export default async function VehicleMarketPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v) notFound();

  const econ = computeShareEconomics(v);
  const costBreakdownConfig = buildCostBreakdownConfig(v, "cars");
  const comparables = await getComparablesFor(v.symbol);
  const shareValueChartConfig = buildShareValueChartConfig(v, "cars");
  const compareCalculatorConfig = {
    vertical: "cars",
    holdingYears: HOLDING_YEARS,
    targetDepreciationPct: TARGET_DEPRECIATION_PCT,
    rentalDefaults: RENTAL_DEFAULTS,
    accent: "red",
    labels: {
      asset: "Vehicle",
      assetLower: "vehicle",
      assetHeldCopy: "curated certified pre owned car",
      calculatorName: "Carculator",
      rentalIncomeName: "Rental income projection",
      rentalPoolName: "rental pool",
      rentalVerb: "renting",
      rentalToggleVerb: "Rent",
      rentalAdjectiveTitle: "Rental",
      rentalAdjectiveLower: "rental",
      useDays: "driving days",
      useDaysAdjective: "drive",
      residualAssumption: "low-mileage certified pre owned exotics",
      rentalMarketCopy:
        "Miami exotic-rental fleets average 200-240 booked days/yr.",
      resaleConsistencyCopy:
        "our 100 mi/day allowance + certified pre owned maintenance keep the resale story consistent whether you drive or rent it out.",
      exitAssetName: "car",
    },
  } as const;

  // Structured data for richer Google search results.
  // We model the listing as a Product (the share itself) with the
  // physical Vehicle as the itemOffered. This way Google reads the
  // page price as the per-share price, not the full vehicle price.
  const pageUrl = `/markets/${v.symbol.toLowerCase()}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": pageUrl,
    url: pageUrl,
    name: `1 share · ${v.year} ${v.name}`,
    description: `Asset-backed co-ownership share in a ${v.year} ${v.name}. Each share unlocks ~${v.daysPerYear} days/yr and ~${v.milesPerYear.toLocaleString()} mi/yr. ${v.description}`,
    image: v.hero,
    brand: { "@type": "Brand", name: "RYDA" },
    category: "Co-ownership share",
    offers: {
      "@type": "Offer",
      url: pageUrl,
      name: `1 share (${v.daysPerYear} days/yr · ${v.milesPerYear.toLocaleString()} mi/yr)`,
      price: v.pricePerShare,
      priceCurrency: "USD",
      availability:
        v.sharesAvailable > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "RYDA" },
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        value: v.sharesAvailable,
        maxValue: v.shares,
        unitText: "shares",
      },
      itemOffered: {
        "@type": "Vehicle",
        name: `${v.year} ${v.name}`,
        brand: { "@type": "Brand", name: v.brand },
        model: v.name.replace(`${v.brand} `, "").trim(),
        vehicleModelDate: String(v.year),
        bodyType: v.category,
        numberOfDoors: v.category === "SUV" ? 4 : 2,
        fuelType: v.cylinders === 0 ? "Electric" : "Gasoline",
        driveWheelConfiguration:
          v.drive === "AWD"
            ? "https://schema.org/AllWheelDriveConfiguration"
            : "https://schema.org/RearWheelDriveConfiguration",
        color: v.specs.color,
        image: v.hero,
      },
    },
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        // JSON.stringify doesn't escape HTML; if any of the embedded
        // values ever contain "</script>", a script-context breakout
        // is possible. Replace `<` with its escaped Unicode form so
        // the script body cannot escape its own tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Top: title + chart on left, order panel on right */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href="/markets"
            className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
          >
            ← Co-Own
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left column, title + chart (price + change live inside the chart) */}
            <div className="lg:col-span-8">
              <PhotoGallery
                photos={[v.hero]}
                alt={`${v.year} ${v.name}`}
                flipFirst={v.flipImage}
                imagePosition={v.imagePosition}
                optimize
              />

              <h1 className="mt-6 font-display text-4xl font-light text-ink sm:text-5xl">
                {v.name}
              </h1>
              <p className="mt-1 text-xs text-mute">
                {v.year} · {v.brand} · Stored in {v.market}
              </p>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft">
                {v.description}
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                <Fact label="Vehicle price" value={formatUSD(v.fullPrice)} />
                <Fact
                  label="Per share"
                  value={formatUSD(v.pricePerShare)}
                  sub={`Net cost: ~${formatUSD(econ.netCost)} after ${HOLDING_YEARS}-yr sale of vehicle`}
                />
                <Fact label="Total shares" value={String(v.shares)} />
                <Fact label="Days / share" value={`${v.daysPerYear}/yr`} />
                <Fact
                  label="Miles / share"
                  value={`${v.milesPerYear.toLocaleString()}/yr`}
                  sub="100 mi/day allowance"
                />
                <Fact label="Annual contribution" value={`${formatUSD(v.annualOpCost)} per share`} />
              </dl>
            </div>

            {/* Right column, order panel */}
            <div className="lg:col-span-4">
              <OrderPanel vehicle={v} />
            </div>
          </div>
        </div>
      </section>

      {/* Ownership primitives, five-number trust block right under the
          hero so the buyer sees the structure before scrolling further. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <OwnershipPrimitives variant="compact" title="What this share is, in five numbers" />
        </div>
      </section>

      {/* Your share, sample co-ownership view */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Your share</h2>
          <p className="mt-1 text-sm text-mute">
            Sample co-ownership view, sign in to see your actual shares.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Shares held" value="1" sub={`of ${v.shares}`} />
            <Stat
              label="Days available"
              value={`${v.daysPerYear}`}
              sub="this year"
            />
            <Stat
              label="Miles available"
              value={(v.milesPerYear).toLocaleString()}
              sub="this year"
            />
            <Stat
              label="Annual cost"
              value={formatUSD(v.annualOpCost)}
              sub="all-in per share"
            />
          </div>
        </div>
      </section>

      {/* Editorial anatomy: provenance timeline → press quote →
          originality/condition grid. All three render conditionally,
          so unpopulated vehicles cleanly skip these sections.
          Inspired by Rally's asset detail anatomy but with
          LLC-member-safe nouns (no ticker/IPO/market terms). */}
      <AssetAnatomySections vehicle={v} />

      {/* Care & custody — Round 2 research: the single biggest
          credibility delta vs. competitors. Pacaso/Kocomo/Ember all
          hide this. Always renders (uses sane defaults if vehicle
          doesn't override). */}
      <AssetOpsDisclosure vehicle={v} />

      {/* Recent comparable sales — hand-curated from classic.com /
          BaT / RM Sotheby's. The valuation moat: cite specific named
          transactions instead of a black-box "estimated value."
          Renders nothing until comps are added via /admin/comparables. */}
      <RecentComparableSales
        comparables={comparables}
        code={v.ticker}
        classicComUrl={classicComUrlFor(v)}
      />

      {/* Two-year cost breakdown */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                What you actually pay
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                The {HOLDING_YEARS}-year math, in one box.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Each RYDA car is a curated certified pre owned held for {HOLDING_YEARS} years.
                At exit, the LLC sells the vehicle and proceeds are
                distributed pro-rata to members. We model a{" "}
                {econ.depreciationPct}% depreciation hit over the full hold,
                a bar that low-mileage, kept-condition certified pre owned exotics often
                clear, but always verify with your own resale assumption.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Net result for a single share of the {v.name}, illustrative (most members hold the 2-share minimum, scale linearly): roughly{" "}
                <span className="font-medium text-ink">
                  {formatUSD(econ.netCost)}
                </span>{" "}
                of true cost spread over {econ.totalDays} driving days, about{" "}
                <span className="font-medium text-ink">
                  {formatUSD(econ.netPerDay)}
                </span>{" "}
                per day actually behind the wheel.
              </p>
              <Link
                href="#calculator"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink hover:border-ink"
              >
                Run your own numbers →
              </Link>
            </div>
            <div className="lg:col-span-7">
              <CostBreakdown config={costBreakdownConfig} shares={1} />
            </div>
          </div>
        </div>
      </section>

      {/* Share value chart, year-by-year depreciation visualization */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Share value over time
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                The depreciation curve, visualized.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Every {HOLDING_YEARS} years RYDA sells the car and
                distributes proceeds pro-rata to members. The chart
                tracks vehicle value, per-share value, and cumulative
                miles across the hold so you see exactly what your share
                is worth on the way out.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Linear 10% depreciation modeled for chart simplicity —
                actual curves vary by model and condition. Aventador
                Ultimaes and 812 GTSes routinely beat the curve;
                higher-volume sports cars track closer to it.
              </p>
            </div>
            <div className="lg:col-span-8">
              <ShareValueChart config={shareValueChartConfig} />
            </div>
          </div>
        </div>
      </section>

      {/* Per-listing calculator, locked to this vehicle. Lets buyers run
          their own scenario without leaving the listing. */}
      <section id="calculator" className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Run the math on this {v.brand}
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                Your scenario, your numbers.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-soft">
                Move the sliders to model your own usage on the {v.name}:
                buy-in, days driven, hold years, and the optional
                rental opt-in. Live math anchored to this car's actual
                pricing.
              </p>
            </div>
            <Link
              href={`/markets/${v.symbol}/cost-sheet`}
              target="_blank"
              className="inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-5 text-sm font-medium text-ink hover:border-ink"
            >
              Download cost sheet ↓
            </Link>
          </div>
          <CompareCalculator config={compareCalculatorConfig} lockedAsset={v} />
        </div>
      </section>

      {/* Booking model, compact two-tier explainer so buyers see how
          the calendar works before they wire anything. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <BookingTiersExplainer variant="compact" />
        </div>
      </section>

      {/* Specs */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Specifications</h2>
          <dl className="mt-8 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            <Fact label="Engine" value={v.specs.engine} />
            <Fact label="Power" value={v.specs.power} />
            <Fact label="0–60 mph" value={v.specs.zeroToSixty} />
            <Fact label="Top speed" value={v.specs.topSpeed} />
            <Fact label="Transmission" value={v.specs.transmission} />
            <Fact label="Color" value={v.specs.color} />
          </dl>
        </div>
      </section>

      {/* Recent activity, sample shown until Miami operations launch.
          Real per-LLC events (member joins, inspection posts, transfers)
          will populate from the member portal post-launch. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-3xl text-ink">Recent activity</h2>
            <span className="rounded-full border border-rule bg-cream-2 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
              Sample · live feed Q3 2026
            </span>
          </div>
          <ul className="mt-6 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Activity label="New co-owner joined the LLC" detail="Sample event" amount="—" sub="1 share" />
            <Activity label="Inspection report posted" detail="Sample event" amount="—" sub="Mileage: 2,140 mi" />
            <Activity label="Share transferred to a new verified member" detail="Sample event" amount="—" sub="1 share" />
            <Activity label="New co-owners joined the LLC" detail="Sample event" amount="—" sub="2 shares" />
          </ul>
          <p className="mt-3 text-xs text-mute">
            These rows are illustrative. The live feed of LLC events
            switches on at Miami launch. Member-to-member transfer prices
            are private to the parties, RYDA does not publish a
            transfer-price ticker.
          </p>
        </div>
      </section>

      {/* People also own */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Other cars in the fleet</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {VEHICLES.filter((x) => x.symbol !== v.symbol).slice(0, 4).map((x) => {
              const xEcon = computeShareEconomics(x);
              return (
                <Link
                  key={x.symbol}
                  href={`/markets/${x.symbol}`}
                  className="block rounded-xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md"
                >
                  <p className="text-xs text-mute">{x.brand}</p>
                  <p className="mt-1 font-display text-base text-ink">{x.name}</p>
                  <p className="mt-3 font-display text-xl text-ink tabular-nums">
                    {formatUSD(x.pricePerShare)}
                  </p>
                  <p className="mt-1 text-xs text-mute">per share</p>
                  <p className="mt-2 text-[11px] text-red tabular-nums">
                    Net cost: ~{formatUSD(xEcon.netCost)} after {HOLDING_YEARS}-yr sale
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pre-decision documents + call CTA */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Read before you wire
              </p>
              <p className="mt-3 font-display text-xl text-ink">
                Sample documents
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                We&apos;ll send you the LLC Operating Agreement, Management
                Services Agreement, sample PPI report, sample insurance
                certificate, and condition report, reviewable by your
                counsel before any commitment.
              </p>
              <Link
                href={`/contact?type=Membership&note=Sample%20documents%20for%20${v.symbol}#form`}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink hover:border-ink"
              >
                Request the packet →
              </Link>
            </div>
            <div className="rounded-2xl border border-rule bg-ink p-6 text-cream">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Talk to a founder
              </p>
              <p className="mt-3 font-display text-xl">
                Schedule a 30-minute call
              </p>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Real money, real conversation. We&apos;ll walk you through
                the LLC structure, insurance, the actual ownership process,
                and any questions your counsel raised. No commitment.
              </p>
              <Link
                href={`/contact?type=Membership&note=Schedule%20call%20about%20${v.symbol}#form`}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-cream px-6 text-sm font-medium text-ink hover:bg-red hover:text-cream"
              >
                Schedule a call →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer footer */}
      <section className="bg-ink py-12 pb-28 text-cream/60 lg:pb-12">
        <div className="mx-auto max-w-3xl px-6 text-center text-xs sm:px-10">
          RYDA is a luxury access platform. Co-ownership stakes are LLC
          membership interests in member-managed LLCs and are
          not registered securities. They are not offered for investment
          purposes. Cars depreciate; shares are illiquid by design.
          Membership is limited to verified individuals 28 years or older.
          See the full Co-Ownership Disclaimer at /legal/disclaimer.
        </div>
      </section>

      {/* Sticky bottom CTA bar, mobile-first, hidden on lg+ where the
          OrderPanel sits in the right column */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-cream/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">
              Per share
            </p>
            <p className="font-display text-lg text-ink tabular-nums">
              {formatUSD(v.pricePerShare)}
              {v.sharesAvailable > 0 ? (
                <span className="ml-1.5 text-[11px] font-normal text-ink-soft">
                  · {v.sharesAvailable} of {v.shares} left
                </span>
              ) : (
                <span className="ml-1.5 text-[11px] font-normal text-mute">
                  · Sold out
                </span>
              )}
            </p>
          </div>
          <Link
            href={`/contact?type=Membership&note=${encodeURIComponent(
              `Inquiry: ${v.name} (${v.symbol})`,
            )}#form`}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-red px-5 text-sm font-medium text-cream hover:bg-red-deep"
          >
            {v.sharesAvailable > 0 ? "Schedule a call" : "Notify me"}
          </Link>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}) {
  const subColor =
    tone === "up" ? "text-red" : tone === "down" ? "text-red" : "text-mute";
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink tabular-nums">{value}</p>
      {sub && <p className={`mt-1 text-xs tabular-nums ${subColor}`}>{sub}</p>}
    </div>
  );
}

function Fact({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
      {sub ? <dd className="mt-0.5 text-[11px] text-red">{sub}</dd> : null}
    </div>
  );
}

function Activity({
  label,
  detail,
  amount,
  sub,
}: {
  label: string;
  detail: string;
  amount: string;
  sub?: string;
}) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-mute">{detail}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-ink tabular-nums">{amount}</p>
        {sub && <p className="mt-0.5 text-xs text-mute">{sub}</p>}
      </div>
    </li>
  );
}
