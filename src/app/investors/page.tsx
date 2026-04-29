import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { InvestorInquiryForm } from "@/components/investor-inquiry-form";

export const metadata = {
  title: "Invest in RYDA — Seed Round",
  description:
    "RYDA is a US member-managed supercar co-ownership platform, raising a seed round to launch Miami.",
};

export default function InvestorsPage() {
  return (
    <>
      <SiteHeader />

      {/* Audience-clarification banner */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-mute">
            <span className="font-medium text-ink">For venture investors</span> — interested in
            funding RYDA Inc. (the operating company).
          </p>
          <p className="text-mute">
            Looking to co-own a car instead?{" "}
            <Link href="/markets" className="font-medium text-red hover:text-red-deep">
              See the fleet →
            </Link>
          </p>
        </div>
      </section>

      {/* Hero */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Seed round · open
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl">
            The luxury access category{" "}
            <span className="italic text-red">supercars have been waiting for.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-cream/70">
            RYDA is a US member-managed supercar co-ownership
            platform — Soho House for cars, structured around real ownership
            of real vehicles. We're raising a $2.5M seed to launch Miami in
            Q3 2026 and reach 20 vehicles + 120 co-owners + $1.2M ARR by Year 3.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/investors/deck"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              View the deck →
            </Link>
            <Link
              href="#request-deck"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream hover:bg-cream/5"
            >
              Request the deck
            </Link>
          </div>
        </div>
      </section>

      {/* Executive summary */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat number="$14.8B" label="US luxury auto market (2025)" />
            <Stat number="$2.5M" label="Seed round target" />
            <Stat number="$1.2M" label="Year 3 ARR target" />
            <Stat number="16.1%" label="Year 3 EBITDA target" />
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">The problem</p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            All-or-nothing supercar ownership.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              Buying a Ferrari outright: $320K + $80K/yr in carrying. Renting
              at $2,500–5,000/day: no priority, no community, no ownership.
            </p>
            <p>
              Member-managed access has scaled to billions in jets (NetJets),
              hospitality (Soho House), and clubs. No US platform has built
              the equivalent for supercars. RYDA fills that gap.
            </p>
          </div>
        </div>
      </section>

      {/* The model */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">The model</p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            How RYDA works.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
            <Step n="01" title="Source" body="RYDA sources curated supercars on behalf of each vehicle LLC in target markets — Ferrari, Lamborghini, McLaren, Aston Martin, Rolls-Royce." />
            <Step n="02" title="Structure" body="Each vehicle is held in a single-purpose Delaware LLC. 5–10 verified members co-own and manage the LLC together." />
            <Step n="03" title="Operate" body="RYDA contracts with each LLC as a service provider — storage, insurance, maintenance, scheduling, concierge." />
            <Step n="04" title="Use" body="Members book usage on the RYDA app — ~34 days and ~4,000 miles per share per year, depending on the vehicle." />
            <Step n="05" title="Transfer" body="After 12 months, members transfer their share to another verified member. RYDA handles the LLC paperwork. 3% transfer fee." />
          </div>
        </div>
      </section>

      {/* Revenue */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Revenue model</p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Five revenue streams. Recurring-heavy.
          </h2>
          <ul className="mt-10 space-y-4 text-sm">
            <Revenue
              line="Vehicle Management Fee"
              detail="12% of vehicle value/year, charged to the LLC. On a $340K vehicle: $40,800/year."
              tag="Primary · Recurring"
            />
            <Revenue
              line="Membership"
              detail="$1,500/yr Black tier (or $1,000/yr for founding 100). Recurring subscription."
              tag="Recurring"
            />
            <Revenue
              line="Share Transfer Fee"
              detail="3% of transfer price on every member-to-member transfer of a co-ownership share."
              tag="Transactional"
            />
            <Revenue
              line="Insurance Administration"
              detail="$500/co-owner/year for policy management, claim handling, certificate distribution."
              tag="Recurring"
            />
            <Revenue
              line="Ancillary Services"
              detail="White-glove delivery, track day, detailing, member events. Variable per member."
              tag="Variable"
            />
          </ul>
        </div>
      </section>

      {/* Projections */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Projections</p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            3-year plan.
          </h2>
          <div className="mt-12 overflow-hidden rounded-2xl border border-rule bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-6 py-4 text-left">Year</th>
                  <th className="px-6 py-4 text-left">Markets</th>
                  <th className="px-6 py-4 text-right">Vehicles</th>
                  <th className="px-6 py-4 text-right">Co-owners</th>
                  <th className="px-6 py-4 text-right">ARR</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                <Row y="Year 1" m="Miami" v="5" c="30" arr="$252K" />
                <Row y="Year 2" m="Miami + LA" v="12" c="72" arr="$700K" />
                <Row y="Year 3" m="Miami + LA + NY" v="20" c="120" arr="$1.2M" emph />
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-mute">
            Year 3 EBITDA target: 16.1%. Full financial model available on request.
          </p>
        </div>
      </section>

      {/* Comparable analogs */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Comparables</p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Access products at scale. Supercars are the gap.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Comp name="Supercar Sharing AG" asset="Supercars · Switzerland" outcome="1,300+ members. CHF 34M in transactions over 10 years. Direct precedent — same structure RYDA adapts." />
            <Comp name="NetJets jet card" asset="Private aviation access" outcome="Multi-billion-dollar program. Depreciating-asset access product, no securities filing. Direct structural analog." />
            <Comp name="Soho House / Equinox Black" asset="Luxury membership" outcome="Hundreds of thousands of members at $5–10K+/year. Proves luxury access has scale demand at this price band." />
            <Comp name="Country club / yacht club" asset="Member-owned recreational asset" outcome="Centuries-old structure: members own a depreciating asset together, hire staff to operate it. The legal template RYDA uses." />
          </div>
        </div>
      </section>

      {/* Use of funds */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Use of funds</p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            $2.5M seed allocation.
          </h2>
          <ul className="mt-10 space-y-4 text-sm">
            <Use line="Operations + first hires" pct="35%" detail="COO, Head of Acquisition, Head of Member Experience, ops staff for Miami launch." />
            <Use line="Fleet acquisition support" pct="25%" detail="Earnest deposits + bridge equity for first 5 vehicles before co-owner closings." />
            <Use line="Platform build" pct="20%" detail="Engineering, design, member dashboard, integrations (Stripe, Persona KYC, insurance, DMV/title workflows)." />
            <Use line="Legal + insurance setup" pct="10%" detail="Outside counsel for member-managed LLC structure, MSA template, multi-named-insured fleet policy negotiation." />
            <Use line="Marketing + member acquisition" pct="10%" detail="Founding-100 outreach, events, content, PR for launch." />
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section id="request-deck" className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-4xl font-light sm:text-5xl">
            Want the deck and the data room?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            Tell us a little about you. We follow up within one business day to
            confirm fit and send the deck and data room directly.
          </p>
          <InvestorInquiryForm />
          <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-cream/50">
            This page is informational and is not an offer to sell or a
            solicitation of an offer to buy any security. Any future financing
            in RYDA Inc. would be conducted through definitive offering
            documents and applicable exemptions from registration.
          </p>
        </div>
      </section>
    </>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-light text-ink sm:text-5xl">{number}</p>
      <p className="mt-2 text-xs uppercase tracking-wider text-mute">{label}</p>
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

function Revenue({ line, detail, tag }: { line: string; detail: string; tag: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-rule bg-surface p-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="flex-1">
        <p className="font-display text-lg text-ink">{line}</p>
        <p className="mt-1 text-sm text-ink-soft">{detail}</p>
      </div>
      <span className="text-xs uppercase tracking-wider text-red">{tag}</span>
    </li>
  );
}

function Row({
  y,
  m,
  v,
  c,
  arr,
  emph,
}: {
  y: string;
  m: string;
  v: string;
  c: string;
  arr: string;
  emph?: boolean;
}) {
  const cls = emph ? "font-display text-base text-ink" : "text-ink-soft";
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className="px-6 py-4 text-sm">{y}</td>
      <td className="px-6 py-4 text-sm">{m}</td>
      <td className={`px-6 py-4 text-right tabular-nums ${cls}`}>{v}</td>
      <td className={`px-6 py-4 text-right tabular-nums ${cls}`}>{c}</td>
      <td className={`px-6 py-4 text-right tabular-nums ${cls}`}>{arr}</td>
    </tr>
  );
}

function Comp({ name, asset, outcome }: { name: string; asset: string; outcome: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{name}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-red">{asset}</p>
      <p className="mt-4 text-sm text-ink-soft">{outcome}</p>
    </div>
  );
}

function Use({ line, pct, detail }: { line: string; pct: string; detail: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-rule bg-surface p-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="flex-1">
        <p className="font-display text-base text-ink">{line}</p>
        <p className="mt-1 text-sm text-ink-soft">{detail}</p>
      </div>
      <span className="font-display text-2xl text-ink tabular-nums">{pct}</span>
    </li>
  );
}
