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
                  {`The ${title} is run by a Miami operator on RYDA's rental grid. Send your dates and the operator confirms availability and price directly with you — then closes the rental on their own contract and insurance, at their price. Inquiring through RYDA never costs more than going direct.`}
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

            {/* Booking card. The headline rate lives INSIDE the client
                card now: `dailyRate` here is partner-fleet.ts's static
                figure, and the quote inside the form is priced from
                rental_listings.daily_rate_cents — the card resolves the
                two rather than rendering both. */}
            <div className="lg:col-span-4">
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

      {/* Trust strip: who hosts the car, then the badges. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Hosted by — the operator, never RYDA. RYDA owns, stores,
                insures and operates no vehicle on this platform (Terms
                §2), so the RYDA monogram that used to sit here was false
                on every listing. The attribution stays, because "whose
                car is this?" is the question this slot answers, but the
                honest answer is an operator we don't name. No
                response-time claim either — nothing in this codebase
                measures one — and no vetting claim: Stripe Connect
                onboarding of a business and a bank account is the only
                check RYDA runs on an operator. The promise that the
                operator "introduces themselves when they confirm" is
                deleted too; nothing in the code produces it. */}
            <div className="lg:col-span-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                Hosted by
              </p>
              <p className="mt-3 font-display text-xl text-ink">
                A Miami operator
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                The car is owned and run by an independent Miami operator.
                RYDA lists it and passes your request on. Listings stay
                unbranded.
              </p>
            </div>

            {/* Trust badges. These may only promise what the lead-gen
                model delivers — insurance, mileage, and availability are
                the operator's to confirm, never RYDA's to guarantee.
                Three badges are deleted: "Min driver age 28+" and
                "Experience 5+ years" (see the booking column — no such
                figure exists anywhere in this repo, and eligibility is
                the operator's), and "Operator · Vetted by RYDA", which
                presented a payments onboarding step as a safety check.
                Nothing replaces them. */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <TrustBadge label="Insurance" value="Operator's policy" />
                <TrustBadge label="Your price" value="The operator's price" />
                <TrustBadge label="Availability" value="Operator confirms" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment options.
          A "Deliverable to" column stood beside this one on all 37
          listing pages and is deleted whole: the heading "Delivery
          across the region", the line "Most operators deliver and
          collect across the region", and a six-city drop-off list
          (Miami Beach, Fort Lauderdale, Palm Beach, Naples, The Keys)
          plus dead Los Angeles and New York variants of the same list.
          Nothing in this repo carries a delivery radius, window,
          minimum or rate for any car — PartnerVehicle has no delivery
          field — so every word of it was invented, and "most operators"
          described a population of one (partner is the literal type
          "GM LUXE"). The LA/NY branches could never render either:
          market is the literal type "Miami". Delivery is a question for
          the operator's reply; RYDA has nothing to state here. */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Payment settles on the OPERATOR's own Stripe account
                (fee-only direct charges, 0041) — rental money never
                enters a RYDA balance, and this page must not imply it
                does. It must not claim the opposite either: the Checkout
                link is created and emailed BY RYDA, so "no payment
                through RYDA" sets up a bait-and-switch when that email
                arrives. */}
            <div className="lg:col-span-7">
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
            {/* "Your request goes straight to the Miami operator" stood
                here on all 37 listing pages and was false:
                PARTNER_INQUIRY_EMAILS in src/lib/partner-contacts.ts is
                empty — its one entry is commented out pending a signed
                referral agreement — so partnerInquiryEmail() returns the
                RYDA team inbox for every car and a person forwards the
                lead. RYDA in the middle is the truth; say it, so the
                customer is not left concluding the operator ignored
                them. */}
            <Pillar
              title="An operator"
              body="Your request comes to RYDA, and we pass it to the Miami operator who runs this car. They confirm availability directly with you."
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
