import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Concierge — RYDA",
  description:
    "RYDA's concierge service handles everything that isn't driving. White-glove delivery, travel coordination, event logistics, vehicle prep.",
};

export default function ConciergePage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Concierge
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl">
            Everything that isn't driving,{" "}
            <span className="italic text-red">handled.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-cream/70">
            RYDA's concierge team is the difference between owning a car and
            owning the experience of a car. Three free hours per year on
            Black, one on Blue, or pay-as-you-go for Core. One number, one
            team, all the details.
          </p>
        </div>
      </section>

      {/* Service grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">What we handle</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Service
              title="White-glove delivery"
              body="Vehicle delivered to your door, hotel, or office. Washed, fueled, photo-documented. Driver waits or returns at the agreed time."
            />
            <Service
              title="Travel coordination"
              body="Going somewhere with the car? We handle hotel parking arrangements, valet briefings, transport between cities, charger logistics for EVs."
            />
            <Service
              title="Event support"
              body="Driving to a wedding, gala, or photo shoot? We coordinate arrival times, parking, return logistics, and post-event care."
            />
            <Service
              title="Pre-trip preparation"
              body="Premium detail, full inspection, optional flowers/champagne for proposals or anniversaries. Custom requests welcomed."
            />
            <Service
              title="In-app trip planning"
              body="Recommended drives, restaurants, and stops along your route. We can book ahead and confirm reservations."
            />
            <Service
              title="Photographer dispatch"
              body="Professional photographer delivered to your trip. RYDA-curated list, shoot styled, edited photos within 48 hours."
            />
            <Service
              title="Service coordination"
              body="Need warranty work, recall service, or routine maintenance? We move the car to and from the manufacturer dealer. You don't lift a finger."
            />
            <Service
              title="Track-day logistics"
              body="Helmet drop, instructor booking, telemetry mount, on-site support for the day. See /track-day for full menu."
            />
            <Service
              title="Bespoke requests"
              body="If it isn't on this list and it's reasonable, we'll do it. Fly fuel cans into the Outer Banks. Coordinate sunrise drives. Whatever the trip needs."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">How it works</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Step n="01" title="Request" body="In the RYDA app or by phone. Tell us what you need and when. The more notice, the better — but we work with same-day requests." />
            <Step n="02" title="Quote" body="For multi-step or custom requests, we send a written quote. For routine items (delivery, prep, etc.), pricing is fixed." />
            <Step n="03" title="Coordinate" body="A dedicated concierge runs point. You get one number, not a queue." />
            <Step n="04" title="Confirm" body="When everything is in place, you get a confirmation with timestamps, contacts, and a Plan B if anything moves." />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Pricing</h2>
          <p className="mt-4 text-base text-ink-soft">
            Most concierge requests are flat-rate. Hourly billing for custom
            coordination work.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <Price line="White-glove delivery (within market)" value="$300" />
            <Price line="White-glove delivery (cross-market)" value="From $1,200" />
            <Price line="Pre-trip premium prep" value="$250" />
            <Price line="Photographer (half-day shoot)" value="$1,500" />
            <Price line="Service coordination" value="$150 / car movement" />
            <Price line="Custom hourly concierge" value="$150 / hour" />
            <Price line="Blue tier (annual included)" value="1 hour · 1 delivery" />
            <Price line="Black tier (annual included)" value="3 hours · 3 deliveries · 1 prep" />
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cream-2 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            One number. Real humans.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-soft">
            Members reach the concierge team in the RYDA app, by email, or
            by phone — every Black member also gets a direct dial.
          </p>
          <Link
            href="/membership"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
          >
            See membership →
          </Link>
        </div>
      </section>
    </>
  );
}

function Service({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-8">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
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

function Price({ line, value }: { line: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between border-b border-rule pb-3">
      <span className="text-ink-soft">{line}</span>
      <span className="font-medium text-ink tabular-nums">{value}</span>
    </li>
  );
}
