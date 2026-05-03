import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PhotoGallery } from "@/components/photo-gallery";
import {
  VEHICLES,
  getVehicleBySymbol,
  formatUSD,
  type Vehicle,
} from "@/lib/market-data";
import {
  PARTNER_VEHICLES,
  brandTint,
  getPartnerVehicleBySlug,
  getPartnerGallery,
  type PartnerVehicle,
} from "@/lib/partner-fleet";

// /rent/[symbol] handles BOTH:
//   - RYDA fleet symbols (lowercased): /rent/f296, /rent/mc75, ...
//   - Partner slugs: /rent/lamborghini-huracan-evo, ...
// generateStaticParams pre-renders both kinds.
export async function generateStaticParams() {
  return [
    ...VEHICLES.filter((v) => v.rentalAvailable).map((v) => ({
      symbol: v.symbol.toLowerCase(),
    })),
    ...PARTNER_VEHICLES.map((p) => ({ symbol: p.slug })),
  ];
}

// Revalidate hourly so the booking-card default dates ("2 weeks out") stay
// fresh, never shows past dates after a few days in the wild.
export const revalidate = 3600;

type ResolvedListing =
  | { kind: "ryda"; vehicle: Vehicle }
  | { kind: "partner"; vehicle: PartnerVehicle };

function resolve(slug: string): ResolvedListing | null {
  const ryda = getVehicleBySymbol(slug);
  if (ryda && ryda.rentalAvailable) return { kind: "ryda", vehicle: ryda };
  const partner = getPartnerVehicleBySlug(slug);
  if (partner) return { kind: "partner", vehicle: partner };
  return null;
}

function listingTitle(r: ResolvedListing): string {
  return r.kind === "ryda"
    ? r.vehicle.name
    : `${r.vehicle.make} ${r.vehicle.model}`;
}

function listingDailyRate(r: ResolvedListing): number {
  return r.kind === "ryda" ? r.vehicle.rentalDailyRate : r.vehicle.dailyRate;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const r = resolve(symbol);
  if (!r) return { title: "RYDA Rentals" };
  const title = listingTitle(r);
  const rate = listingDailyRate(r);
  return {
    title: `Rent the ${title}, ${formatUSD(rate)}/day — RYDA`,
    description: `Hand-prepared, fully insured, white-glove delivered. ${title} in ${r.vehicle.market}.`,
  };
}

