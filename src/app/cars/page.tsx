import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";
import { HiddenWhenAuthed } from "@/components/auth-aware";
import { VEHICLES, formatUSD } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "RYDA Cars — Co-own the world's most exceptional cars",
  description:
    "Co-own a certified pre owned Ferrari, Lamborghini or McLaren in a member-managed LLC. Each share unlocks ~30 days a year. Asset-backed, professionally operated.",
};

export default function CarsHome() {
  // Featured cars for the two parallel sections, same 4 RYDA fleet
  // cars, but presented twice with different framings (co-own vs rent).
  const featured = VEHICLES.slice(0, 4);
  // Hero image: lead with the GT3 RS as the visual anchor.
  const heroVehicle = VEHICLES.find((v) => v.symbol === "GT3") ?? VEHICLES[0];

  return (
    <>
      <SiteHeader />

      {/* Hero, copy on left, editorial vehicle image on right */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-red">
              Supercar co-ownership · Miami · Q3 2026
            </p>
            <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Co-own the world's{" "}
              <span className="italic text-red">most exceptional cars.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              Co-own a certified pre owned Ferrari, Lamborghini, or
              McLaren in a member-managed LLC. Each share is ~30 days
              a year. Asset-backed; member-managed; professionally
              operated.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Link
                href="/portfolio"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                Co-Own a share →
              </Link>
            </div>
          </div>

          {/* Hero VIDEO — RYDA 15s spot. Autoplays muted on loop so
              the cars page opens with the full cinematic intro
              instead of a static image. Falls back to the GT3 hero
              poster on first paint and on browsers/networks where
              <video> can't autoplay (iOS Low Power Mode, etc.).
              Wraps in a click-through to /portfolio/gt3 since the GT3
              is the most-featured car in the spot. */}
          <div className="lg:col-span-6">
            <Link
              href={`/portfolio/${heroVehicle.symbol}`}
              aria-label={`Open ${heroVehicle.year} ${heroVehicle.name} listing — watch the RYDA hero spot`}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink lg:aspect-[5/4]"
            >
              {/* Hero video — autoplays muted on loop, but respects
                  prefers-reduced-motion: when reduced motion is set,
                  CSS pauses the video and only the poster shows.
                  aria-hidden: the surrounding <Link> already labels
                  the click target; the video itself is decorative.
                  Audit T1-3 + T1-4. */}
              <video
                src="/videos/ryda-hero-spot-15s.mp4"
                poster={heroVehicle.hero}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:hidden"
              />
              {/* Reduced-motion fallback: show the hero photo */}
              <Image
                src={heroVehicle.hero}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="absolute inset-0 hidden h-full w-full object-cover motion-reduce:block"
                aria-hidden="true"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-[#0E0E10]/90 via-[#0E0E10]/40 to-transparent p-5 sm:p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-red">
                    Watch the spot
                  </p>
                  <p className="mt-1 font-display text-xl text-cream sm:text-2xl">
                    The full fleet, in 15 seconds.
                  </p>
                  <p className="mt-1 text-xs text-cream/75">
                    Featuring the {heroVehicle.year} {heroVehicle.name} ·{" "}
                    {formatUSD(heroVehicle.pricePerShare)}/share
                  </p>
                </div>
                <span className="hidden text-sm font-medium text-cream sm:inline">
                  View →
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Browse the portfolio, Pacaso-style teaser entry to /portfolio */}
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
            booking model, and the path to claiming a share. One facility,
            one fleet, one team. Miami first.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/portfolio"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
            >
              Open the portfolio →
            </Link>
          </div>
        </div>
      </section>

      {/* Co-Own, featured share cars (curated, not the full inventory) */}
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
            </div>
            <Link
              href="/portfolio"
              className="inline-flex h-11 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink"
            >
              See all {VEHICLES.length} cars →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v, i) => (
              <Reveal key={v.symbol} delayMs={i * 80}>
                <Link
                  href={`/portfolio/${v.symbol}`}
                  className="group block overflow-hidden rounded-xl border border-rule bg-surface transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                    <Image
                      src={v.hero}
                      alt={`${v.year} ${v.name}`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${v.flipImage ? "-scale-x-100" : ""}`}
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

      {/* Why RYDA, consolidated into 5-step block */}
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
            <Step n="01" title="Verify" body="Apply and complete identity verification." />
            <Step n="02" title="Choose" body="Browse the curated, certified pre owned fleet. Every car passes a multi-point Pre-Purchase Inspection by the dealer before a single share is sold." />
            <Step n="03" title="Co-own" body="RYDA forms a LLC for up to 5 members to hold the vehicle. You sign the operating agreement and fund your share (2 shares minimum per person)." />
            <Step n="04" title="Drive" body="Book your time on the RYDA smart calendar. Each share unlocks ~32 days and ~3,200 miles a year (100 mi/day)." />
            <Step n="05" title="Exit" body="RYDA sells the car at year 2–3 OR 60,000–75,000 miles depending on certified pre owned program. Proceeds split pro-rata. Need out earlier? Transfer your share to another verified member after the 12-month minimum hold." />
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

      {/* Sign up */}
      <section id="signup" className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Members</p>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
            Become a member.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/70">
            Create your account to browse the fleet, run the numbers,
            and claim a share when Miami opens in Q3 2026.
          </p>
          <HiddenWhenAuthed>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink transition-colors hover:bg-red hover:text-cream"
              >
                Sign up →
              </Link>
              <Link
                href="/signin"
                className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream transition-colors hover:border-red hover:text-red"
              >
                Sign in
              </Link>
            </div>
          </HiddenWhenAuthed>
          <p className="mt-6 text-xs text-cream/50">
            Membership is limited to verified individuals 28 years or older.
            RYDA is a luxury access platform, co-ownership stakes are not
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

