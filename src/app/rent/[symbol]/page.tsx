import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PhotoGallery } from "@/components/photo-gallery";
import { RentalBookingCard } from "@/components/rental-booking-card";
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

// Revalidate hourly so statically-prerendered listing content stays fresh.
// (Booking dates are now computed client-side inside RentalInquiryForm,
// so there's no build-time date to go stale.)
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
  if (!r) return { title: "Rentals" };
  const title = listingTitle(r);
  const rate = listingDailyRate(r);
  return {
    title: `Rent the ${title} · ${formatUSD(rate)}/day`,
    // Partner cars are fulfilled by the operator on their own contract
    // and insurance — the metadata must not promise RYDA fulfillment.
    description:
      r.kind === "ryda"
        ? `Hand-prepared, fully insured, white-glove delivered. ${title} in ${r.vehicle.market}.`
        : `Request your dates and a vetted Miami operator confirms availability and price directly with you. ${title} in ${r.vehicle.market}.`,
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

  const tint = r.kind === "partner" ? brandTint(r.vehicle.make) : undefined;
  const partnerGallery =
    r.kind === "partner" ? getPartnerGallery(r.vehicle) : [];

  return (
    <>
      <SiteHeader />

      {/* Top split: hero image + booking panel */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          {/* /rent is the canonical browse grid ("/" is the landing
              page), so the breadcrumb points there. */}
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
                    : `The ${title} is run by a vetted Miami operator on RYDA's rental grid. Send your dates and the operator confirms availability and price directly with you — then closes the rental on their own contract and insurance, at their price. Inquiring through RYDA never costs more than going direct.`}
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
                    // No fabricated default — mileage terms are the
                    // operator's when the listing doesn't state them.
                    value={r.vehicle.milesIncluded ?? "Confirmed by operator"}
                  />
                </div>
              )}
            </div>

            {/* Booking card. The headline rate lives INSIDE the client
                card now: `dailyRate` here is partner-fleet.ts's static
                figure, and the quote inside the form is priced from
                rental_listings.daily_rate_cents — the card resolves the
                two rather than rendering both. */}
            <div className="lg:col-span-4">
              <RentalBookingCard
                vehicleSlug={r.kind === "ryda" ? r.vehicle.symbol : r.vehicle.slug}
                vehicleName={title}
                market={market}
                fallbackDailyRate={dailyRate}
                regularRate={r.kind === "partner" ? r.vehicle.regularRate : null}
                includesNote={
                  r.kind === "ryda"
                    ? "Includes 100 mi/day, full insurance, white-glove handover"
                    : "Fulfilled by a vetted Miami operator on their contract and insurance"
                }
              />
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

            {/* Trust badges grid. RYDA-fleet cars carry RYDA's own
                fulfillment promises; partner cars must only promise
                what the lead-gen model delivers — insurance, mileage,
                and availability are the operator's to confirm. */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <TrustBadge label="Min driver age" value="28+" />
                <TrustBadge label="Experience" value="5+ years" />
                {r.kind === "ryda" ? (
                  <>
                    <TrustBadge label="Booking" value="Secured" />
                    <TrustBadge label="Insurance" value="$1M liability" />
                    <TrustBadge label="Mileage" value="100 mi/day incl." />
                    <TrustBadge label="Availability" value="Live calendar" />
                  </>
                ) : (
                  <>
                    <TrustBadge label="Operator" value="Vetted by RYDA" />
                    <TrustBadge label="Insurance" value="Operator's policy" />
                    <TrustBadge label="Your price" value="The operator's price" />
                    <TrustBadge label="Availability" value="Operator confirms" />
                  </>
                )}
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
                {r.kind === "ryda"
                  ? "White-glove delivery across the region."
                  : "Delivery across the region."}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                {r.kind === "ryda"
                  ? "We deliver and collect the vehicle to any address. Min 3-day rental for in-market delivery; 7-day minimum for cross-state. Delivery and pick-up rates from $450."
                  : "Most operators deliver and collect across the region. Delivery windows, minimums, and rates are the operator's — they confirm the details directly with you when they reply."}
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

            {/* Payment: RYDA-fleet cars settle with RYDA; partner cars
                settle on the OPERATOR's own Stripe account (fee-only
                direct charges, 0041) — rental money never enters a RYDA
                balance, and this page must not imply it does. It must
                not claim the opposite either: the Checkout link is
                created and emailed BY RYDA, so "no payment through RYDA"
                sets up a bait-and-switch when that email arrives. (No
                membership upsell here — co-ownership/membership copy
                stays off rental surfaces.) */}
            <div className="lg:col-span-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-red">
                Payment
              </p>
              {r.kind === "ryda" ? (
                <>
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
                </>
              ) : (
                <>
                  <p className="mt-2 font-display text-2xl text-ink">
                    Straight to the operator.
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    No card at request. Once the operator confirms your
                    dates we send a secure Stripe link — the charge settles
                    on the operator&apos;s own account and RYDA never holds
                    your money. Your price is the operator&apos;s price.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Duration discounts — RYDA fleet only. Partner pricing is the
          operator's; quoting duration discounts RYDA can't honor would
          contradict "your price is the operator's price". */}
      {r.kind === "ryda" && (
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
      )}

      {/* What's included (RYDA fleet) / How the rental works (partner).
          The RYDA pillars are fulfillment promises — insurance, mileage,
          roadside, handover — that only hold for RYDA's own cars. On
          partner listings the honest pillars are the lead-gen model. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">
            {r.kind === "ryda" ? "What's included" : "How the rental works"}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {r.kind === "ryda" ? (
              <>
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
                {r.vehicle.trackEligible && (
                  <Pillar
                    title="Track-day eligible"
                    body="Optional unlimited-miles track package + helmet drop-off."
                  />
                )}
              </>
            ) : (
              <>
                <Pillar
                  title="A vetted operator"
                  body="Your request goes straight to the Miami operator who runs this car. They reply by name and confirm availability directly with you."
                />
                <Pillar
                  title="Their contract & insurance"
                  body="The rental closes on the operator's own agreement and coverage — the same terms you'd get going direct. Delivery, deposit, and mileage are theirs to confirm."
                />
                <Pillar
                  title="The operator's price"
                  body="Inquiring through RYDA never costs more than going direct. Operators pay RYDA a referral commission on bookings we send them — that's the whole model."
                />
                <Pillar
                  title="No payment through RYDA"
                  body="No card at request. Nothing is charged until you and the operator confirm the booking together."
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* No co-ownership pitch here. The program is parked (2027
          waitlist) and the pivot's rule is co-ownership stays out of
          rental-surface copy — the footer link (Cars column in
          site-footer) and the quiet pointer at the end of
          /how-it-works are the only sanctioned references. */}
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
