// RYDA Concierge — sole-ownership service for clients who want a single
// car held in a discreet Delaware LLC with full RYDA operational stack
// (storage, insurance, scheduling, maintenance, registration). Modeled
// on the Swiss family-office registration service used by Supercar
// Sharing AG, translated to a US Delaware LLC framework.

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Concierge Ownership — RYDA",
  description:
    "Sole ownership of a curated exotic, held in a discreet Delaware LLC, operated by RYDA. For family offices, collectors, and internationally mobile owners who want full ownership without the operational burden.",
};

export default function ConciergeOwnershipPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            RYDA Concierge · Family-office service
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Sole ownership.{" "}
            <span className="italic text-red">Concierge operations.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            For clients who don't want to share — but don't want the
            operational burden either. RYDA Concierge holds your vehicle
            in a single-purpose Delaware LLC, with full administrative,
            insurance, storage, and registration services running on the
            same operational stack as our co-ownership fleet. You stay
            the 100% economic owner. We handle everything else.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/contact?type=Concierge%20Ownership&note=Concierge%20ownership%20inquiry#form"
              className="inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
            >
              Inquire about a structure →
            </Link>
            <a
              href="#scope"
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              See what's included
            </a>
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            A discreet jurisdiction for the structured holding of automotive assets
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            The same governance you'd apply to real estate, art, or yachts —
            extended to your cars.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              Delaware is one of the more common US jurisdictions for
              single-purpose LLC structures, alongside Nevada, Wyoming, and
              the client&apos;s home state. The right choice depends on
              your residency, the vehicle&apos;s primary garaging address,
              and your tax counsel&apos;s view — we structure to those
              specifics rather than defaulting to a single jurisdiction.
            </p>
            <p>
              RYDA Concierge enables collectors, entrepreneurs, and family
              offices to hold exceptional automobiles within a
              professionally managed Delaware-LLC framework, while
              maintaining 100% economic ownership and complete
              decision-making control over the asset.
            </p>
            <p>
              This service is for clients who view exceptional
              automobiles not as consumer goods, but as passion assets
              that deserve the same operational rigor applied to other
              parts of their estate.
            </p>
          </div>
        </div>
      </section>

      {/* The 8 sections */}
      <section id="scope" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What the structure provides
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Nine pillars of institutional ownership.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Pillar
              n="01"
              title="Ownership integrity & control"
              body="The LLC holds legal title; you hold 100% of the membership interests. RYDA acts strictly as the operational administrator — no economic ownership, no claim on the asset. You retain full authority over acquisition strategy, storage location, insurance structure, usage profile, resale timing, resale price, and succession."
            />
            <Pillar
              n="02"
              title="Discretion & confidentiality"
              body="The single-purpose LLC sits between you and the public record — the entity holds the title and registration, not you personally. Ownership remains fully enforceable through the LLC's Operating Agreement while reducing the surface area visible in public databases. Confidentiality conventions vary by state and use case; we structure to your specific objectives."
            />
            <Pillar
              n="03"
              title="Legal protection of the asset"
              body="Single-purpose LLC isolates the vehicle from your other liabilities and vice versa. Operating agreement spells out that the asset cannot be transferred, encumbered, or disposed of without your explicit authorization. Ownership is verifiable and enforceable across cross-border situations."
            />
            <Pillar
              n="04"
              title="Institutional administration"
              body="Registration procedures, insurance coordination, regulatory compliance, communication with authorities, documentation management, renewal coordination, inspection and certification scheduling — all handled by the RYDA operations team. The asset stays compliant and ready for use whether you're in Miami or in Monaco."
            />
            <Pillar
              n="05"
              title="Insurance framework"
              body="Comprehensive coverage tailored to high-value vehicles: agreed-value physical damage, $1M+ third-party liability, theft, passenger protection. Carriers we work with specialize in collector and exotic vehicles — claims handling preserves asset value, not just settles paperwork."
            />
            <Pillar
              n="06"
              title="Multi-state coordination"
              body="The LLC's home state is selected with your tax counsel based on your residency, the vehicle's primary garaging address, and your insurance carrier's preferences. We coordinate inter-state titling and registration alongside your counsel; specifics on tax nexus, sales/use tax, and PPT vary by state and require their sign-off. Cross-border travel (Mexico/Canada) is reviewed case by case with the insurer."
            />
            <Pillar
              n="07"
              title="Flexibility & exit optionality"
              body="Full flexibility on resale or transfer. RYDA coordinates valuation, buyer verification, and structured execution if requested — preserving asset value and discretion through the transaction. You set the timeline; we handle the logistics."
            />
            <Pillar
              n="08"
              title="Acquisition, import & logistics"
              body="If RYDA is sourcing the car (+0.5% to the setup fee), we handle dealer or auction representation, pre-purchase inspection, transport, and — for international acquisitions — customs entry, duty, EPA/DOT compliance, and federal certification. The car arrives roadable, registered, insured, and stored from day one."
            />
            <Pillar
              n="09"
              title="Optional rental income"
              body="If you want it, your car can opt into the RYDA rental pool — same 65/35 (you / RYDA) split available to co-owners. Skip it and the car sits exclusively for you. Either way you keep full booking priority."
            />
          </div>
        </div>
      </section>

      {/* Pricing — direct pull from Supercar Sharing AG's structure */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Structuring & implementation
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            One-time structuring fee. Transparent pass-through ops.
          </h2>
          <p className="mt-4 max-w-3xl text-base text-ink-soft">
            The set-up fee reflects the legal, registration, insurance,
            and tax coordination required to integrate the vehicle into a
            secure Delaware-LLC framework from day one. Annual operating
            costs are pass-through — invoiced at our cost with no markup.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-red bg-red/5 p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Setup fee
              </p>
              <p className="mt-3 font-display text-4xl text-ink">
                3.0%
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                of vehicle value · minimum $10,000
              </p>
              <ul className="mt-5 space-y-1.5 text-xs text-ink-soft">
                <li>· LLC formation + Operating Agreement</li>
                <li>· Title transfer & state registration</li>
                <li>· Insurance structuring + binding</li>
                <li>· Power of Attorney documentation</li>
                <li>· Initial tax & regulatory setup</li>
                <li>· Project coordination across all parties</li>
              </ul>
              <p className="mt-4 text-[11px] text-mute">
                + 0.5% if RYDA also coordinates the acquisition
                (sourcing, negotiation, PPI, transport).
              </p>
            </div>
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Annual concierge admin
              </p>
              <p className="mt-3 font-display text-4xl text-ink">
                $5–15K
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                /yr · scaled to vehicle profile
              </p>
              <ul className="mt-5 space-y-1.5 text-xs text-ink-soft">
                <li>· LLC compliance + state filings</li>
                <li>· Registration renewals</li>
                <li>· Insurance renewal coordination</li>
                <li>· Maintenance & inspection scheduling</li>
                <li>· Documentation custody</li>
                <li>· Single point of contact</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Pass-through costs
              </p>
              <p className="mt-3 font-display text-4xl text-ink">
                At cost
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                no markup, fully itemized
              </p>
              <ul className="mt-5 space-y-1.5 text-xs text-ink-soft">
                <li>· Insurance premiums</li>
                <li>· Storage (climate-controlled facility)</li>
                <li>· Maintenance & service work</li>
                <li>· Taxes, registration, title fees</li>
                <li>· Transport / logistics</li>
                <li>· Detailing & prep for use</li>
              </ul>
            </div>
          </div>

          <p className="mt-6 text-xs text-mute">
            Worked example: $340K Ferrari 296 GTB → $10,200 setup fee
            (3% × $340K), $7–9K/yr concierge admin, plus pass-through
            insurance/storage/maintenance. $1.19M Aston Martin Valhalla
            → $35,700 setup, $12–15K/yr concierge admin, plus
            pass-through. Quoted individually after a 30-minute scoping
            call.
          </p>
        </div>
      </section>

      {/* Suitable client profile */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Suitable client profile
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Built for owners who already think this way.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Profile label="Family offices" />
            <Profile label="Internationally mobile entrepreneurs" />
            <Profile label="Collectors of limited-production vehicles" />
            <Profile label="Owners of passion assets &amp; specialty vehicles" />
            <Profile label="Owners seeking discretion in title-holding" />
            <Profile label="Clients consolidating assets across jurisdictions" />
          </div>
          <p className="mt-8 max-w-3xl text-sm text-ink-soft">
            The framework treats exceptional automobiles with the same
            governance standards applied to other internationally held
            assets — real estate, art, equity stakes, yachts. Same
            operational stack as the co-ownership fleet, with full
            economic ownership and full control retained by you.
          </p>
        </div>
      </section>

      {/* Initial info required */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Getting started
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What we need to scope a structure.
          </h2>
          <p className="mt-4 max-w-3xl text-base text-ink-soft">
            One 30-minute call, the data points below, and we'll come
            back with a tailored structure proposal.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <InfoBlock
              title="Vehicle"
              items={[
                "Make & model",
                "Production year",
                "VIN (if owned)",
                "Purchase value or target acquisition price",
              ]}
            />
            <InfoBlock
              title="Usage profile"
              items={[
                "Estimated annual mileage",
                "Primary storage location",
                "Intended use (road, track, tour, display)",
                "Expected hold horizon",
              ]}
            />
            <InfoBlock
              title="Insurance & operators"
              items={[
                "Main driver profile",
                "Additional authorized drivers",
                "Existing carrier (if any)",
                "Cross-border use (yes/no)",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Comparison with co-ownership */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Concierge vs. Co-ownership.
          </h2>
          <p className="mt-4 max-w-3xl text-base text-ink-soft">
            Both run on the same RYDA operational stack. The difference
            is who else is on the title and how the math works.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ComparePanel
              title="RYDA Concierge"
              tagline="Sole ownership · 1 client · 1 LLC"
              points={[
                "100% economic ownership of the vehicle",
                "Full booking priority — never waiting on co-owners",
                "All carrying costs on you (insurance, storage, maintenance)",
                "All depreciation on you, all upside on you",
                "3% setup + concierge admin annual + pass-through ops",
                "Optional rental opt-in for offset income (65/35)",
              ]}
              highlight
            />
            <ComparePanel
              title="RYDA Co-ownership"
              tagline="Shared ownership · 1–10 members · LLC with 10 shares"
              points={[
                "Up to 90% capital efficiency vs. solo (~$34K share vs. $340K sticker on a 296)",
                "Booking priority pro-rata to share count",
                "All carrying split across shareholders",
                "Depreciation split, upside split (2-yr planned exit)",
                "$1,500 closing + annual contribution per share",
                "Same rental opt-in, same operational standards",
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Talk to a founder
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Schedule a 30-minute scoping call.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Tell us about the vehicle, the use case, and the holding
            horizon. We'll come back with a tailored structure
            proposal — fees, timelines, the works.
          </p>
          <Link
            href="/contact?type=Concierge%20Ownership&note=Concierge%20ownership%20scoping%20call#form"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Schedule a call →
          </Link>
        </div>
      </section>

      {/* Disclaimer footer */}
      <section className="bg-ink py-12 text-cream/60">
        <div className="mx-auto max-w-3xl px-6 text-center text-xs sm:px-10">
          RYDA Concierge is an operational and administrative service.
          Vehicle title is held by a single-purpose Delaware LLC of
          which the client is the sole member. RYDA does not hold
          economic ownership in the asset and acts solely as the LLC's
          contracted service provider. This page is illustrative; final
          terms are set by the LLC's Operating Agreement and the
          Management Services Agreement. Not legal, tax, or investment
          advice — work with your own counsel before structuring.
        </div>
      </section>
    </>
  );
}

function Pillar({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-2xl text-red">{n}</p>
      <p className="mt-2 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Profile({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface px-5 py-4">
      <p className="text-sm text-ink">{label}</p>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
        {items.map((it) => (
          <li key={it}>· {it}</li>
        ))}
      </ul>
    </div>
  );
}

function ComparePanel({
  title,
  tagline,
  points,
  highlight,
}: {
  title: string;
  tagline: string;
  points: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight ? "border-red bg-red/5" : "border-rule bg-surface"
      }`}
    >
      <p
        className={`font-display text-xl ${
          highlight ? "text-red" : "text-ink"
        }`}
      >
        {title}
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mute">
        {tagline}
      </p>
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-soft">
        {points.map((p) => (
          <li key={p}>· {p}</li>
        ))}
      </ul>
    </div>
  );
}
