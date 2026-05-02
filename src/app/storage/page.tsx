import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Storage — RYDA",
  description:
    "Premium climate-controlled vehicle storage in Miami. Built for supercars: monitored, insured, on-call delivery.",
};

export default function StoragePage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Storage
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Where the cars{" "}
            <span className="italic">actually live.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Storage is the most underrated part of supercar ownership.
            Concrete floor, fluorescent light, and a leaky roof costs you
            $40,000 in deferred maintenance over five years. RYDA's facility
            is built for these cars — and you can store yours here even if
            you're not a co-owner yet.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Three tiers. All climate-controlled.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            Pay for the level of attention you actually need. Move up or
            down at any time.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <Tier
              name="Garage"
              price="$550"
              priceSub="/month"
              tagline="The basics, done right."
              features={[
                "Climate-controlled indoor bay",
                "24/7 video monitoring + access control",
                "Monthly battery start + charge cycle",
                "Monthly exterior hand wash",
                "Quarterly condition report with photos",
                "48-hour pickup notice",
              ]}
            />
            <Tier
              name="Garage Plus"
              price="$850"
              priceSub="/month"
              tagline="Active care, not just storage."
              features={[
                "Everything in Garage",
                "Bi-weekly battery + engine cycle",
                "Bi-weekly exterior detail",
                "Monthly tire pressure + fluid check",
                "On-call delivery within Miami metro (2 included / yr)",
                "24-hour pickup notice",
              ]}
              recommended
            />
            <Tier
              name="Concours"
              price="$1,500"
              priceSub="/month"
              tagline="The treatment a Pebble Beach car gets."
              features={[
                "Everything in Garage Plus",
                "Weekly engine cycle + interior climate management",
                "Monthly paint correction + ceramic top-up",
                "Quarterly multi-point inspection",
                "Unlimited Miami-metro delivery",
                "Same-day pickup notice",
                "Dedicated facility manager assignment",
              ]}
            />
          </div>
        </div>
      </section>

      {/* What's included always */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Standard at every tier</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Included title="Climate" body="58–72°F year-round. Humidity managed. Hurricane-rated structure." />
            <Included title="Security" body="On-site security 24/7, 256-camera coverage, biometric access for staff only. Insured against theft + fire." />
            <Included title="Insurance" body="Storage policy covers vehicle while in our facility. Your owner's policy covers any time outside." />
            <Included title="Documentation" body="Full intake inspection with photos. Condition report on every interaction. Member portal with live status." />
          </div>
        </div>
      </section>

      {/* For non-co-owners */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            You don't have to be a co-owner.
          </h2>
          <p className="mt-4 text-base text-ink-soft">
            If you own a supercar outright and want it stored properly, RYDA
            Storage is open to you as a standalone service. RYDA members
            get 15% off all tiers.
          </p>
          <div className="mt-10 space-y-3 text-sm">
            <Faq
              q="What happens to my insurance?"
              a="Your existing owner's policy stays in force. Our facility-wide policy is layered on top for storage perils (theft, fire, natural disaster). We coordinate certificate sharing with your carrier."
            />
            <Faq
              q="Can I drop in to see the car?"
              a="Yes — by appointment. We require 24h notice for non-urgent visits to coordinate facility access. Members can do same-day."
            />
            <Faq
              q="What if I want to add my car to RYDA's rental fleet?"
              a="See /host-your-car. Storage members can convert to rental hosts at any time without changing facilities."
            />
            <Faq
              q="What if I move the car out of Miami?"
              a="We arrange transport via our partner carrier. See /transport (coming soon) for pricing."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Tour the facility.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Storage decisions are personal. We do private tours by appointment.
            See where your car would actually live.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Book a tour
          </Link>
        </div>
      </section>
    </>
  );
}

function Tier({
  name,
  price,
  priceSub,
  tagline,
  features,
  recommended,
}: {
  name: string;
  price: string;
  priceSub?: string;
  tagline: string;
  features: string[];
  recommended?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-10 ${
        recommended ? "border-red bg-surface" : "border-rule bg-surface"
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 left-10 rounded-full bg-red px-3 py-1 text-xs font-medium text-cream">
          Most chosen
        </span>
      )}
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">{name}</p>
      <p className="mt-4 font-display text-4xl font-light text-ink">
        {price}
        {priceSub && <span className="text-base text-ink-soft">{priceSub}</span>}
      </p>
      <p className="mt-3 text-sm text-ink-soft">{tagline}</p>
      <ul className="mt-8 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-ink">
            <span className="mt-1 text-red">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Included({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-rule bg-surface p-5">
      <summary className="cursor-pointer list-none font-display text-base text-ink marker:hidden">
        <span className="flex items-center justify-between gap-4">
          <span>{q}</span>
          <span className="text-2xl text-red transition-transform group-open:rotate-45">+</span>
        </span>
      </summary>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{a}</p>
    </details>
  );
}
