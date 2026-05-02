import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BOATS, getBoatBySlug, formatUSD } from "@/lib/boat-data";

export async function generateStaticParams() {
  return BOATS.filter((b) => b.rentalAvailable).map((b) => ({ slug: b.slug }));
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBoatBySlug(slug);
  if (!b) return { title: "RYDA Boats Charter" };
  return {
    title: `Charter the ${b.name} — ${formatUSD(b.rentalDailyRate)}/day | RYDA Boats`,
    description: `Crewed charter on the ${b.year} ${b.name}. ${b.lengthFt}-foot ${b.category}, captain + mate included, full insurance, white-glove handover. ${b.market}.`,
  };
}

export default async function BoatCharterDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBoatBySlug(slug);
  if (!b || !b.rentalAvailable) notFound();

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " · 9:00 AM";
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const startLabel = fmt(start);
  const endLabel = fmt(end);

  const ratesByDuration = [
    { days: 1, total: b.rentalDailyRate, save: 0 },
    { days: 3, total: b.rentalDailyRate * 3 * 0.97, save: 3 },
    { days: 7, total: b.rentalDailyRate * 7 * 0.92, save: 8 },
  ];

  return (
    <>
      <SiteHeader />

      {/* Top split: hero + booking */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href="/boats/rent"
            className="text-xs font-medium uppercase tracking-[0.2em] text-marine hover:text-marine-deep"
          >
            ← Charters
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

              {/* Specs */}
              <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-rule pt-8 sm:grid-cols-3 lg:grid-cols-6">
                <Spec label="Length" value={`${b.lengthFt}'`} />
                <Spec label="Beam" value={`${b.beamFt}'`} />
                <Spec label="Capacity" value={`${b.capacity} pax`} />
                <Spec label="Sleeps" value={b.sleeps === 0 ? "Day boat" : `${b.sleeps} berths`} />
                <Spec label="Cruise" value={`${b.cruiseSpeedKnots} kts`} />
                <Spec label="Range" value={`${b.rangeNm} nm`} />
              </div>
            </div>

            {/* Booking card */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-3xl text-ink tabular-nums">
                    {formatUSD(b.rentalDailyRate)}
                  </p>
                  <p className="text-sm text-mute">/day</p>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  Captain + mate included · Full insurance · Fuel allowance
                </p>

                <div className="mt-5 space-y-3">
                  <Field label="Start" value={startLabel} />
                  <Field label="End" value={endLabel} />
                  <Field label="Duration" value="1 day" />
                  <Field label="Pickup" value={b.hailingPort} />
                </div>

                <div className="mt-5 border-t border-rule pt-4 text-sm">
                  <Row label="Day rate" value={formatUSD(b.rentalDailyRate)} />
                  <Row label="Service fee (8%)" value={formatUSD(b.rentalDailyRate * 0.08)} />
                  <Row label="Crew gratuity (suggested 18%)" value={formatUSD(b.rentalDailyRate * 0.18)} />
                  <Row label="Insurance" value="Included" />
                  <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-3 font-display text-lg text-ink">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatUSD(b.rentalDailyRate * 1.26)}
                    </span>
                  </div>
                </div>

                {/* Driver requirements */}
                <div className="mt-4 space-y-2 rounded-xl border border-rule bg-cream-2/40 p-3 text-[11px] text-ink-soft">
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Cash deposit (refundable)</span>
                    <span className="font-medium text-ink tabular-nums">
                      {formatUSD(Math.max(10_000, Math.round(b.rentalDailyRate * 0.5)))}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Captain</span>
                    <span className="font-medium text-ink">RYDA-vetted</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Min charter age</span>
                    <span className="font-medium text-ink">28+</span>
                  </div>
                </div>

                <Link
                  href={`/signup?next=${encodeURIComponent(`/contact?type=Rental&note=${encodeURIComponent(`Charter request: ${b.name} · ${b.market}`)}#form`)}&reason=rent`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-marine px-7 py-3 text-sm font-semibold text-cream transition-colors hover:bg-marine-deep"
                >
                  Request charter
                </Link>
                <p className="mt-3 text-center text-xs text-mute">
                  We&apos;ll confirm availability within one business day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip — parallel to /rent/[symbol] hosted-by + trust badges */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Hosted by RYDA */}
            <div className="lg:col-span-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                Operated by
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-cream font-display text-lg">
                  R
                </div>
                <div>
                  <p className="font-display text-base text-ink">RYDA Boats</p>
                  <p className="text-[11px] text-ink-soft">
                    Typically responds within 30 min · business hours
                  </p>
                </div>
              </div>
            </div>

            {/* Trust badges grid */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <TrustBadge label="Captain" value="USCG licensed" />
                <TrustBadge label="Crew" value="Captain + mate" />
                <TrustBadge label="Insurance" value="$1M liability" />
                <TrustBadge label="Hull coverage" value="Agreed value" />
                <TrustBadge label="Fuel allowance" value="Bay-day budget" />
                <TrustBadge label="Min charter" value="6 hours" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Duration discounts */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Longer charters, better rates</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ratesByDuration.map((rate) => (
              <div key={rate.days} className="rounded-xl border border-rule bg-surface p-5">
                <p className="text-xs text-mute">{rate.days} {rate.days === 1 ? "day" : "days"}</p>
                <p className="mt-2 font-display text-xl text-ink tabular-nums">
                  {formatUSD(rate.total)}
                </p>
                {rate.save > 0 && (
                  <p className="mt-1 text-xs font-medium text-marine">
                    Save {rate.save}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's included — parallel to /rent/[symbol] What's-included
          section, boat-native (captain, fuel, insurance, hurricane). */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-3xl text-ink">
            What every {b.brand} {b.model} charter includes
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Pillar
              title="Captain + mate"
              body={
                b.captainIncluded
                  ? "Captain and mate every charter. Sport yachts also include a chef on overnight runs."
                  : "Captain available on request. Bareboat allowed for USCG-licensed members on this hull."
              }
            />
            <Pillar
              title="Full insurance"
              body="$1M third-party liability and agreed-value hull coverage. Bundled into the daily rate."
            />
            <Pillar
              title="Fuel allowance"
              body="Generous fuel budget for typical bay-day use. Long-range runs (Bimini, Bahamas) billed at cost."
            />
            <Pillar
              title="Provisioning on request"
              body="Concierge stocks the galley, ice, drinks, chef on request. Coordinated by RYDA, billed at cost."
            />
          </div>
        </div>
      </section>

      {/* Co-own teaser */}
      <section className="border-b border-rule bg-ink py-14 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Charter once. Own a piece forever.
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">
            Or claim a co-ownership share for {formatUSD(b.pricePerShare)}.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Effective ~{formatUSD(b.effectiveDailyCost)}/day in steady-state
            ops on a 30-day annual allowance vs {formatUSD(b.rentalDailyRate)}/day
            to charter. {b.sharesAvailable} of {b.shares} shares left.
          </p>
          <Link
            href={`/boats/portfolio/${b.slug}`}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-marine hover:text-cream"
          >
            See in the fleet →
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-rule pb-3">
      <span className="text-sm text-mute">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink tabular-nums">{value}</span>
    </div>
  );
}

function TrustBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rule bg-cream-2/40 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-mute">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-ink">{value}</p>
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
