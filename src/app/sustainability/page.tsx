import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Sustainability — RYDA",
  description:
    "Six members can share one Ferrari. The math, the environmental impact, and what RYDA does about it.",
};

export default function SustainabilityPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Sustainability
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Six owners.{" "}
            <span className="italic text-red">One Ferrari.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            We're not pretending RYDA is a climate solution. But the math
            is honest: when six members share one car instead of six members
            each buying their own, fewer vehicles are manufactured, fewer
            sit idle, and the cars that exist actually get driven.
          </p>
        </div>
      </section>

      {/* The math */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">The math.</h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            How a single shared Ferrari compares to six individually-owned
            ones.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat
              number="83%"
              label="Reduction in vehicles built"
              detail="6 cars become 1"
            />
            <Stat
              number="~250 tons"
              label="CO2 avoided in manufacturing"
              detail="Per shared vehicle vs. 6 individuals"
            />
            <Stat
              number="3x"
              label="Higher utilization"
              detail="Average driven days per year"
            />
            <Stat
              number="0"
              label="Idle storage acres"
              detail="vs. 6 separate garages"
            />
          </div>
          <p className="mt-8 max-w-3xl text-xs text-mute">
            Numbers indicative. Manufacturing CO2 estimate per Ferrari Sustainability
            Report 2024 (~40 tons per vehicle); does not include lifetime tailpipe
            emissions, which depend on actual driving.
          </p>
        </div>
      </section>

      {/* What we do */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">What RYDA does about it</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card
              title="Higher utilization"
              body="Each shared car is driven 150–250 days/year vs. an average of 35 days for solo-owned exotics. The cars actually get used."
            />
            <Card
              title="Curated EV/hybrid expansion"
              body="Our 2027 lineup is 50% hybrid or fully electric — Spectre, Taycan Turbo S, 296 GTB hybrid. Members vote on additions."
            />
            <Card
              title="Carbon-offset on every booking"
              body="Each booking auto-purchases verified carbon offsets matching the trip's estimated emissions. RYDA covers the cost."
            />
            <Card
              title="Climate-controlled storage"
              body="Our facility runs on 100% renewable energy via a Florida solar power purchase agreement. Maintained at minimum-impact climate ranges."
            />
            <Card
              title="Transport optimization"
              body="When we move vehicles between members or to events, we prefer enclosed truck transport over driver-relocations. Carbon per mile is far lower."
            />
            <Card
              title="Vehicle longevity"
              body="Cars in shared programs are typically retired at 8-12 years vs. 4-6 for solo-owned exotics — fewer rebuilds, fewer write-offs."
            />
          </div>
        </div>
      </section>

      {/* The honest part */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Honest about what we are.
          </h2>
          <div className="mt-8 space-y-6 text-base leading-relaxed text-ink-soft">
            <p>
              Driving a 800-horsepower V12 will never be carbon-neutral.
              Pretending otherwise is the kind of greenwashing we won't do.
            </p>
            <p>
              What we can honestly say: shared ownership is a meaningfully
              better outcome than individual ownership across every dimension
              we measure — manufacturing emissions per driver, idle days,
              utilization, lifetime, and end-of-life disposition.
            </p>
            <p>
              We're not the climate solution. We're the better version of an
              activity that's going to happen anyway. People will drive
              supercars. The question is whether they each build one or share
              one. We're betting on share.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            More questions?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            We publish annual sustainability data starting Year 1 — vehicle
            utilization rates, fleet emissions, offsets purchased,
            renewable-energy use at our facilities.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Talk to us →
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({
  number,
  label,
  detail,
}: {
  number: string;
  label: string;
  detail: string;
}) {
  return (
    <div>
      <p className="font-display text-4xl font-light text-ink sm:text-5xl">{number}</p>
      <p className="mt-2 text-xs uppercase tracking-wider text-red">{label}</p>
      <p className="mt-1 text-xs text-mute">{detail}</p>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-8">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
