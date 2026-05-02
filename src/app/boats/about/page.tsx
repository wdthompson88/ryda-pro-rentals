import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About RYDA Boats",
  description:
    "Why we built RYDA Boats. Member-managed LLCs, surveyed certified pre owned hulls, professional marine ops, three-year planned exit.",
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
            Real ownership, on the water.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Solo yacht ownership is unworkable for most. Charter is
            hollow. RYDA Boats is the third option, a member-managed
            LLC per hull, surveyed certified pre owned vessels, and
            professional marine operations across a three-year hold.
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
              A 55-foot Wajer is $1.95M to buy and $300K–$400K a year
              to operate (slip + captain + fuel + insurance + hurricane
              prep). A weekend charter is $14K–$22K. Most prospective
              owners drive a 30-day-a-year usage profile. Solo
              ownership is wildly inefficient at that load.
            </p>
            <p>
              RYDA Boats is the middle option: a single-purpose LLC
              holds title to a specific yacht, up to 5 members co-own
              with a 2-share minimum, and RYDA runs ops under a
              separate Management Services Agreement. Coast Guard
              documentation is in the LLC&apos;s name. Members hold
              registered legal interests, not club points.
            </p>
            <p>
              Boats run on Coast Guard documentation, marine survey
              workflows, and hurricane-driven seasonality. We built
              the operations stack, slip, captain, fuel, insurance,
              spring commissioning, fall lay-up, hurricane haul-out —
              so members can drive the calendar, not the asset.
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
              put a yacht in your life right now. You can buy one, and
              spend $300K–$800K a year keeping it serviceable while
              actually using it 30 days. You can charter at $14K–$22K
              per day from a marketplace where coverage and quality
              vary by owner. Or you can join a club that hands you
              rotating access to smaller boats for $30K–$60K/yr, fees
              that consume themselves with no asset behind them.
            </p>
            <p>
              None of that was the right answer for us, and none of it
              is the right answer for the buyers we&apos;ve talked to.
              RYDA Boats is the fourth answer: a real ownership stake
              in a single-purpose LLC that holds title to a
              specific yacht, alongside up to four other verified
              members. The Coast Guard documentation is in the
              LLC&apos;s name. We run the operations under a separate
              services agreement, slip, captain, fuel, insurance,
              spring commissioning, fall lay-up, hurricane haul-out.
              You drive the calendar, we drive the asset.
            </p>
            <p>
              The economics: a ~$195K share in a Wajer 55, plus
              $32K/year for everything-included ops, gets you up to 30
              days a year on the water and a real exit at year three.
              We model the residual at 85% of buy-in. Boats and cars
              depreciate differently, classic Rivas can appreciate,
              big sport yachts compress faster, and we don&apos;t
              pretend the numbers are guaranteed. What you walk away
              with isn&apos;t a return. It&apos;s the experience of
              actually living with a yacht for three years, in real
              water, without the part-time job.
            </p>
            <p>
              Miami launches Q3 2026. Create your account to browse the
              fleet and claim a share when the first hulls go live.
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
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-marine"
            >
              Sign up →
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

      {/* Mission + Values, parallel of /about */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
            Mission
          </p>
          <p className="mt-4 max-w-3xl font-display text-2xl leading-tight text-ink sm:text-3xl">
            &ldquo;To make ownership of exceptional yachts possible for
            more enthusiasts, responsibly, transparently, and with
            marine-grade ops handled by the team, not the owner.&rdquo;
          </p>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Value
              title="Transparency"
              body="Every co-owner sees every cost, every survey, every captain log. The reserve account is open-book."
            />
            <Value
              title="Marine craft"
              body="Captains employed via the LLC, surveys by SAMS-accredited surveyors, hurricane prep pre-arranged. The hard parts are pre-solved."
            />
            <Value
              title="Excellence"
              body="Service-grade provisioning, captain dispatch, and slip coordination on every charter and member day."
            />
            <Value
              title="Integrity"
              body="Asset-backed ownership, single-purpose LLC per hull, member voting. We do what we say."
            />
          </div>
        </div>
      </section>

      {/* Cross-link to cars about + founders */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            The team behind RYDA Boats.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            Three co-founders combining executive search, investment
            banking, and three decades of institutional equity markets.
            Marine operations are run by a dedicated boats team plus
            our partner yards in Miami, Connecticut, and the Caribbean.
          </p>
          <Link
            href="/about#founders"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-ink px-7 text-sm font-medium text-ink hover:bg-ink hover:text-cream"
          >
            Meet the founders →
          </Link>
        </div>
      </section>

      {/* HQ, parallel of /about Headquarters */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            RYDA Boats operations
          </h2>
          <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-5 text-sm sm:grid-cols-2">
            <Fact label="Legal entity" value="Single-purpose LLC per hull" />
            <Fact label="Operating market" value="Miami flagship · launching Q3 2026" />
            <Fact label="Marina partner" value="Coconut Grove · Island Gardens · Miami Beach Marina" />
            <Fact label="Captains" value="USCG licensed, employed via the LLC" />
            <Fact label="Survey partner" value="SAMS-accredited" />
            <Fact label="Insurance" value="Hagerty Marine / CHUBB / Travelers, agreed-value" />
            <Fact label="General" value="hello@ryda.com" />
            <Fact label="Operations" value="boats@ryda.com" />
          </dl>
        </div>
      </section>

      {/* Final CTA, parallel of /about CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Become a member.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            The first 60 boats members lock early-member pricing on Blue or
            Black for life. We&apos;re vetting now ahead of the Miami
            water launch, Q3 2026.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup?next=/boats"
              className="inline-flex h-12 items-center justify-center bg-cream px-7 text-sm font-medium text-ink hover:bg-marine hover:text-cream"
            >
              Sign up →
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center justify-center border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              About RYDA Cars
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Value({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-rule pb-3">
      <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-mute">
        {label}
      </dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}
