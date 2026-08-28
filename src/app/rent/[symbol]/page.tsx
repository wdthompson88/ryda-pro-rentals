import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { PhotoGallery } from "@/components/photo-gallery";
import { RentalBookingCard } from "@/components/rental-booking-card";
import { formatUSD } from "@/lib/market-data";
import {
  PARTNER_VEHICLES,
  brandTint,
  getPartnerVehicleBySlug,
  getPartnerGallery,
  type PartnerVehicle,
} from "@/lib/partner-fleet";
import { getRentalTerms } from "@/lib/partner-rental-terms";

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
    // insurance — the metadata must not promise RYDA fulfillment, and
    // must not call the operator "vetted": the only check RYDA runs is
    // Stripe Connect onboarding of a business and a bank account.
    description: `Request your dates and a Miami operator confirms availability and price directly with you. ${title} in ${r.market}.`,
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
  const terms = getRentalTerms(r.slug);

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
                  {`Send your dates and the operator confirms availability and price directly with you, then closes the rental on their own contract and insurance.`}
                </p>
              </div>

              {/* Compact spec table — bordered hairline grid (the same
                  gap-px bg-rule pattern /how-it-works uses for "The
                  model"), formalized in the design system as the
                  standard fact-grid treatment. RYDA does not hold the
                  car, so it does not publish a spec sheet for it — only
                  what the operator's listing states; these are the same
                  three fields the old loose layout showed, just given
                  the visual weight of a real spec table. */}
              <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-3">
                <Spec label="Type" value={r.category} />
                <Spec label="Year" value={r.year ? String(r.year) : "—"} />
                <Spec
                  label="Mileage included"
                  // No fabricated default — mileage terms are the
                  // operator's when the listing doesn't state them.
                  value={r.milesIncluded ?? "Confirmed by operator"}
                />
              </div>

              {/* Rental terms — the operator's own published deposit,
                  age requirement and insurance options
                  (src/lib/partner-rental-terms.ts, scraped from the
                  listing's gmluxe.net page, not RYDA's to set or
                  guarantee). This is real, per-car data; it renders
                  only the fields that specific listing's page actually
                  states, nothing filled in. Nine listings have no
                  scraped page at all (dead product-page URL — flagged
                  separately) and render neither this block nor the
                  rates table below. */}
              {terms && (terms.minAgeYears || terms.securityDepositUsd || terms.insuranceOptionsText) && (
                <div className="mt-6">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                    Rental terms
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-3">
                    {terms.minAgeYears && (
                      <Spec label="Minimum age" value={`${terms.minAgeYears}+`} />
                    )}
                    {terms.securityDepositUsd && (
                      <Spec
                        label="Security deposit"
                        value={formatUSD(terms.securityDepositUsd, { decimals: 0 })}
                      />
                    )}
                    {terms.insuranceOptionsText && (
                      <Spec label="Insurance" value={terms.insuranceOptionsText} long />
                    )}
                  </div>
                </div>
              )}

              {/* Rates by length — the operator's own multi-day discount
                  tiers, not RYDA-derived. The booking card's headline
                  rate is one point on this same curve. */}
              {terms?.pricingTiers && terms.pricingTiers.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                    Rates by length
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-4">
                    {terms.pricingTiers.map((tier) => (
                      <Spec
                        key={tier.minDays}
                        label={tier.minDays === 1 ? "1+ day" : `${tier.minDays}+ days`}
                        value={`${formatUSD(tier.ratePerDay, { decimals: 0 })}/day`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Booking card. The headline rate lives INSIDE the client
                card now: `dailyRate` here is partner-fleet.ts's static
                figure, and the quote inside the form is priced from
                rental_listings.daily_rate_cents — the card resolves the
                two rather than rendering both.

                lg:sticky keeps the CTA in view while scrolling the
                gallery/specs — the closest honest equivalent to an
                auction site's persistent bid button, using no new
                data. top-24 clears the 71px sticky site header plus
                breathing room. */}
            <div className="lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
              {/* A "Driver requirements" panel stood here on all 37
                  listing pages: "Min. driver age 28+" and "Driving
                  experience 5+ years". Both figures are deleted, not
                  softened. Neither appears in partner-fleet.ts, in any
                  migration, or in anything the operator sends us, and
                  Terms §3 plus /trust-and-safety both state that
                  eligibility to rent a particular car is the operator's
                  to set and can differ car to car. A platform-wide number
                  turns away drivers the operator would rent to and implies
                  RYDA checks something it never sees. The booking card
                  below deliberately does not reinstate it: RYDA still has
                  no eligibility data to show. */}
              <RentalBookingCard
                vehicleSlug={r.slug}
                vehicleName={title}
                market={market}
                fallbackDailyRate={dailyRate}
                regularRate={r.regularRate ?? null}
                includesNote="Fulfilled by a Miami operator on their contract and insurance"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip, Payment options, and "How the rental works" used to
          stand here as three full-width banner sections. Founder call
          (Aug 2026): the detail page should read as just the car and
          the request form. Every fact those sections stated is still
          on the page — the real per-car data now lives in the Rental
          terms table above, and the process/payment explanation moved
          into the collapsed "How this rental works" dropdown inside
          RentalBookingCard, one click away in the requesting flow
          itself instead of marketing banners underneath it. */}
    </>
  );
}

function Spec({
  label,
  value,
  long,
}: {
  label: string;
  value: string;
  // Sentence-length values (e.g. an insurance clause) read wrong in
  // font-display — that's reserved for short facts, prices and step
  // numbers (SKILL.md). `long` swaps to body type instead.
  long?: boolean;
}) {
  return (
    <div className="bg-surface p-5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        {label}
      </dt>
      {long ? (
        <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{value}</dd>
      ) : (
        <dd className="mt-2 font-display text-lg text-ink">{value}</dd>
      )}
    </div>
  );
}