export default async function RentDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const r = resolve(symbol);
  if (!r) notFound();

  const dailyRate = listingDailyRate(r);
  const title = listingTitle(r);
  const market = r.vehicle.market;

  const ratesByDuration = [
    { days: 3, total: dailyRate * 3, save: 0 },
    { days: 7, total: dailyRate * 7 * 0.95, save: 5 },
    { days: 14, total: dailyRate * 14 * 0.92, save: 8 },
    { days: 30, total: dailyRate * 30 * 0.88, save: 12 },
  ];

  // Default dates: 2 weeks out, 3-day window. Dynamic so the page never
  // shows past dates.
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " · 10:00 AM";
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  const startLabel = fmt(start);
  const endLabel = fmt(end);

  const tint = r.kind === "partner" ? brandTint(r.vehicle.make) : undefined;
  const partnerGallery =
    r.kind === "partner" ? getPartnerGallery(r.vehicle) : [];

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
              {r.kind === "ryda" ? (
                <PhotoGallery
                  photos={[r.vehicle.hero]}
                  alt={`${r.vehicle.year} ${title}`}
                  flipFirst={r.vehicle.flipImage}
                  imagePosition={r.vehicle.imagePosition}
                  optimize
                />
              ) : partnerGallery.length > 0 ? (
                <PhotoGallery
                  photos={partnerGallery}
                  alt={`${r.vehicle.year ?? ""} ${title}`.trim()}
                />
              ) : (
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl"
                  style={tint ? { backgroundColor: tint } : undefined}
                >
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
                        {r.vehicle.make}
                      </p>
                      <p className="mt-1 font-display text-3xl">
                        {r.vehicle.model}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <p className="text-xs text-mute">
                  {r.kind === "ryda"
                    ? `${r.vehicle.brand} · ${r.vehicle.year} · ${market}`
                    : `${r.vehicle.make}${r.vehicle.year ? ` · ${r.vehicle.year}` : ""} · ${market}`}
                </p>
                <h1 className="mt-1 font-display text-4xl font-light text-ink sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
                  {r.kind === "ryda"
                    ? r.vehicle.description
                    : `Hand-prepared, fully insured, and white-glove delivered. The ${title} is part of the RYDA Miami fleet, book a day or a week, we handle the logistics. 100 mi/day included with overage at $4/mi; full insurance bundled.`}
                </p>
              </div>

              {/* Specs grid, only RYDA fleet has full specs; partner cards
                  use a compact info row instead. */}
              {r.kind === "ryda" ? (
                <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-rule pt-8 sm:grid-cols-3 lg:grid-cols-6">
                  <Spec label="Engine" value={r.vehicle.specs.engine} />
                  <Spec label="Power" value={r.vehicle.specs.power} />
                  <Spec label="0–60 mph" value={r.vehicle.specs.zeroToSixty} />
                  <Spec label="Top speed" value={r.vehicle.specs.topSpeed} />
                  <Spec label="Transmission" value={r.vehicle.specs.transmission} />
                  <Spec label="Color" value={r.vehicle.specs.color} />
                </div>
              ) : (
                <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-rule pt-8 sm:grid-cols-3">
                  <Spec label="Type" value={r.vehicle.category} />
                  <Spec
                    label="Year"
                    value={r.vehicle.year ? String(r.vehicle.year) : "—"}
                  />
                  <Spec
                    label="Mileage included"
                    value={r.vehicle.milesIncluded ?? "100 mi/day"}
                  />
                </div>
              )}
            </div>

            {/* Booking card */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-3xl text-ink tabular-nums">
                    {formatUSD(dailyRate)}
                  </p>
                  <p className="text-sm text-mute">/day</p>
                </div>
                {r.kind === "partner" && r.vehicle.regularRate &&
                r.vehicle.regularRate > dailyRate ? (
                  <p className="mt-1 text-xs text-mute">
                    Regular{" "}
                    <span className="line-through tabular-nums">
                      {formatUSD(r.vehicle.regularRate)}
                    </span>
                    /day
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-ink-soft">
                  Includes 100 mi/day, full insurance, white-glove handover
                </p>

                <div className="mt-5 space-y-3">
                  <Field label="Start" value={startLabel} />
                  <Field label="End" value={endLabel} />
                  <Field label="Duration" value="3 days" />
                  <Field label="Handover" value="White-glove delivery" />
                </div>

                <div className="mt-5 border-t border-rule pt-4 text-sm">
                  <Row label="3 days × $/day" value={formatUSD(dailyRate * 3)} />
                  <Row
                    label="Service fee (10%)"
                    value={formatUSD(dailyRate * 3 * 0.1)}
                  />
                  <Row label="Insurance" value="Included" />
                  <Row label="Delivery" value={formatUSD(450)} />
                  <Row
                    label="Estimated tax"
                    value={formatUSD(dailyRate * 3 * 0.07)}
                  />
                  <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-3 font-display text-lg text-ink">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatUSD(dailyRate * 3 * 1.17 + 450)}
                    </span>
                  </div>
                </div>

                {/* Deposit + driver requirements */}
                <div className="mt-4 space-y-2 rounded-xl border border-rule bg-cream-2/40 p-3 text-[11px] text-ink-soft">
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Cash deposit (refundable)</span>
                    <span className="font-medium text-ink tabular-nums">
                      {formatUSD(Math.max(5_000, Math.round(dailyRate * 2)))}
                      <span className="ml-1 text-mute">· half for members</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Min. driver age</span>
                    <span className="font-medium text-ink">28+</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Driving experience</span>
                    <span className="font-medium text-ink">5+ years</span>
                  </div>
                </div>

                {/* Renting requires an account (driver-record verification,
                    insurance binding, deposit hold). Browsing this page is
                    open; the CTA routes through /signup with `next=` so the
                    member returns to the same listing's contact form after
                    creating an account. Existing members hit the "Sign in"
                    link below the CTA instead. */}
                <Link
                  href={`/signup?next=${encodeURIComponent(
                    `/contact?type=Rental&note=${encodeURIComponent(
                      `Rental request: ${title} · ${market}`,
                    )}#form`,
                  )}&reason=rent`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-red px-7 py-3 text-sm font-semibold text-cream transition-colors hover:bg-red-deep"
                >
                  Request rental
                </Link>
                <Link
                  href={`/signin?next=${encodeURIComponent(
                    `/contact?type=Rental&note=${encodeURIComponent(
                      `Rental request: ${title} · ${market}`,
                    )}#form`,
                  )}&reason=rent`}
                  className="mt-2 inline-flex w-full items-center justify-center text-xs text-ink-soft hover:text-ink"
                >
                  Already a member? Sign in →
                </Link>
                <p className="mt-3 text-center text-xs text-mute">
                  We'll confirm availability within one business day. Free
                  cancellation up to 7 days before pickup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip, hosted by, response time, badges */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Hosted by RYDA */}
            <div className="lg:col-span-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                Hosted by
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-cream font-display text-lg">
                  R
                </div>
                <div>
                  <p className="font-display text-base text-ink">RYDA</p>
                  <p className="text-[11px] text-ink-soft">
                    Typically responds within 30 min · business hours
                  </p>
                </div>
              </div>
            </div>

            {/* Trust badges grid */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <TrustBadge label="Min driver age" value="28+" />
                <TrustBadge label="Experience" value="5+ years" />
                <TrustBadge label="Booking" value="Secured" />
                <TrustBadge label="Insurance" value="$1M liability" />
                <TrustBadge label="Mileage" value="100 mi/day incl." />
                <TrustBadge label="Availability" value="Live calendar" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverable to + Payment options */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-red">
                Deliverable to
              </p>
              <p className="mt-2 font-display text-2xl text-ink">
                White-glove delivery across the region.
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                We deliver and collect the vehicle to any address. Min 3-day
                rental for in-market delivery; 7-day minimum for cross-state.
                Delivery and pick-up rates from $450.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-ink-soft sm:grid-cols-3">
                {(market === "Miami"
                  ? [
                      "Miami",
                      "Miami Beach",
                      "Fort Lauderdale",
                      "Palm Beach",
                      "Naples",
                      "The Keys",
                    ]
                  : market === "Los Angeles"
                    ? [
                        "Los Angeles",
                        "Beverly Hills",
                        "Malibu",
                        "Newport Beach",
                        "Palm Springs",
                        "Pasadena",
                      ]
                    : [
                        "New York",
                        "Hamptons",
                        "Greenwich",
                        "Hudson Valley",
                        "Newport",
                        "Cape Cod",
                      ]
                ).map((city) => (
                  <li key={city} className="flex items-center gap-2">
                    <span className="inline-block h-1 w-1 rounded-full bg-red" />
                    {city}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-red">
                Payment options
              </p>
              <p className="mt-2 font-display text-2xl text-ink">
                Multiple ways to settle.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Wire", "ACH", "Credit card", "Debit card"].map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-rule bg-surface px-3 py-1 text-xs font-medium text-ink"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-mute">
                Members on RYDA Blue or Black get reduced deposits and
                priority booking on peak weekends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Duration discounts */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-3xl text-ink">Longer trips, better rates</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ratesByDuration.map((rate) => (
              <div key={rate.days} className="rounded-xl border border-rule bg-surface p-5">
                <p className="text-xs text-mute">{rate.days} days</p>
                <p className="mt-2 font-display text-xl text-ink tabular-nums">
                  {formatUSD(rate.total)}
                </p>
                {rate.save > 0 && (
                  <p className="mt-1 text-xs font-medium text-red">
                    Save {rate.save}%
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
            <Pillar
              title="Full insurance"
              body="$1M third-party liability. Agreed-value physical damage with low deductible."
            />
            <Pillar
              title="100 miles / day"
              body="Industry-standard included mileage. Extra miles at $4/mi at the time of booking."
            />
            <Pillar
              title="24/7 roadside"
              body="Single number, replacement vehicle if anything goes wrong."
            />
            <Pillar
              title="White-glove handover"
              body="Vehicle delivered washed, fueled, photo-documented."
            />
            {r.kind === "ryda" && r.vehicle.trackEligible && (
              <Pillar
                title="Track-day eligible"
                body="Optional unlimited-miles track package + helmet drop-off."
              />
            )}
          </div>
        </div>
      </section>

      {/* Or claim a co-ownership share, only for RYDA fleet with shares left */}
      {r.kind === "ryda" && r.vehicle.sharesAvailable > 0 && (
        <section className="border-b border-rule bg-ink py-14 text-cream">
          <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Drive once. Own a piece forever.
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Or claim a co-ownership share for ~{formatUSD(r.vehicle.pricePerShare)}.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
              Effective {formatUSD(r.vehicle.effectiveDailyCost)}/day in
              steady-state ops vs. {formatUSD(r.vehicle.rentalDailyRate)}/day
              to rent. {r.vehicle.sharesAvailable} of {r.vehicle.shares}{" "}
              shares left.
            </p>
            <Link
              href={`/markets/${r.vehicle.symbol}`}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              See in the fleet →
            </Link>
          </div>
        </section>
      )}

      {/* Partner-only: pitch the co-ownership story without offering a share on this car */}
      {r.kind === "partner" && (
        <section className="border-b border-rule bg-ink py-14 text-cream">
          <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Beyond the rental
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Renting is your test drive. Co-ownership is the relationship.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
              The RYDA co-ownership fleet runs ~$221/day in steady-state
              ops on a Ferrari versus $2,400/day to rent the same car.
              See if a curated certified pre owned share fits before your next trip.
            </p>
            <Link
              href="/markets"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              See the co-ownership fleet →
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

function TrustBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rule bg-cream-2/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">
        {label}
      </p>
      <p className="mt-1 font-display text-base text-ink">{value}</p>
    </div>
  );
}
