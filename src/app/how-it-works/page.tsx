import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "How it works — RYDA",
  description:
    "How RYDA co-ownership works: from vehicle selection to legal LLC formation to driving and exit. Plus the rental side.",
};

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            How it works
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Five steps to{" "}
            <span className="italic text-red">a key.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Each car is held in a Delaware LLC that 5–10 verified members
            manage together. RYDA is hired as the operations partner.
          </p>
        </div>
      </section>

      {/* Owning — primary */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Co-ownership
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
            Own a piece of the world's best cars.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Effective ~$182/day on a co-owned Ferrari. Compare with $2,500+/day
            to rent or $40–80K/yr to own outright.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
            <Step n="01" title="Verify" body="Apply, complete KYC. Valid US license, clean recent driving record, 28 or older. No accreditation required." />
            <Step n="02" title="Choose" body="Browse the fleet. Each vehicle is a single-purpose Delaware LLC member-managed by 5–10 co-owners." />
            <Step n="03" title="Co-own" body="Join the LLC alongside other members. Sign the Operating Agreement and Management Services Agreement. Fund your seat via wire or ACH." />
            <Step n="04" title="Drive" body="Book your time on the RYDA app. Up to ~65 days and ~4,000 miles per seat, per year — exact entitlement depends on the vehicle." />
            <Step n="05" title="Transfer" body="Transfer your seat to another verified member after the 12-month minimum hold. RYDA handles the LLC paperwork. 3% transfer fee." />
          </div>
        </div>
      </section>

      {/* Cost-math comparison */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            The math, one Ferrari at a time.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            Real numbers for the Ferrari 296 GTB at $340,000.
          </p>
          <div className="mt-10 overflow-hidden rounded-2xl border border-rule bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-6 py-4 text-left">Cost</th>
                  <th className="px-6 py-4 text-right">Solo ownership</th>
                  <th className="px-6 py-4 text-right">RYDA (1 seat of 6)</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                <Tr label="Acquisition" solo="$340,000" ryda="$56,667" />
                <Tr label="Annual insurance" solo="$11,000" ryda="$1,833" />
                <Tr label="Annual storage" solo="$5,000" ryda="$833" />
                <Tr label="Annual maintenance" solo="$8,000" ryda="$1,333" />
                <Tr label="Annual depreciation reserve" solo="$22,000" ryda="$3,667" />
                <Tr label="RYDA service fee" solo="—" ryda="$4,134" />
                <Tr label="Total Year 1" solo="$386,000" ryda="$68,467" emphasis />
                <Tr label="Days driven" solo="365 (in theory)" ryda="~65 / seat" />
                <Tr label="Effective $/day" solo="$1,058" ryda="$182" emphasis />
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-mute">
            Numbers shown for illustration. Final pricing varies by vehicle. The
            LLC pays a 12% annual management fee bundled into its operating
            budget; what you see above is the per-seat allocation.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Frequently asked questions.
          </h2>
          <div className="mt-10 space-y-6">
            <Faq
              q="Are RYDA co-ownership stakes securities?"
              a="No. RYDA is a luxury access platform, not an investment platform. Each car is held in a member-managed Delaware LLC where you and your co-owners hold authority over material decisions; RYDA is hired as a service provider via a separate Management Services Agreement. Co-ownership stakes are not registered securities and are not offered for investment purposes."
            />
            <Faq
              q="Can I transfer my seat whenever I want?"
              a="After a 12-month minimum hold, yes — to another verified RYDA member. RYDA handles the LLC paperwork. Settlement takes 1–3 business days. RYDA charges a 3% transfer fee on the sale price."
            />
            <Faq
              q="What if a co-owner stops paying?"
              a="The vehicle LLC has remedies in the Operating Agreement, including forced transfer of the delinquent seat. RYDA also keeps a maintenance reserve at the LLC level so vehicle ops continue uninterrupted while it's resolved."
            />
            <Faq
              q="Where are the cars stored?"
              a="In RYDA-vetted partner storage facilities — climate-controlled, 24/7 monitored, insured. Miami first, with LA and NY following in 2027."
            />
            <Faq
              q="What's covered by insurance?"
              a="Each vehicle carries a fleet policy with $1M+ third-party liability and agreed-value physical damage. Co-owners are named insureds. Track day use requires an additional rider."
            />
            <Faq
              q="Can I bring a friend in the car?"
              a="Yes. Approved additional drivers (28+, clean license, RYDA-verified) can drive too. Passengers are unrestricted."
            />
            <Faq
              q="Why is membership only 28+?"
              a="Underwriting reality. Insurance carriers price exotic-car policies aggressively for younger drivers. The 28+ minimum keeps premiums manageable and matches the European norm we modeled on (Supercar Sharing AG)."
            />
            <Faq
              q="Is there a membership fee?"
              a="Three tiers. RYDA Core is free. RYDA Blue is $500/year. RYDA Black is $1,500/year — priority booking during peak season, included white-glove delivery, complimentary track-day rider on eligible vehicles, dedicated concierge contact. Founding-100 lock in $350/$1,000 for life."
            />
          </div>
        </div>
      </section>

      {/* Try-before-you-buy aside */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Also for members
          </p>
          <h2 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
            Want to drive one before you commit?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-soft">
            Members and prospective buyers can rent any RYDA vehicle by the
            day. It's the best way to know if the car fits your life before
            you claim a co-ownership seat.
          </p>
          <Link
            href="/rent"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink hover:border-ink"
          >
            See rentals →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-4xl font-light sm:text-5xl">Ready?</h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            Join the founding members list for Miami launch.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/founding-members"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              Apply for membership
            </Link>
            <Link
              href="/markets"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream hover:bg-cream/10"
            >
              See the fleet
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-sm text-red">{n}</p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Tr({
  label,
  solo,
  ryda,
  emphasis,
}: {
  label: string;
  solo: string;
  ryda: string;
  emphasis?: boolean;
}) {
  const cls = emphasis ? "font-display text-base text-ink" : "text-ink-soft";
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className="px-6 py-4 text-sm">{label}</td>
      <td className={`px-6 py-4 text-right tabular-nums ${cls}`}>{solo}</td>
      <td className={`px-6 py-4 text-right tabular-nums ${cls}`}>{ryda}</td>
    </tr>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-rule bg-surface p-5">
      <summary className="cursor-pointer list-none font-display text-lg text-ink marker:hidden">
        <span className="flex items-center justify-between gap-4">
          <span>{q}</span>
          <span className="text-2xl text-red transition-transform group-open:rotate-45">+</span>
        </span>
      </summary>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{a}</p>
    </details>
  );
}
