import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { VEHICLES, formatUSD } from "@/lib/market-data";

export default function Home() {
  // Use the first 4 vehicles as the "featured market" carousel.
  const featured = VEHICLES.slice(0, 4);
  // Hero image: lead with the Ferrari 296 as the visual anchor.
  const heroVehicle = VEHICLES.find((v) => v.symbol === "F296") ?? VEHICLES[0];

  return (
    <>
      <SiteHeader />

      {/* Hero — copy on left, editorial vehicle image on right */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-red">
              Member-managed supercar co-ownership · Miami · Q3 2026
            </p>
            <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Co-own the world's{" "}
              <span className="italic text-red">most exceptional cars.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              Co-own a CPO Ferrari, Lamborghini, or McLaren in a Delaware
              LLC. Each share is ~30 days a year — hold one or several.
              Transfer your shares when you're done.
            </p>
            <div className="mt-10 flex justify-center sm:justify-start">
              <Link
                href="/markets"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                See the fleet →
              </Link>
            </div>
          </div>

          {/* Editorial vehicle image — links to the listing */}
          <div className="lg:col-span-6">
            <Link
              href={`/markets/${heroVehicle.symbol}`}
              aria-label={`Open ${heroVehicle.year} ${heroVehicle.name} listing`}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream-2 lg:aspect-[5/4]"
            >
              <Image
                src={heroVehicle.hero}
                alt={`${heroVehicle.year} ${heroVehicle.name}`}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className={`object-cover transition-transform duration-700 group-hover:scale-105 ${heroVehicle.flipImage ? "-scale-x-100" : ""}`}
                style={{ objectPosition: heroVehicle.imagePosition ?? "center" }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-cream/90 via-cream/30 to-transparent p-5 sm:p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-red">
                    In the fleet
                  </p>
                  <p className="mt-1 font-display text-xl text-ink sm:text-2xl">
                    {heroVehicle.year} {heroVehicle.name}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {formatUSD(heroVehicle.pricePerShare)} per share ·{" "}
                    {heroVehicle.sharesAvailable} of {heroVehicle.shares} shares
                    available
                  </p>
                </div>
                <span className="hidden text-sm font-medium text-red sm:inline">
                  View →
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured fleet — quick price/availability ticker */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Featured fleet
              </p>
              <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
                {featured.length} of {VEHICLES.length} vehicles
              </h2>
            </div>
            <Link
              href="/markets"
              className="text-sm font-medium text-red hover:text-red-deep"
            >
              See all →
            </Link>
          </div>
          <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface">
            {featured.map((v) => (
              <li key={v.symbol}>
                <Link
                  href={`/markets/${v.symbol}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <div>
                    <p className="font-display text-base text-ink">{v.name}</p>
                    <p className="text-xs text-mute">
                      {v.year} · {v.brand} · {v.market}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-ink tabular-nums">
                      {formatUSD(v.pricePerShare)}
                    </p>
                    <p className="text-xs text-mute">per share</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why RYDA — consolidated into 5-step block */}
      <section id="how-it-works" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Why RYDA
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
            Owned by you. Operated by us.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Renting builds nothing. Owning an exotic car outright costs
            ~$40–80K a year before you turn the key. RYDA is the third option.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-5">
            <Step n="01" title="Verify" body="Apply, complete identity verification, and confirm RYDA membership requirements." />
            <Step n="02" title="Choose" body="Browse the curated, CPO-only fleet. Every car passes a multi-point Pre-Purchase Inspection before a single share is sold — co-owners are protected from inheriting major powertrain or mechanical issues." />
            <Step n="03" title="Co-own" body="Up to 10 members form a Delaware LLC together to hold the vehicle. You sign the operating agreement and fund your share." />
            <Step n="04" title="Drive" body="Book your time on the RYDA app. Each share unlocks ~30 days and ~3,000 miles a year (100 mi/day). Most members hold 1–2 shares; high-use members can buy more entitlement on the same car." />
            <Step n="05" title="Exit" body="Default exit: RYDA sells the car at year 2 OR 50,000 miles — whichever comes first. Proceeds split pro-rata (we model a ~10% depreciation hit). Need out earlier? Transfer your share to another verified member after the 12-month minimum hold." />
          </div>
          <div className="mt-16 flex justify-center">
            <Link
              href="/how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-medium text-ink hover:border-ink"
            >
              Learn more →
            </Link>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Founding members</p>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
            Membership is by invitation.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/70">
            We're vetting the first 100 founding members for the Miami launch.
            Tell us about yourself and we'll be in touch with the next steps.
          </p>
          <div className="mt-10">
            <WaitlistForm />
          </div>
          <p className="mt-6 text-xs text-cream/50">
            Membership is limited to verified individuals 28 years or older.
            RYDA is a luxury access platform — co-ownership stakes are not
            investments and are not offered for investment purposes.
          </p>
        </div>
      </section>

    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-sm text-red">{n}</p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

