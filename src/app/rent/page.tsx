import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { PartnerListings } from "@/components/partner-listings";
import { VEHICLES, formatUSD } from "@/lib/market-data";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";

export const metadata = {
  title: "Rent — RYDA",
  description:
    "Rent a curated supercar by the day. The RYDA fleet plus our Miami partner GM LUXE — hand-prepared, fully insured, white-glove delivery.",
};

export default function RentPage() {
  const rentable = VEHICLES.filter((v) => v.rentalAvailable);
  const partnerCount = PARTNER_VEHICLES.length;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Try before you buy
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Drive it before you own a piece of it.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Rentals are how members and prospective buyers experience a RYDA
            vehicle before committing to a share. Hand-prepared, fully insured,
            white-glove delivered.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="#ryda-fleet"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              See the RYDA fleet →
            </Link>
            <Link
              href="#partner-fleet"
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              Browse {partnerCount} partner vehicles →
            </Link>
          </div>
        </div>
      </section>

      {/* RYDA Vehicle grid */}
      <section id="ryda-fleet" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                RYDA fleet
              </p>
              <h2 className="mt-2 font-display text-3xl text-ink">
                Available now
              </h2>
            </div>
            <p className="text-sm text-mute">
              {rentable.length} vehicles · Miami · LA · NYC
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rentable.map((v) => (
              <Link
                key={v.symbol}
                href={`/rent/${v.symbol.toLowerCase()}`}
                className="group block overflow-hidden rounded-2xl border border-rule bg-surface transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                  <Image
                    src={v.hero}
                    alt={`${v.year} ${v.name}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className={`object-cover transition-transform duration-500 group-hover:scale-105 ${v.flipImage ? "-scale-x-100" : ""}`}
                    style={{ objectPosition: v.imagePosition ?? "center" }}
                  />
                  {v.trackEligible && (
                    <span className="absolute left-3 top-3 rounded-full bg-red px-3 py-1 text-xs font-medium text-cream">
                      Track-ready
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs text-mute">{v.brand} · {v.year}</p>
                  <p className="mt-1 font-display text-xl text-ink">{v.name}</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <p>
                      <span className="font-display text-2xl text-ink tabular-nums">
                        {formatUSD(v.rentalDailyRate)}
                      </span>
                      <span className="text-sm text-mute">/day</span>
                    </p>
                    <span className="text-xs text-ink-soft">{v.market}</span>
                  </div>
                  <p className="mt-2 text-xs text-mute">
                    {v.specs.power} · {v.specs.zeroToSixty} 0-60 · {v.specs.transmission}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Partner fleet — GM LUXE */}
      <section id="partner-fleet" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-2 sm:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Partner fleet · Miami
              </p>
              <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
                Plus {partnerCount} more cars from GM LUXE.
              </h2>
              <p className="mt-3 text-base text-ink-soft">
                We've partnered with{" "}
                <a
                  href="https://www.gmluxe.net/?utm_source=ryda&utm_medium=partner_listing&utm_campaign=fleet_2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink underline-offset-4 hover:underline"
                >
                  GM LUXE
                </a>
                , a Miami exotic and luxury rental house, to broaden what you
                can drive while you decide on a share. Click any card to book
                directly with GM LUXE — RYDA earns a referral, you keep their
                rates.
              </p>
            </div>
            <a
              href="https://www.gmluxe.net/?utm_source=ryda&utm_medium=partner_listing&utm_campaign=fleet_2026"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink"
            >
              GM LUXE site ↗
            </a>
          </div>
        </div>
        <PartnerListings />
      </section>

      {/* What's included */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-3xl text-ink">
            What every RYDA-fleet rental includes
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            These standards apply to RYDA-owned vehicles. Partner rentals
            (GM LUXE) are operated by the partner under their terms — see
            their site for specifics.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Pillar
              title="Full insurance"
              body="$1M third-party liability. Agreed-value physical damage with a low deductible."
            />
            <Pillar
              title="White-glove handover"
              body="Vehicle delivered washed, fueled, and prepped. Photo-documented condition both ways."
            />
            <Pillar
              title="24/7 roadside"
              body="Single number, single call. Replacement vehicle if anything goes wrong on the road."
            />
            <Pillar
              title="200 miles / day"
              body="Generous baseline included. Extra miles available; track day mode unlocks unlimited."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-rule bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Beyond the rental
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Renting is your test drive. Ownership is the relationship.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Every RYDA vehicle is also available as a co-ownership share.
            Effective ~$208/day on a co-owned Ferrari versus ~$2,500/day to
            rent it. Transfer your share to another verified member after the
            12-month minimum hold. That's where we want you to land.
          </p>
          <Link
            href="/markets"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            See the fleet →
          </Link>
        </div>
      </section>
    </>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
