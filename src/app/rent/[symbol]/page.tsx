import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PhotoGallery } from "@/components/photo-gallery";
import { RentalInquiryForm } from "@/components/rental-inquiry-form";
import { formatUSD } from "@/lib/market-data";
import {
  PARTNER_VEHICLES,
  brandTint,
  getPartnerVehicleBySlug,
  getPartnerGallery,
  type PartnerVehicle,
} from "@/lib/partner-fleet";

// /rent/[symbol] resolves ONE kind of thing: a partner listing slug
// (/rent/lamborghini-huracan-evo). The route param is still named
// `symbol` because renaming a dynamic segment renames the folder and
// every link that reaches it; the RYDA-fleet symbols it was named for
// are gone.
export async function generateStaticParams() {
  return PARTNER_VEHICLES.map((p) => ({ symbol: p.slug }));
}

// Revalidate hourly so statically-prerendered listing content stays fresh.
// (Booking dates are now computed client-side inside RentalInquiryForm,
// so there's no build-time date to go stale.)
export const revalidate = 3600;

function resolve(slug: string): PartnerVehicle | null {
  return getPartnerVehicleBySlug(slug) ?? null;
}

function listingTitle(v: PartnerVehicle): string {
  return `${v.make} ${v.model}`;
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
  return {
    title: `Rent the ${title} · ${formatUSD(r.dailyRate)}/day`,
    // Every car is fulfilled by the operator on their own contract and
    // insurance — the metadata must not promise RYDA fulfillment.
    description: `Request your dates and a vetted Miami operator confirms availability and price directly with you. ${title} in ${r.market}.`,
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

  const dailyRate = r.dailyRate;
  const title = listingTitle(r);
  const market = r.market;

  const tint = brandTint(r.make);
  const partnerGallery = getPartnerGallery(r);

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
              {partnerGallery.length > 0 ? (
                <PhotoGallery
                  photos={partnerGallery}
                  alt={`${r.year ?? ""} ${title}`.trim()}
                />
              ) : (
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl"
                  style={{ backgroundColor: tint }}
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
                        {r.make}
                      </p>
                      <p className="mt-1 font-display text-3xl">{r.model}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <p className="text-xs text-mute">
                  {`${r.make}${r.year ? ` · ${r.year}` : ""} · ${market}`}
                </p>
                <h1 className="mt-1 font-display text-4xl font-light text-ink sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
                  {`The ${title} is run by a vetted Miami operator on RYDA's rental grid. Send your dates and the operator confirms availability and price directly with you — then closes the rental on their own contract and insurance, at their price. Inquiring through RYDA never costs more than going direct.`}
                </p>
              </div>

              {/* Compact info row. RYDA does not hold the car, so it does
                  not publish a spec sheet for it — only what the operator's
                  listing states. */}
              <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-rule pt-8 sm:grid-cols-3">
                <Spec label="Type" value={r.category} />
                <Spec label="Year" value={r.year ? String(r.year) : "—"} />
                <Spec
                  label="Mileage included"
                  // No fabricated default — mileage terms are the
                  // operator's when the listing doesn't state them.
                  value={r.milesIncluded ?? "Confirmed by operator"}
                />
              </div>
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
                {r.regularRate && r.regularRate > dailyRate ? (
                  <p className="mt-1 text-xs text-mute">
                    Regular{" "}
                    <span className="line-through tabular-nums">
                      {formatUSD(r.regularRate)}
                    </span>
                    /day
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-ink-soft">
                  Fulfilled by a vetted Miami operator on their contract and
                  insurance
                </p>

                {/* Driver requirements — kept from the old estimate card;
                    operators impose these, so they qualify the lead. */}
                <div className="mt-4 space-y-2 rounded-xl border border-rule bg-cream-2/40 p-3 text-[11px] text-ink-soft">
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Min. driver age</span>
                    <span className="font-medium text-ink">28+</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-mute">Driving experience</span>
                    <span className="font-medium text-ink">5+ years</span>
                  </div>
                </div>

                {/* Rentals-first pivot: the static fee-estimate mock +
                    signup-gated contact CTA are replaced by the real
                    inquiry form. One request → a named operator → the
                    keys. Anon visitors get an account created alongside
                    the inquiry; the lead itself is never gated. */}
                <div className="mt-5 border-t border-rule pt-5">
                  <RentalInquiryForm
                    vehicleSlug={r.slug}
                    vehicleName={title}
                    market={market}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip: who hosts the car, then the badges. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Hosted by — the operator, never RYDA. RYDA owns, stores,
                insures and operates no vehicle on this platform (Terms
                §2), so the RYDA monogram that used to sit here was false
                on every listing. The attribution stays, because "whose
                car is this?" is the question this slot answers, but the
                honest answer is an operator we don't name: listings are
                unbranded and the operator introduces themselves when
                they confirm. No response-time claim either — nothing in
                this codebase measures one. */}
            <div className="lg:col-span-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                Hosted by
              </p>
              <p className="mt-3 font-display text-xl text-ink">
                A vetted Miami operator
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                The car is owned and run by an independent Miami operator we
                vet. RYDA lists it and passes your request on — listings
                stay unbranded, and the operator introduces themselves when
                they confirm your dates.
              </p>
            </div>

            {/* Trust badges. These may only promise what the lead-gen
                model delivers — insurance, mileage, and availability are
                the operator's to confirm, never RYDA's to guarantee. */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <TrustBadge label="Min driver age" value="28+" />
                <TrustBadge label="Experience" value="5+ years" />
                <TrustBadge label="Operator" value="Vetted by RYDA" />
                <TrustBadge label="Insurance" value="Operator's policy" />
                <TrustBadge label="Your price" value="The operator's price" />
                <TrustBadge label="Availability" value="Operator confirms" />
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
                Delivery across the region.
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Most operators deliver and collect across the region. Delivery
                windows, minimums, and rates are the operator&apos;s — they
                confirm the details directly with you when they reply.
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

            {/* Payment settles on the OPERATOR's own Stripe account
                (fee-only direct charges, 0041) — rental money never
                enters a RYDA balance, and this page must not imply it
                does. It must not claim the opposite either: the Checkout
                link is created and emailed BY RYDA, so "no payment
                through RYDA" sets up a bait-and-switch when that email
                arrives. */}
            <div className="lg:col-span-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-red">
                Payment
              </p>
              <p className="mt-2 font-display text-2xl text-ink">
                Straight to the operator.
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                No card at request. Once the operator confirms your dates we
                send a secure Stripe link — the charge settles on the
                operator&apos;s own Stripe account. Your price is the
                operator&apos;s price.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How the rental works. Every pillar here has to be something the
          lead-gen model actually delivers — RYDA holds no car, so it
          promises no insurance, no mileage, no handover, and quotes no
          duration discount it could not honor. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-3xl text-ink">
            How the rental works
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              title="No card at request"
              body="No card at request. Nothing is charged until you and the operator confirm the booking together."
            />
          </div>
        </div>
      </section>

      {/* No ownership-program pitch here, and nowhere else either —
          that product is not part of this repo. */}
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
