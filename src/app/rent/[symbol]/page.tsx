import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { VEHICLES, getVehicleBySymbol, formatUSD } from "@/lib/market-data";

export async function generateStaticParams() {
  return VEHICLES.filter((v) => v.rentalAvailable).map((v) => ({
    symbol: v.symbol.toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v) return { title: "RYDA Rentals" };
  return {
    title: `Rent the ${v.name} — ${formatUSD(v.rentalDailyRate)}/day | RYDA`,
    description: `Hand-prepared, fully insured, white-glove delivered. ${v.year} ${v.name} in ${v.market}.`,
  };
}

export default async function RentDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v || !v.rentalAvailable) notFound();

  const ratesByDuration = [
    { days: 3, total: v.rentalDailyRate * 3, save: 0 },
    { days: 7, total: v.rentalDailyRate * 7 * 0.95, save: 5 },
    { days: 14, total: v.rentalDailyRate * 14 * 0.92, save: 8 },
    { days: 30, total: v.rentalDailyRate * 30 * 0.88, save: 12 },
  ];

  return (
    <>
      <SiteHeader />

      {/* Top split: hero image + booking panel */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href="/rent"
            className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
          >
            ← Rentals
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Hero + meta */}
            <div className="lg:col-span-8">
              <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-cream-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.hero}
                  alt={v.name}
                  className={`h-full w-full object-cover ${v.flipImage ? "-scale-x-100" : ""}`}
                  style={{ objectPosition: v.imagePosition ?? "center" }}
                />
              </div>

              <div className="mt-8">
                <p className="text-xs text-mute">{v.brand} · {v.year} · {v.market}</p>
                <h1 className="mt-1 font-display text-4xl font-light text-ink sm:text-5xl">
                  {v.name}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
                  {v.description}
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-rule pt-8 sm:grid-cols-3 lg:grid-cols-6">
                <Spec label="Engine" value={v.specs.engine} />
                <Spec label="Power" value={v.specs.power} />
                <Spec label="0–60 mph" value={v.specs.zeroToSixty} />
                <Spec label="Top speed" value={v.specs.topSpeed} />
                <Spec label="Transmission" value={v.specs.transmission} />
                <Spec label="Color" value={v.specs.color} />
              </div>
            </div>

            {/* Booking card */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-3xl text-ink tabular-nums">
                    {formatUSD(v.rentalDailyRate)}
                  </p>
                  <p className="text-sm text-mute">/day</p>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  Includes 200 mi/day, full insurance, white-glove handover
                </p>

                <div className="mt-5 space-y-3">
                  <Field label="Start" value="Apr 28, 2026 · 10:00 AM" />
                  <Field label="End" value="May 1, 2026 · 10:00 AM" />
                  <Field label="Duration" value="3 days" />
                  <Field label="Handover" value="White-glove delivery" />
                </div>

                <div className="mt-5 border-t border-rule pt-4 text-sm">
                  <Row label="3 days × $/day" value={formatUSD(v.rentalDailyRate * 3)} />
                  <Row label="Service fee (10%)" value={formatUSD(v.rentalDailyRate * 3 * 0.1)} />
                  <Row label="Insurance" value="Included" />
                  <Row label="Delivery" value={formatUSD(450)} />
                  <Row label="Estimated tax" value={formatUSD(v.rentalDailyRate * 3 * 0.07)} />
                  <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-3 font-display text-lg text-ink">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatUSD(v.rentalDailyRate * 3 * 1.17 + 450)}
                    </span>
                  </div>
                </div>

                <button className="mt-5 w-full rounded-full bg-red px-7 py-3 text-sm font-semibold text-cream transition-colors hover:bg-red-deep">
                  Reserve for Apr 28
                </button>
                <p className="mt-3 text-center text-xs text-mute">
                  Free cancellation up to 7 days before pickup
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Duration discounts */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Longer trips, better rates</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ratesByDuration.map((r) => (
              <div key={r.days} className="rounded-xl border border-rule bg-surface p-5">
                <p className="text-xs text-mute">{r.days} days</p>
                <p className="mt-2 font-display text-xl text-ink tabular-nums">
                  {formatUSD(r.total)}
                </p>
                {r.save > 0 && (
                  <p className="mt-1 text-xs font-medium text-[#00C805]">
                    Save {r.save}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">What's included</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Pillar title="Full insurance" body="$1M third-party liability. Agreed-value physical damage with low deductible." />
            <Pillar title="200 miles / day" body="Generous baseline. Extra miles available at the time of booking." />
            <Pillar title="24/7 roadside" body="Single number, replacement vehicle if anything goes wrong." />
            <Pillar title="White-glove handover" body="Vehicle delivered washed, fueled, photo-documented." />
            {v.trackEligible && (
              <Pillar title="Track-day eligible" body="Optional unlimited-miles track package + helmet drop-off." />
            )}
          </div>
        </div>
      </section>

      {/* Want to own it? */}
      {v.sharesAvailable > 0 && (
        <section className="border-b border-rule bg-ink py-14 text-cream">
          <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Drive once. Own it forever.
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Or buy a share for ~{formatUSD(v.pricePerShare)}.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
              Effective {formatUSD(v.effectiveDailyCost)}/day vs. {formatUSD(v.rentalDailyRate)}
              /day to rent. {v.sharesAvailable} of {v.shares} shares left.
            </p>
            <Link
              href={`/markets/${v.symbol}`}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              See on the market →
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
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

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
