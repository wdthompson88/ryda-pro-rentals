import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { Reveal } from "@/components/reveal";
import {
  BOATS,
  formatUSD,
  BOATS_HOLDING_YEARS,
  BOATS_TARGET_DEPRECIATION_PCT,
} from "@/lib/boat-data";
import {
  HERO_EYEBROW,
  HERO_HEADLINE,
  HERO_SUBHEAD,
  HOW_IT_WORKS_STEPS,
} from "@/lib/boat-content";

export const metadata: Metadata = {
  title: "RYDA Boats, Co-own or charter the world's most beautiful boats",
  description:
    "Boat co-ownership and crewed charter in Miami. Each hull held in a member-managed LLC; up to 5 verified members co-own every boat. Three-year planned exit.",
};

export default function BoatsHome() {
  const featured = BOATS.slice(0, 4);
  const heroBoat = BOATS.find((b) => b.slug === "wajer-55s") ?? BOATS[0];

  return (
    <>
      <SiteHeader />

      {/* Hero, copy left, editorial boat image right (parallel to cars) */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-20 sm:px-10 sm:py-24 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-marine">
              {HERO_EYEBROW}
            </p>
            <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              {HERO_HEADLINE.prefix}{" "}
              <span className="italic text-marine">{HERO_HEADLINE.highlight}</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              {HERO_SUBHEAD}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/boats/portfolio"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-marine"
              >
                Co-Own a share →
              </Link>
              <Link
                href="/boats/rent"
                className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
              >
                Charter by the day →
              </Link>
            </div>
          </div>

          {/* Editorial boat image, links to the listing */}
          <div className="lg:col-span-6">
            <Link
              href={`/boats/portfolio/${heroBoat.slug}`}
              aria-label={`Open ${heroBoat.year} ${heroBoat.name} listing`}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-cream-2 lg:aspect-[5/4]"
            >
              <Image
                src={heroBoat.hero}
                alt={`${heroBoat.year} ${heroBoat.name}`}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className={`object-cover transition-transform duration-700 group-hover:scale-[1.02] ${heroBoat.flipImage ? "-scale-x-100" : ""}`}
                style={{ objectPosition: heroBoat.imagePosition ?? "center" }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-cream/90 via-cream/30 to-transparent p-5 sm:p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-marine">
                    In the fleet
                  </p>
                  <p className="mt-1 font-display text-xl text-ink sm:text-2xl">
                    {heroBoat.year} {heroBoat.name}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {formatUSD(heroBoat.pricePerShare)} per share ·{" "}
                    {heroBoat.sharesAvailable} of {heroBoat.shares} shares
                    available
                  </p>
                </div>
                <span className="hidden text-sm font-medium text-marine sm:inline">
                  View →
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured boats, same four for both share + charter */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
                Co-Own · Featured
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
                Featured boats from the co-ownership portfolio.
              </h2>
              <p className="mt-3 max-w-xl text-base text-ink-soft">
                Four flagship hulls. Each held in an LLC, 10
                shares per hull, ~32 days a year per share. Same hulls
                are also available by the day on the charter side.
              </p>
            </div>
            <Link
              href="/boats/portfolio"
              className="inline-flex h-11 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink"
            >
              See all {BOATS.length} boats →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((b, i) => (
              <Reveal key={b.slug} delayMs={i * 80}>
                <Link
                  href={`/boats/portfolio/${b.slug}`}
                  className="group block overflow-hidden rounded-xl border border-rule bg-surface transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                    <Image
                      src={b.hero}
                      alt={`${b.year} ${b.name}`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${b.flipImage ? "-scale-x-100" : ""}`}
                      style={{ objectPosition: b.imagePosition ?? "center" }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-mute">{b.brand} · {b.lengthFt}&apos;</p>
                    <p className="mt-1 font-display text-base text-ink">
                      {b.name}
                    </p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <p>
                        <span className="font-display text-xl text-ink tabular-nums">
                          {formatUSD(b.pricePerShare)}
                        </span>
                        <span className="text-xs text-mute">/share</span>
                      </p>
                      <span className="text-xs font-medium text-marine group-hover:text-marine-deep">
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

      {/* Charter rail, same four boats, framed for charter */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
                Charter · Featured
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                Charter the same hulls before you commit.
              </h2>
              <p className="mt-3 max-w-xl text-base text-cream/70">
                Crewed by default, RYDA-vetted captain, mate and (for
                sport yachts) chef. Bareboat available on the Riva and
                Lagoon for USCG-licensed members.
              </p>
            </div>
            <Link
              href="/boats/rent"
              className="inline-flex h-11 items-center justify-center rounded-full border border-cream/30 px-5 text-sm font-medium text-cream hover:border-cream hover:bg-cream hover:text-ink"
            >
              See all charters →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((b, i) => (
              <Reveal key={b.slug} delayMs={i * 80}>
                <Link
                  href={`/boats/rent/${b.slug}`}
                  className="group block overflow-hidden rounded-xl border border-cream/15 bg-cream/[0.04] transition-colors hover:bg-cream/[0.08]"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                    <Image
                      src={b.hero}
                      alt={`${b.year} ${b.name}`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${b.flipImage ? "-scale-x-100" : ""}`}
                      style={{ objectPosition: b.imagePosition ?? "center" }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-cream/60">{b.brand} · {b.lengthFt}&apos;</p>
                    <p className="mt-1 font-display text-base text-cream">
                      {b.name}
                    </p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <p>
                        <span className="font-display text-xl text-cream tabular-nums">
                          {formatUSD(b.rentalDailyRate)}
                        </span>
                        <span className="text-xs text-cream/60">/day</span>
                      </p>
                      <span className="text-xs font-medium text-marine">
                        Charter →
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5-step block (parallel to cars home) */}
      <section id="how-it-works" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Why RYDA Boats
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
            Owned by you. Operated by us.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Solo yacht ownership runs ~$300–800K a year before you take
            the lines off. RYDA is the third option, real ownership,
            zero ops burden, planned 3-year exit.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-5">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div key={s.n}>
                <p className="font-display text-sm text-marine">{s.n}</p>
                <p className="mt-3 font-display text-xl text-ink">{s.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-rule bg-surface p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Co-owners per hull" value="10" />
              <Stat label="Days / share / yr" value="30" />
              <Stat label="Nautical miles / share / yr" value="1,500" />
              <Stat label="Planned exit" value={`${BOATS_HOLDING_YEARS} yrs`} sub={`Modeled ${BOATS_TARGET_DEPRECIATION_PCT}% depreciation`} />
            </div>
          </div>
          <div className="mt-12 flex justify-center">
            <Link
              href="/boats/how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-medium text-ink hover:border-ink"
            >
              See the full doctrine →
            </Link>
          </div>
        </div>
      </section>

      {/* Sign up */}
      <section id="signup" className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Members · Boats
          </p>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
            Become a member.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/70">
            Create your account to browse the fleet, run the numbers,
            and claim a share when RYDA Boats Miami opens in Q3 2026.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink transition-colors hover:bg-red hover:text-cream"
            >
              Sign up &rarr;
            </Link>
            <Link
              href="/signin"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream transition-colors hover:border-red hover:text-red"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-6 text-xs text-cream/50">
            Membership is limited to verified individuals 28 years or
            older. RYDA is a luxury access platform, co-ownership
            stakes are not investments and are not offered for
            investment purposes.
          </p>
        </div>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-mute">{sub}</p> : null}
    </div>
  );
}
