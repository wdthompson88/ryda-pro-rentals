import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Insurance — RYDA",
  description:
    "How RYDA insures every vehicle, every booking and every co-owner. Built for supercars, not Camrys.",
};

export default function InsurancePage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Insurance</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            The hardest part of supercar ownership, handled.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Insuring a $300,000+ vehicle that's used by multiple drivers with
            varying experience is a non-trivial problem. RYDA carries a
            commercial fleet policy underwritten for exactly this, agreed
            value, multi-driver, supercar-rated.
          </p>
        </div>
      </section>

      {/* Coverage at a glance */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Coverage at a glance</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card title="Third-party liability" body="$1,000,000 combined single limit. Covers bodily injury and property damage to others." />
            <Card title="Agreed-value physical damage" body="Pre-set replacement value for each vehicle. No haircuts at total-loss settlement." />
            <Card title="Multi-driver coverage" body="Every approved RYDA member is named insured during their booking window." />
            <Card title="Roadside assistance" body="24/7 dispatch and replacement vehicle for any covered breakdown." />
            <Card title="Storage coverage" body="Vehicles in RYDA partner storage are insured against theft, fire and natural disaster." />
          </div>
        </div>
      </section>

      {/* What's not covered */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Honest exclusions</h2>
          <p className="mt-4 text-base text-ink-soft">
            We tell you up front what's not covered, so there are no
            surprises after a claim.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-ink-soft">
            <NotCovered>Wear-and-tear items: tires, brakes, fluids, light scratches.</NotCovered>
            <NotCovered>
              Damage caused by gross negligence (driving while impaired,
              racing, off-road use of street cars).
            </NotCovered>
            <NotCovered>
              Damage during unauthorized use, drivers not approved by RYDA.
            </NotCovered>
            <NotCovered>
              Loss of personal property left in the vehicle.
            </NotCovered>
            <NotCovered>
              Travel outside the continental US (special coverage available
              for cross-border bookings on request).
            </NotCovered>
          </ul>
        </div>
      </section>

      {/* Claim process */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">If something happens</h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            We've made the claim process the opposite of every car-rental
            horror story you've ever heard.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Step n="01" title="Call RYDA" body="One number, 24/7. We dispatch roadside, arrange a tow if needed and get you mobile." />
            <Step n="02" title="Document" body="The RYDA app walks you through photo + statement collection. Don't worry about getting it perfect, just capture the scene." />
            <Step n="03" title="We file" body="RYDA opens the claim with our carrier. You don't need to call your own insurance." />
            <Step n="04" title="Resolution" body="Most claims close within 30 days. You're not invoiced for any covered items." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Have specific questions?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Insurance details vary by vehicle and booking type. Talk to a
            membership advisor for the specifics.
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

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-8">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function NotCovered({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed">
      <span className="mt-1 text-red">×</span>
      <span>{children}</span>
    </li>
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
