import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { InlineEmailCapture } from "@/components/inline-email-capture";
import { Reveal } from "@/components/reveal";
import { VEHICLES, formatUSD } from "@/lib/market-data";

export default function Home() {
  // Featured cars for the two parallel sections — same 4 RYDA fleet
  // cars, but presented twice with different framings (co-own vs rent).
  const featured = VEHICLES.slice(0, 4);
  const featuredRentable = VEHICLES.filter((v) => v.rentalAvailable).slice(0, 4);
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
              Supercar co-ownership and rentals · Miami · Q3 2026
            </p>
            <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Co-own or rent the world's{" "}
              <span className="italic text-red">most exceptional cars.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              Co-own a CPO Ferrari, Lamborghini, or McLaren in a Delaware
              LLC — each share is ~30 days a year. Or rent any car in the
              fleet by the day to drive it before you commit.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Link
                href="/markets"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                Co-Own a share →
              </Link>
              <Link
                href="/rent"
                className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
              >
                Rent by the day →
              </Link>
            </div>
            <div className="mt-8 max-w-md">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                Just want to keep tabs?
              </p>
              <InlineEmailCapture source="home-hero" />
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

      {/* Browse the portfolio — Pacaso-style teaser entry to /markets */}
      <section className="relative isolate overflow-hidden border-b border-rule">
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&w=2000&q=80"
            alt="Miami at sunset"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30"
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-16 text-cream sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/80">
            Browse the portfolio
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-light italic leading-tight sm:text-5xl">
            Miami today. <span className="not-italic text-red">LA</span> and{" "}
            <span className="not-italic text-red">NY</span> next.
          </h2>
          <p className="mt-5 max-w-xl text-base text-cream/85">
            The full RYDA portfolio organised by city — featured vehicles,
            booking model, and the path to claiming a share. Inspired by
            the cleanest fractional-ownership browse experience we&apos;ve
            seen.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/markets"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Open the portfolio →
            </Link>
          </div>
        </div>
      </section>

      {/* Co-Own — featured share cars (curated, not the full inventory) */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Co-Own · Featured
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                Featured cars from the co-ownership portfolio.
              </h2>
              <p className="mt-3 max-w-xl text-base text-ink-soft">
                A curated four. Each car held in a Delaware LLC, 10 shares
                per vehicle. ~30 days a year per share. Effective ~$236/day
                in steady-state ops vs $2,400+/day to rent.
              </p>
            </div>
            <Link
              href="/markets"
              className="inline-flex h-11 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink"
            >
              See all {VEHICLES.length} cars →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v, i) => (
              <Reveal key={v.symbol} delayMs={i * 80}>
                <Link
                  href={`/markets/${v.symbol}`}
                  className="group block overflow-hidden rounded-xl border border-rule bg-surface transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                    <Image
                      src={v.hero}
                      alt={`${v.year} ${v.name}`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-105 ${v.flipImage ? "-scale-x-100" : ""}`}
                      style={{ objectPosition: v.imagePosition ?? "center" }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-mute">{v.brand}</p>
                    <p className="mt-1 font-display text-base text-ink">
                      {v.name}
                    </p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <p>
                        <span className="font-display text-xl text-ink tabular-nums">
                          {formatUSD(v.pricePerShare)}
                        </span>
                        <span className="text-xs text-mute">/share</span>
                      </p>
                      <span className="text-xs font-medium text-red group-hover:text-red-deep">
                        View →
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Rent — featured rentals (try before you buy) */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Rent · Featured
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                Featured rentals — try before you buy.
              </h2>
              <p className="mt-3 max-w-xl text-base text-cream/70">
                A curated four. Drive one first, decide if you want to own
                a piece. The full Miami fleet (RYDA + partner cars) lives
                on the rentals page.
              </p>
            </div>
            <Link
              href="/rent"
              className="inline-flex h-11 items-center justify-center rounded-full border border-cream/30 px-5 text-sm font-medium text-cream hover:border-cream hover:bg-cream hover:text-ink"
            >
              See all rentals →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredRentable.map((v, i) => (
              <Reveal key={v.symbol} delayMs={i * 80}>
                <Link
                  href={`/rent/${v.symbol.toLowerCase()}`}
                  className="group block overflow-hidden rounded-xl border border-cream/15 bg-cream/[0.04] transition-colors hover:bg-cream/[0.08]"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                    <Image
                      src={v.hero}
                      alt={`${v.year} ${v.name}`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-105 ${v.flipImage ? "-scale-x-100" : ""}`}
                      style={{ objectPosition: v.imagePosition ?? "center" }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-cream/60">{v.brand}</p>
                    <p className="mt-1 font-display text-base text-cream">
                      {v.name}
                    </p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <p>
                        <span className="font-display text-xl text-cream tabular-nums">
                          {formatUSD(v.rentalDailyRate)}
                        </span>
                        <span className="text-xs text-cream/60">/day</span>
                      </p>
                      <span className="text-xs font-medium text-red">
                        Rent →
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
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

