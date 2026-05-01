import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About RYDA Boats",
  description:
    "Why we built RYDA Boats. The same Delaware LLC structure that runs the cars side, adapted for marine — surveyed CPO hulls, member-managed LLCs, three-year planned exit.",
};

export default function BoatsAboutPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            About RYDA Boats
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            We&apos;re bringing the same structure to the water.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Solo yacht ownership is unworkable for most. Charter is
            hollow. RYDA Boats is the third option, built on the same
            Delaware LLC scaffolding that runs the cars side — adapted
            for marine ops, surveyed CPO hulls, and a three-year hold.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Our story (short)
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              The cars-side thesis came from running the math on a
              Lamborghini rental in Miami: $4,200 for three days vs.
              $300K for the car plus $80K/yr to keep it. The middle
              option didn&apos;t exist in the US.
            </p>
            <p>
              Yachts have the same shape. A 55-foot Wajer is $1.95M to
              buy and $300K–$400K a year to operate (slip + captain +
              fuel + insurance + hurricane prep). A weekend charter is
              $14K–$22K. Most prospective owners drive a 30-day-a-year
              usage profile. Solo ownership is wildly inefficient at
              that load.
            </p>
            <p>
              Boats run on Coast Guard documentation, marine survey
              workflows, and hurricane-driven seasonality, but the
              co-ownership structure is identical: a single-purpose
              Delaware LLC holds title, up to 10 members co-own, RYDA
              runs ops under a separate Management Services Agreement.
              Same Howey-defense thinking, same legal scaffolding.
            </p>
          </div>
        </div>
      </section>

      {/* Founder's letter */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            A note from our founder
          </p>
          <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
            Why RYDA Boats, in plain English.
          </h2>
          <div className="mt-10 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              I&apos;ll keep this short. There are three honest ways to
              put a yacht in your life right now. You can buy one — and
              spend $300K–$800K a year keeping it serviceable while
              actually using it 30 days. You can charter at $14K–$22K
              per day from a marketplace where coverage and quality
              vary by owner. Or you can join a club that hands you
              rotating access to smaller boats for $30K–$60K/yr — fees
              that consume themselves with no asset behind them.
            </p>
            <p>
              None of that was the right answer for us, and none of it
              is the right answer for the buyers we&apos;ve talked to.
              RYDA Boats is the fourth answer: a real ownership stake
              in a single-purpose Delaware LLC that holds title to a
              specific yacht, alongside up to nine other verified
              members. The Coast Guard documentation is in the
              LLC&apos;s name. We run the operations under a separate
              services agreement — slip, captain, fuel, insurance,
              spring commissioning, fall lay-up, hurricane haul-out.
              You drive the calendar, we drive the asset.
            </p>
            <p>
              The economics: a ~$195K share in a Wajer 55, plus
              $32K/year for everything-included ops, gets you up to 30
              days a year on the water and a real exit at year three.
              We model the residual at 85% of buy-in. Boats and cars
              depreciate differently — classic Rivas can appreciate,
              big sport yachts compress faster — and we don&apos;t
              pretend the numbers are guaranteed. What you walk away
              with isn&apos;t a return. It&apos;s the experience of
              actually living with a yacht for three years, in real
              water, without the part-time job.
            </p>
            <p>
              Miami launches Q3 2026, alongside the cars side. We&apos;re
              vetting our first 60 founding boat members now.
            </p>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <Image
              src="/team/ryan.jpg"
              alt="Ryan Galli"
              width={56}
              height={56}
              className="rounded-full object-cover"
              style={{ filter: "grayscale(100%) contrast(1.05)" }}
            />
            <div>
              <p className="font-display text-base text-ink">Ryan Galli</p>
              <p className="text-xs uppercase tracking-wider text-mute">
                Co-founder & CEO, RYDA
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/founding-members"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-marine"
            >
              Apply for founding membership →
            </Link>
            <Link
              href="/contact?type=Membership&note=RYDA+Boats#form"
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              Schedule a 30-minute call
            </Link>
          </div>
        </div>
      </section>

      {/* Cross-link to cars about */}
      <section className="bg-ink py-16 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Same team
          </p>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl">
            RYDA Cars is the original product.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-cream/70">
            Same founders, same legal scaffolding, same operational
            standard. Read the cars-side story and team.
          </p>
          <Link
            href="/about"
            className="mt-7 inline-flex h-11 items-center justify-center rounded-full border border-cream/30 px-6 text-sm font-medium text-cream hover:border-cream"
          >
            About RYDA Cars →
          </Link>
        </div>
      </section>
    </>
  );
}
