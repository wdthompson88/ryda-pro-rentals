import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Trust & Safety",
  description:
    "How RYDA protects co-owners, vehicles and the platform. Member verification, asset vetting, insurance, claims and the standards we hold ourselves to.",
};

export default function TrustAndSafetyPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Trust & Safety
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Co-ownership only works if everyone trusts the system.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Vehicles in vetted LLCs. Insurance to agreed value. Members
            verified before they touch the keys.
          </p>
        </div>
      </section>

      {/* Why this matters in Miami, Vice-inspired framing without
          naming names. The Miami exotic-rental scene has well-documented
          operators who don't verify insurance, sub-lease cars off
          someone else's title, and run on Instagram clout instead of
          paperwork. RYDA exists because that market needed a real
          alternative, not the same model with nicer branding. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Why this matters here
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Miami&apos;s exotic-rental scene has a paperwork problem.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              Plenty of cars on Miami roads are operated without verified
              insurance, without trackers, sub-leased off someone
              else&apos;s title, and rented on a handshake. That&apos;s
              not a critique of the people involved. It&apos;s a
              structural feature of a market built on Instagram clout
              and short-term cash flow.
            </p>
            <p>
              RYDA is the deliberate opposite. Every vehicle is titled
              in a single-purpose LLC. Every co-owner is a registered
              member of that LLC. Every booking runs on documented
              insurance with named insureds. Every car has a Pre-Purchase
              Inspection on file before a single share is sold. It is
              boring, in the way that real ownership is supposed to be.
            </p>
          </div>
        </div>
      </section>

      {/* Pillars grid */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            <Pillar
              eyebrow="Members"
              title="Verified before they touch the keys"
              body="Every co-owner clears KYC identity verification, a clean recent driving record check and a 28+ minimum age. Members are added as named insureds on the LLC's vehicle policy. Membership is earned, not bought."
            />
            <Pillar
              eyebrow="Vehicles"
              title="Certified pre-owned, PPI-inspected before any share is sold"
              body="Every RYDA vehicle is certified pre owned with a manufacturer or independent certified pre owned program. Before the LLC closes on a car, a multi-point Pre-Purchase Inspection by a marque specialist documents engine, transmission, suspension, electronics and body condition, plus full title and lien search. Co-owners aren't buying surprises; they're buying a documented car."
            />
            <Pillar
              eyebrow="Insurance"
              title="$1M liability + agreed-value physical damage"
              body="$1M third-party liability and agreed-value comprehensive coverage on every vehicle, written by carriers that specialize in high-value autos (Hagerty, Travelers, CHUBB tier). Members named as insureds. Low deductibles."
            />
            <Pillar
              eyebrow="Storage"
              title="Climate-controlled, monitored, indoor"
              body="Every vehicle is stored in a RYDA-vetted facility, climate-controlled, 24/7 video monitoring, on-site security and segregated bays. We don't park exotics in shared garages or driveways."
            />
            <Pillar
              eyebrow="Operations"
              title="White-glove handover, every booking"
              body="Vehicles are washed, fueled and pre-inspected before every member booking. Photo-documented condition both at delivery and return. Any new damage is logged and assigned before the next booking."
            />
            <Pillar
              eyebrow="Support"
              title="One number, 24/7"
              body="A dedicated RYDA member line for roadside, claims, inspections and operational issues. Single point of contact, never an outsourced call center. Replacement vehicle dispatched if anything breaks down on the road."
            />
          </div>
        </div>
      </section>

      {/* Insurance section */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Insurance
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What's covered, in plain English.
          </h2>
          <div className="mt-10 space-y-5">
            <Coverage
              line="Third-party liability"
              detail="$1M per occurrence, primary. Covers bodily injury and property damage you cause to others. Higher limits available on request."
            />
            <Coverage
              line="Agreed-value physical damage"
              detail="The full retail value of the vehicle is agreed up-front and paid in the event of a total loss. No depreciation arguments. Comprehensive (theft, fire, weather) and collision both included."
            />
            <Coverage
              line="Uninsured / underinsured motorist"
              detail="$500K UM/UIM. If someone hits you and they don't have coverage, you're not stuck with the bill."
            />
            <Coverage
              line="Roadside + replacement"
              detail="If a vehicle breaks down or is in an accident during your booking, RYDA dispatches a replacement vehicle of similar tier within 4 hours."
            />
          </div>
          <div className="mt-10 rounded-2xl border border-rule bg-cream-2 p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-red">
              Sample documents on request
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Reviewable by your counsel or accountant before any commitment.
              Email request, typical turnaround under 24 hours.
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <li>· Sample LLC Operating Agreement</li>
              <li>· Sample Management Services Agreement</li>
              <li>· Sample Pre-Purchase Inspection report</li>
              <li>· Sample insurance certificate</li>
              <li>· Sample condition report</li>
              <li>· Sample annual member statement</li>
            </ul>
            <Link
              href="/contact?type=Membership&note=Sample%20document%20packet#form"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-red"
            >
              Request the document packet →
            </Link>
          </div>
        </div>
      </section>

      {/* Mechanical & powertrain protection */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Certified pre owned + powertrain protection
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            You're not buying a stranger's mechanical problems.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            RYDA only acquires certified pre owned vehicles. Before the LLC
            closes on any car, three things happen, every time, no exceptions:
          </p>
          <ul className="mt-8 space-y-5 text-base">
            <Coverage
              line="Independent Pre-Purchase Inspection (PPI)"
              detail="A marque specialist (Ferrari Master Tech, McLaren-certified shop, etc.) performs a documented multi-point inspection: engine compression and leak-down, transmission, suspension, brakes, electronics, fluid analysis, body and frame integrity. The full report becomes part of the LLC's permanent record."
            />
            <Coverage
              line="Active certified pre owned warranty"
              detail="Every vehicle ships with an active manufacturer or independent certified pre owned warranty covering the powertrain and major mechanical systems for the LLC's first ownership period. Co-owners aren't on the hook for surprise engine, transmission or driveline repairs, those are warranty events, not assessments."
            />
            <Coverage
              line="LLC-level reserve for post-warranty issues"
              detail="The LLC's annual budget includes a maintenance reserve scaled to the vehicle's service profile. Out-of-warranty mechanical issues are paid from the reserve, not from members' pockets. If a major repair exhausts the reserve, the group decides next steps by vote, never a surprise bill in your inbox."
            />
          </ul>
          <p className="mt-8 rounded-2xl border border-rule bg-surface p-6 text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">Bottom line:</span>{" "}
            co-ownership shouldn't mean inheriting someone else's deferred
            maintenance. RYDA's job is to deliver a documented, warrantied,
            reserve-backed vehicle to your LLC on day one, and to keep it
            that way.
          </p>
        </div>
      </section>

      {/* Claims section */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Claims
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What happens when something goes wrong.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Step n="01" title="Call us first" body="One phone number, 24/7. Don't admit fault, don't move the vehicle unless safe, photograph everything." />
            <Step n="02" title="Get medical help if needed" body="Always priority one. The car is replaceable, you're not." />
            <Step n="03" title="We open the claim" body="RYDA files with the carrier within 24 hours, manages the adjuster and coordinates rental coverage." />
            <Step n="04" title="Resolution" body="For at-fault collisions, the deductible (typically $2,500) is your responsibility. Everything else flows through the policy." />
          </div>
          <p className="mt-12 max-w-2xl rounded-2xl border border-rule bg-surface p-6 text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">Note on at-fault claims:</span>{" "}
            Repeated or willful at-fault incidents are grounds for membership
            review. We do not protect repeat offenders at the cost of the
            other co-owners on the same LLC.
          </p>
        </div>
      </section>

      {/* Standards / what we say no to */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Standards
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            What we say no to.
          </h2>
          <ul className="mt-10 space-y-4 text-base leading-relaxed text-ink-soft">
            <li>
              <span className="font-medium text-ink">No commercial use.</span>{" "}
              Vehicles are for personal use only. No ride-share, no rental
              re-listing, no commercial photo/video shoots without written
              approval and a separate insurance rider.
            </li>
            <li>
              <span className="font-medium text-ink">No unverified drivers.</span>{" "}
              Only the named co-owner can drive. We don't extend insurance
              to unverified family, friends or partners. Co-owners can add
              a verified household secondary driver on request.
            </li>
            <li>
              <span className="font-medium text-ink">No motorsport on RYDA insurance.</span>{" "}
              Drag strips, autocross without proper insurance and street
              racing are not covered. We mean it.
            </li>
            <li>
              <span className="font-medium text-ink">No undocumented modifications.</span>{" "}
              Performance and appearance modifications go through the LLC's
              decision process, co-owners vote, and RYDA verifies that the
              change is operationally and insurance-feasible. One member
              doesn't get to wrap a Ferrari unilaterally.
            </li>
            <li>
              <span className="font-medium text-ink">No leaving the operating market.</span>{" "}
              Vehicles stay in their assigned market by default. Inter-market
              transit is available for trips with 14+ days notice.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Have a specific question?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            We answer every email. For claims, insurance certificates, or
            documentation requests, write us directly.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/help"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              Help center →
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream hover:bg-cream/5"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Pillar({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-red">
        {eyebrow}
      </p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Coverage({ line, detail }: { line: string; detail: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="font-display text-lg text-ink">{line}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="font-display text-sm text-red">{n}</p>
      <p className="mt-2 font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
