import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
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
    title: `${b.name} — ${formatUSD(b.pricePerShare)} per share | RYDA Boats`,
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

  return (
    <>
      <SiteHeader />

      {/* Hero — image left, order panel right */}
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
                  href={`/signup?next=${encodeURIComponent(`/contact?type=Membership&note=${encodeURIComponent(`Reserve a share: ${b.name}`)}#form`)}&reason=buy`}
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
              </div>
            </div>
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
            Two booking modes — short-notice and planned.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BookingCard
              tag="Short-notice"
              window={`${BOAT_BOOKING_POLICY.shortNotice.minDaysAdvance}–${BOAT_BOOKING_POLICY.shortNotice.maxDaysAdvance} days advance`}
              limit="Unlimited"
              consecutive={`Max ${BOAT_BOOKING_POLICY.shortNotice.maxConsecutiveDays} consecutive days`}
              example="Sunday looks clear — head to Stiltsville on Saturday."
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
            Both modes draw from your share&apos;s annual entitlement (30 days,
            1,500 nm). One protected peak window per share before any
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
              body="Bundled. Haul-out triggered by named storms in Atlantic basin crossing latitude of Cuba — no per-event charge."
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
            Crewed by default — captain, mate, and (sport yachts) chef.
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
