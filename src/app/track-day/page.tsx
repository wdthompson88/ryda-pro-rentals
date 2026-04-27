import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Track Day — RYDA",
  description:
    "Take a RYDA supercar on track. Curated circuits, track-day insurance rider, helmet drop, post-track inspection.",
};

export default function TrackDayPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Track day
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl">
            The car was built for it.{" "}
            <span className="italic text-red">So we made it possible.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-cream/70">
            Every supercar is built for the limit. Most never see one. RYDA's
            track program lets co-owners and qualified renters take eligible
            vehicles on a curated set of circuits — properly insured, properly
            prepared.
          </p>
        </div>
      </section>

      {/* Circuits */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Approved circuits</h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            Insurance and waiver coverage is pre-arranged for these tracks.
            Other circuits available with 14 days' notice.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Track name="Homestead-Miami Speedway" location="Homestead, FL" notes="Road course configuration. RYDA hosts open lapping days quarterly." />
            <Track name="Sebring International Raceway" location="Sebring, FL" notes="Short course or full course. Available year-round." />
            <Track name="The Concours Club" location="Miami, FL" notes="Members-only private circuit. RYDA holds reciprocal access." />
            <Track name="Willow Springs (LA market)" location="Rosamond, CA" notes="Available Q1 2027 with LA market launch." />
            <Track name="Lime Rock Park (NY market)" location="Lakeville, CT" notes="Available Q3 2027 with NY market launch." />
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Eligibility</h2>
          <p className="mt-4 text-base text-ink-soft">
            Track use isn't for everyone. We require driving experience that
            matches the car.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <Req>RYDA Core or Black member in good standing</Req>
            <Req>30+ years old</Req>
            <Req>Clean driving record (no major moving violations in 5 years)</Req>
            <Req>
              For first-time track drivers: completion of an RYDA-approved
              high-performance driving course (we'll arrange one if needed)
            </Req>
            <Req>
              Track-day insurance rider purchased in advance — coverage
              voids the standard physical-damage policy on track
            </Req>
            <Req>
              Vehicle is track-eligible (some hypercars are excluded by
              manufacturer warranty terms)
            </Req>
          </ul>
        </div>
      </section>

      {/* What's included */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">A track-day RYDA</h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            Pull up. Drive. Hand back the keys. That's it.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Pillar
              title="Vehicle prep"
              body="Tires checked, brakes inspected, fluids topped, telemetry mounted (optional). Delivered trackside."
            />
            <Pillar
              title="Helmet drop"
              body="A clean Snell-rated helmet in your size, plus optional driving suit and gloves. Or bring your own."
            />
            <Pillar
              title="On-site support"
              body="A RYDA tech on site for the duration of your session, with tools, spare tires, and a debrief."
            />
            <Pillar
              title="Post-track inspection"
              body="We log every session, inspect every component, and you get the report in your inbox the next day."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Pricing</h2>
          <p className="mt-4 text-base text-ink-soft">
            On top of the vehicle's standard daily rate or share usage.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <Price line="Track-day rider (per day)" value="$250" />
            <Price line="Helmet + gear rental" value="$75" />
            <Price line="On-site tech (per day)" value="$500" />
            <Price line="Open lapping pass at Homestead (per day)" value="$300" />
            <Price line="Telemetry mount + analysis" value="$150" />
          </ul>
          <p className="mt-6 text-xs text-mute">
            Prices indicative. Quote firms up at booking based on circuit and date.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Book a track day</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Members can request a track booking through the RYDA app starting
            14 days before the desired date.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Talk to an advisor
          </Link>
        </div>
      </section>
    </>
  );
}

function Track({
  name,
  location,
  notes,
}: {
  name: string;
  location: string;
  notes: string;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-white p-6">
      <p className="font-display text-lg text-ink">{name}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-red">{location}</p>
      <p className="mt-4 text-sm text-ink-soft">{notes}</p>
    </div>
  );
}

function Req({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed text-ink-soft">
      <span className="mt-1 text-red">·</span>
      <span>{children}</span>
    </li>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Price({ line, value }: { line: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between border-b border-rule pb-3">
      <span className="text-ink-soft">{line}</span>
      <span className="font-medium text-ink tabular-nums">{value}</span>
    </li>
  );
}
