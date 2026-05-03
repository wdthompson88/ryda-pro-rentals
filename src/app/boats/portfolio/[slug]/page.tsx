import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BoatCostBreakdown } from "@/components/boat-cost-breakdown";
import { BoatShareValueChart } from "@/components/boat-share-value-chart";
import { OwnershipPrimitives } from "@/components/ownership-primitives";
import { BoatCompareCalculator } from "@/components/boat-compare-calculator";
import {
  BOATS,
  getBoatBySlug,
  formatUSD,
  computeBoatShareEconomics,
  BOATS_HOLDING_YEARS,
  BOATS_TARGET_DEPRECIATION_PCT,
  BOAT_BOOKING_POLICY,
  type Boat,
} from "@/lib/boat-data";

export async function generateStaticParams() {
  return BOATS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBoatBySlug(slug);
  if (!b) return { title: "RYDA Boats" };
  return {
    title: `${b.name}, ${formatUSD(b.pricePerShare)} per share — RYDA Boats`,
    description: `Co-own the ${b.year} ${b.name} in ${b.market}. ${formatUSD(b.pricePerShare)} per share, ${formatUSD(b.annualOpCost)}/yr all-in operating cost. ${b.sharesAvailable} of ${b.shares} shares available.`,
  };
}

export default async function BoatDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBoatBySlug(slug);
  if (!b) notFound();

  const econ = computeBoatShareEconomics(b);

  // Schema.org Product + Vehicle JSON-LD so boat listings rank
  // alongside cars on search-engine SERPs. Without this, Google
  // treats the page as plain copy. The `<` → `<` escape
  // prevents script-context breakout if any field ever contains
  // a literal "</script>".
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: b.name,
    image: b.hero,
    description: `Co-own the ${b.year} ${b.name} in ${b.market}. ${formatUSD(b.pricePerShare)} per share, ${formatUSD(b.annualOpCost)}/yr all-in operating cost.`,
    brand: { "@type": "Brand", name: b.brand },
    category: "Yacht co-ownership",
    offers: {
      "@type": "Offer",
      price: b.pricePerShare,
      priceCurrency: "USD",
      availability:
        b.sharesAvailable > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: `https://ryda-web-teal.vercel.app/boats/portfolio/${b.slug}`,
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Length", value: `${b.lengthFt} ft` },
      { "@type": "PropertyValue", name: "Year", value: String(b.year) },
      { "@type": "PropertyValue", name: "Hailing port", value: b.hailingPort },
      { "@type": "PropertyValue", name: "Shares available", value: String(b.sharesAvailable) },
    ],
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Hero, image left, order panel right */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href="/boats/portfolio"
            className="text-xs font-medium uppercase tracking-[0.2em] text-marine hover:text-marine-deep"
          >
            ← Boats portfolio
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-cream-2">
                <Image
                  src={b.hero}
                  alt={`${b.year} ${b.name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  className={`object-cover ${b.flipImage ? "-scale-x-100" : ""}`}
                  style={{ objectPosition: b.imagePosition ?? "center" }}
                />
              </div>

              <div className="mt-8">
                <p className="text-xs text-mute">
                  {b.brand} · {b.year} · {b.market} · {b.hailingPort}
                </p>
                <h1 className="mt-1 font-display text-4xl font-light text-ink sm:text-5xl">
                  {b.name}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
                  {b.description}
                </p>
              </div>

              {/* Specs grid */}
              <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-rule pt-8 sm:grid-cols-3 lg:grid-cols-6">
                <Spec label="Length" value={`${b.lengthFt}'`} />
                <Spec label="Beam" value={`${b.beamFt}'`} />
                <Spec label="Draft" value={`${b.draftFt}'`} />
                <Spec label="Top speed" value={`${b.maxSpeedKnots} kts`} />
                <Spec label="Cruise" value={`${b.cruiseSpeedKnots} kts`} />
                <Spec label="Range" value={`${b.rangeNm} nm`} />
                <Spec label="Engines" value={b.engines} />
                <Spec label="Power" value={`${b.totalHp.toLocaleString()} hp`} />
                <Spec label="Capacity" value={`${b.capacity} pax`} />
                <Spec label="Sleeps" value={b.sleeps === 0 ? "Day boat" : `${b.sleeps} berths`} />
                <Spec label="Fuel" value={b.specs.fuelCap} />
                <Spec label="Water" value={b.specs.waterCap} />
              </div>
            </div>

            {/* Order panel */}
            <div className="lg:col-span-4">
              <div className="sticky top-6 rounded-2xl border border-rule bg-surface p-6 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
                  Claim a share
                </p>
                <p className="mt-2 font-display text-xl text-ink">{b.name}</p>
                <p className="mt-1 text-xs text-mute">
                  {b.sharesAvailable} of {b.shares} shares available
                </p>

                <dl className="mt-5 space-y-3 border-t border-rule pt-4 text-sm">
                  <Row label="Per share" value={formatUSD(b.pricePerShare)} bold />
                  <Row label="Annual op cost" value={`${formatUSD(b.annualOpCost)}/yr`} />
                  <Row label="Days / year" value={String(b.daysPerYear)} />
                  <Row label="Nautical mi / year" value={b.nmPerYear.toLocaleString()} />
                  <Row label="Captain" value={b.captainIncluded ? "Crewed only" : "Crewed or bareboat"} />
                </dl>

                <div className="mt-5 rounded-xl border border-rule bg-cream-2/40 p-3 text-xs">
                  <p className="font-medium text-ink">{BOATS_HOLDING_YEARS}-yr math (1 share)</p>
                  <ul className="mt-2 space-y-1 text-ink-soft">
                    <li className="flex justify-between">
                      <span>Buy-in</span>
                      <span className="tabular-nums">{formatUSD(econ.buyIn)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>{BOATS_HOLDING_YEARS}-yr carrying</span>
                      <span className="tabular-nums">{formatUSD(econ.totalCarrying)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Est. share at exit ({100 - BOATS_TARGET_DEPRECIATION_PCT}%)</span>
                      <span className="tabular-nums">−{formatUSD(econ.estimatedResale)}</span>
                    </li>
                    <li className="flex justify-between border-t border-rule pt-1.5 font-medium text-ink">
                      <span>Net cost ({BOATS_HOLDING_YEARS} yrs)</span>
                      <span className="tabular-nums">{formatUSD(econ.netCost)}</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href={`/signup?next=${encodeURIComponent(`/boats/portfolio/${b.slug}/buy?shares=1`)}&reason=buy`}
                  className={`mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-marine ${
                    b.sharesAvailable === 0 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {b.sharesAvailable === 0 ? "All shares taken" : "Reserve a share →"}
                </Link>
                <Link
                  href={`/boats/rent/${b.slug}`}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-rule px-5 text-xs font-medium text-ink-soft hover:border-ink hover:text-ink"
                >
                  Charter the same hull → {formatUSD(b.rentalDailyRate)}/day
                </Link>
                <p className="mt-4 text-center text-xs text-mute">
                  12-month minimum hold. Transferable to other verified members.
                </p>
                <div className="mt-4 border-t border-rule pt-4 text-center">
                  <Link
                    href={`/boats/portfolio/${b.slug}/cost-sheet`}
                    className="text-xs font-medium text-marine hover:text-marine-deep"
                  >
                    Full cost sheet (PDF-ready) →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ownership primitives, five-number trust block, parallel to
          the cars detail page. Marine accent. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <OwnershipPrimitives
            variant="compact"
            vertical="boats"
            title="What this share is, in five numbers"
          />
        </div>
      </section>

      {/* Cost breakdown + share value chart, the cars-portfolio parity the
          CEO flagged was missing. Boat economics use 3-yr hold and
          15% depreciation; charter scenario shown when applicable. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
                The {BOATS_HOLDING_YEARS}-year math
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                What you actually pay over the hold.
              </h2>
              <p className="mt-3 text-base text-ink-soft">
                Buy-in plus {BOATS_HOLDING_YEARS} years of all-in
                operating cost (slip, captain, fuel, insurance, hurricane
                prep) minus the modeled sale at exit. Every dollar shown
                up front; toggle the charter scenario to see how the math
                shifts when you opt your unused days into the pool.
              </p>
            </div>
            <div className="lg:col-span-7">
              <BoatCostBreakdown boat={b} shares={1} />
            </div>
          </div>
        </div>
      </section>

      {/* Share-value chart */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
                Year-by-year value
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                What your share is worth over time.
              </h2>
              <p className="mt-3 text-base text-ink-soft">
                Linear depreciation modeled at{" "}
                {(BOATS_TARGET_DEPRECIATION_PCT / BOATS_HOLDING_YEARS).toFixed(1)}%
                per year over the {BOATS_HOLDING_YEARS}-year hold. Real
                depreciation curves vary, classic Rivas appreciate, big
                sport yachts compress faster, but the chart anchors the
                conversation in numbers, not vibes.
              </p>
            </div>
            <div className="lg:col-span-7">
              <BoatShareValueChart boat={b} />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive cost calculator, parallel to cars detail. Lets
          buyers move shares + days + occupancy sliders to model their
          own scenario without leaving the listing. */}
      <section id="calculator" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Interactive calculator
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Model your own scenario.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            Move shares, expected cruising days, and charter occupancy.
            The math updates live so you can see exactly how each lever
            shifts your {BOATS_HOLDING_YEARS}-year net.
          </p>
          <div className="mt-10">
            <BoatCompareCalculator lockedBoat={b} />
          </div>
        </div>
      </section>

      {/* Booking policy callout */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            How booking works
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Two booking modes, short-notice and planned.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BookingCard
              tag="Short-notice"
              window={`${BOAT_BOOKING_POLICY.shortNotice.minDaysAdvance}–${BOAT_BOOKING_POLICY.shortNotice.maxDaysAdvance} days advance`}
              limit="Unlimited"
              consecutive={`Max ${BOAT_BOOKING_POLICY.shortNotice.maxConsecutiveDays} consecutive days`}
              example="Sunday looks clear, head to Stiltsville on Saturday."
            />
            <BookingCard
              tag="Planned"
              window={`${BOAT_BOOKING_POLICY.planned.minDaysAdvance}–${BOAT_BOOKING_POLICY.planned.maxDaysAdvance} days advance`}
              limit={`${BOAT_BOOKING_POLICY.planned.activeLimitPerShare} active per share`}
              consecutive={`${BOAT_BOOKING_POLICY.planned.maxConsecutiveDaysPeak} peak / ${BOAT_BOOKING_POLICY.planned.maxConsecutiveDaysOffPeak} off-peak`}
              example="Memorial Day weekend in May, locked in February."
            />
          </div>
          <p className="mt-5 text-xs text-mute">
            Both modes draw from your share&apos;s annual entitlement (32 days,
            1,600 nm). One protected peak window per share before any
            co-owner can book a second.
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">What&apos;s included</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Pillar
              title="Slip + dockage"
              body={`Year-round slip at ${b.hailingPort}. Dec–Mar haul-out and bottom service included in Miami.`}
            />
            <Pillar
              title="Captain hours"
              body="RYDA-vetted captain for member trips up to your share's day allowance. Mate and (sport yachts) chef included on overnight runs."
            />
            <Pillar
              title="Fuel + insurance"
              body="Generous monthly fuel budget covered. Agreed-value hull + $1M liability policy. Excess fuel billed at cost."
            />
            <Pillar
              title="Hurricane prep"
              body="Bundled. Haul-out triggered by named storms in Atlantic basin crossing latitude of Cuba, no per-event charge."
            />
          </div>
        </div>
      </section>

      {/* Or charter teaser */}
      <section className="border-b border-rule bg-ink py-14 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Try it before you commit
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">
            Charter the {b.brand} {b.model} for {formatUSD(b.rentalDailyRate)}/day.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Crewed by default, captain, mate, and (sport yachts) chef.
            Book a weekend, decide if a share fits.
          </p>
          <Link
            href={`/boats/rent/${b.slug}`}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-marine hover:text-cream"
          >
            See charter details →
          </Link>
        </div>
      </section>

      {/* Sample documents + founder call CTA, parallel to /markets/[symbol]
          which has its own founders-call CTA strip below the booking
          policy section. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-rule bg-surface p-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
                Documents
              </p>
              <h3 className="mt-3 font-display text-2xl text-ink">
                Read the LLC packet before you wire.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Operating Agreement, Management Services Agreement, marine
                survey, USCG documentation, captain employment, hurricane
                plan, and charter opt-in agreement. Redacted samples
                available pre-application.
              </p>
              <Link
                href={`/contact?type=Membership&note=${encodeURIComponent(`Sample documents, ${b.name}`)}#form`}
                className="mt-6 inline-flex h-11 items-center justify-center border border-ink bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-marine hover:border-marine"
              >
                Request the packet
              </Link>
            </div>
            <div className="rounded-2xl border border-rule bg-surface p-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
                Talk to a founder
              </p>
              <h3 className="mt-3 font-display text-2xl text-ink">
                Schedule a 30-minute call.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Walk through the {b.name} cost sheet, hurricane protocol,
                slip rotation, and member calendar with a real human. No
                commitment.
              </p>
              <Link
                href={`/contact?type=Membership&note=${encodeURIComponent(`Schedule a call, ${b.name}`)}#form`}
                className="mt-6 inline-flex h-11 items-center justify-center border border-ink px-6 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream"
              >
                Schedule a call
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer, parallel to /markets/[symbol] footer disclaimer */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-12 text-center text-xs text-mute sm:px-10">
          <p>
            RYDA Boats co-ownership stakes are membership interests in
            single-purpose member-managed LLCs, not registered
            securities, not offered for investment purposes. Modeled
            depreciation and charter income are illustrative only; actual
            results depend on use, market, and operator. See the{" "}
            <Link href="/legal/disclaimer" className="text-marine hover:text-marine-deep">
              Co-Ownership Disclaimer
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.14em] text-mute">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-ink-soft">{label}</span>
      <span className={`tabular-nums ${bold ? "font-display text-base text-ink" : "font-medium text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function BookingCard({
  tag,
  window,
  limit,
  consecutive,
  example,
}: {
  tag: string;
  window: string;
  limit: string;
  consecutive: string;
  example: string;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-marine">
          {tag}
        </p>
        <span className="text-[10px] uppercase tracking-wider text-mute">
          {window}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{limit}</p>
      <p className="mt-1 text-xs text-ink-soft">{consecutive}</p>
      <p className="mt-3 text-[11px] italic text-mute">{example}</p>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
