import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Investors — RYDA",
  description:
    "RYDA's seed round is open. The first US asset-backed supercar co-ownership platform. $2.5M target. Miami launch Q3 2026.",
};

export default function InvestorsPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Investors
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl">
            Pacaso for supercars,{" "}
            <span className="italic text-red">in the US.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-cream/70">
            RYDA is the first asset-backed supercar co-ownership platform
            in the United States. We're raising a $2.5M seed to launch
            Miami in Q3 2026 and reach 20 vehicles + 120 co-owners +
            $1.2M ARR by Year 3.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/investors/deck"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              View the deck →
            </Link>
            <Link
              href="mailto:investors@ryda.com?subject=Investor%20interest"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream hover:bg-cream/5"
            >
              Email for data room
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
          <div className="mt-8 space-y-6 text-base leading-relaxed text-ink-soft">
            <p>
              A 2024 Ferrari 296 GTB costs $320,000 to buy and $80,000+ a
              year in carrying costs. For the overwhelming majority of
              people who want to drive one, this math has never worked.
            </p>
            <p>
              The alternative — renting at $2,500 to $5,000 per day —
              offers no equity, no priority access, inconsistent vehicle
              quality, and no community. It is transactional and
              forgettable.
            </p>
            <p>
              Despite a proven fractional model in real estate (Pacaso),
              aviation (NetJets, Wheels Up), and art (Masterworks), no US
              platform has built the equivalent for exotic vehicles. RYDA
              fills that gap.
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
            <Step n="01" title="Source" body="RYDA acquires curated supercars in target markets — Ferrari, Lamborghini, McLaren, Aston Martin, Rolls-Royce." />
            <Step n="02" title="Structure" body="Each vehicle is owned by a single-purpose Delaware LLC. 3–8 verified accredited members hold shares." />
            <Step n="03" title="Operate" body="RYDA handles storage, insurance, maintenance, scheduling, and concierge through partner facilities." />
            <Step n="04" title="Use" body="Members book usage on the RYDA app — typically 50 days + 4,000 miles per share per year." />
            <Step n="05" title="Exit" body="After 12 months, members can sell their share on RYDA's member-only secondary market." />
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
              line="Share Transfer Commission"
              detail="3% of transfer price on every secondary-market sale of a co-ownership share."
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
            The model is proven. The asset class is new.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Comp name="Pacaso" asset="Vacation real estate" outcome="$1B+ GMV in 2 years. Now mature." />
            <Comp name="NetJets" asset="Private aviation" outcome="$3B+ AUM in fractional aircraft. Berkshire-owned." />
            <Comp name="Masterworks" asset="Fine art" outcome="$1B+ in fractional art. SEC-registered." />
            <Comp name="Supercar Sharing AG" asset="Supercars (Switzerland)" outcome="1,300+ members. CHF 34.3M transactions. The model RYDA adapts." />
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
            <Use line="Platform build" pct="20%" detail="Engineering, design, secondary-market matching engine, integrations (Stripe, KYC, insurance)." />
            <Use line="Insurance + legal" pct="10%" detail="Securities counsel, fleet insurance, founding LLC structures." />
            <Use line="Marketing + member acquisition" pct="10%" detail="Founding-100 outreach, events, content, PR for launch." />
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-4xl font-light sm:text-5xl">
            Want the deck and the data room?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            Email <a href="mailto:investors@ryda.com" className="text-red hover:text-red-deep">investors@ryda.com</a> with a brief intro.
            We send the deck to qualified investors within 24 hours and follow up with a call.
          </p>
          <a
            href="mailto:investors@ryda.com?subject=Investor%20interest"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Request the deck
          </a>
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
