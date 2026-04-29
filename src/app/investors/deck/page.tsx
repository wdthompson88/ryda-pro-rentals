"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DeckPage() {
  const [slide, setSlide] = useState(0);
  const total = SLIDES.length;
  const next = () => setSlide((s) => Math.min(s + 1, total - 1));
  const prev = () => setSlide((s) => Math.max(s - 1, 0));

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const Slide = SLIDES[slide].render;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-rule bg-cream/95 px-6 py-3 backdrop-blur sm:px-10">
        <Link href="/investors" className="font-display text-xl text-ink hover:text-red">
          RYDA
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-mute">
          Investor Deck · Confidential
        </p>
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <span className="tabular-nums">
            {slide + 1} / {total}
          </span>
        </div>
      </header>

      {/* Slide */}
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12 sm:py-16">
        <div className="w-full max-w-5xl">
          <div className="rounded-3xl border border-rule bg-surface p-10 shadow-2xl sm:p-16 lg:p-20">
            <Slide />
          </div>
        </div>
      </main>

      {/* Footer nav */}
      <footer className="border-t border-rule bg-cream/95 px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <button
            onClick={prev}
            disabled={slide === 0}
            className="h-11 rounded-full border border-rule px-5 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Prev
          </button>

          {/* Progress bar */}
          <div className="hidden flex-1 items-center gap-1 sm:flex">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i === slide
                    ? "bg-red"
                    : i < slide
                    ? "bg-red/40"
                    : "bg-rule"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            disabled={slide === total - 1}
            className="h-11 rounded-full bg-red px-5 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next →
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-mute">
          Use ← → arrow keys or space to navigate
        </p>
      </footer>
    </div>
  );
}

// ── Slide content ──────────────────────────────────────────────

const SLIDES: { title: string; render: React.ComponentType }[] = [
  {
    title: "Title",
    render: TitleSlide,
  },
  {
    title: "Problem",
    render: ProblemSlide,
  },
  {
    title: "Market",
    render: MarketSlide,
  },
  {
    title: "Solution",
    render: SolutionSlide,
  },
  {
    title: "Why Now",
    render: WhyNowSlide,
  },
  {
    title: "Business Model",
    render: ModelSlide,
  },
  {
    title: "Comparables",
    render: ComparablesSlide,
  },
  {
    title: "Projections",
    render: ProjectionsSlide,
  },
  {
    title: "Use of Funds",
    render: FundsSlide,
  },
  {
    title: "Team",
    render: TeamSlide,
  },
  {
    title: "Ask",
    render: AskSlide,
  },
  {
    title: "Contact",
    render: ContactSlide,
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.25em] text-red">
      {children}
    </p>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mt-4 font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl lg:text-7xl">
      {children}
    </h1>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 font-display text-3xl font-light leading-tight text-ink sm:text-4xl lg:text-5xl">
      {children}
    </h2>
  );
}

function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 max-w-3xl text-base leading-relaxed text-ink-soft sm:text-lg">
      {children}
    </p>
  );
}

function StatGrid({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-10">
      {stats.map((s) => (
        <div key={s.label}>
          <p className="font-display text-3xl font-light text-ink sm:text-4xl">
            {s.value}
          </p>
          <p className="mt-2 text-xs uppercase tracking-wider text-mute">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Slides ────────────────────────────────────────────────────

function TitleSlide() {
  return (
    <div className="text-left">
      <Eyebrow>Seed round · open</Eyebrow>
      <h1 className="mt-6 font-display text-7xl font-light leading-[1] tracking-tight text-ink sm:text-8xl lg:text-9xl">
        RYDA
      </h1>
      <p className="mt-6 max-w-2xl font-display text-2xl font-light text-red sm:text-3xl">
        Own the world's best cars. Together.
      </p>
      <p className="mt-4 max-w-2xl text-base text-ink-soft sm:text-lg">
        A US member-managed supercar co-ownership platform.
        Miami launch Q3 2026.
      </p>
      <div className="mt-16 border-t border-rule pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-mute">
          Seed round · $2.5M target
        </p>
      </div>
    </div>
  );
}

function ProblemSlide() {
  return (
    <div>
      <Eyebrow>The problem</Eyebrow>
      <H2>All-or-nothing supercar ownership.</H2>
      <Lede>
        A 2024 Ferrari 296 GTB costs $320,000 to buy and $80,000+ a year in
        carrying costs. The math for solo ownership has never worked for the
        people who actually want these cars. The alternative — renting at
        $2,500–$5,000 per day — is hollow, transactional, with no priority
        access, no community, and no relationship with the vehicle.
      </Lede>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Pain
          stat="$320K"
          label="Sticker price"
          body="Ferrari 296 GTB."
        />
        <Pain
          stat="$80K+"
          label="Annual carrying"
          body="Insurance, storage, maintenance, depreciation."
        />
        <Pain
          stat="$2,500/day"
          label="Rental"
          body="No priority. No community. No relationship with the car."
        />
      </div>
    </div>
  );
}

function Pain({ stat, label, body }: { stat: string; label: string; body: string }) {
  return (
    <div className="border-l-2 border-red pl-5">
      <p className="font-display text-4xl font-light text-ink">{stat}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-red">{label}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function MarketSlide() {
  return (
    <div>
      <Eyebrow>Market</Eyebrow>
      <H2>Big enough to matter. Small enough to win.</H2>
      <Lede>
        The US luxury auto market is $14.8B/yr. Within it, ~2.4M households
        meet our target profile (HNW + demonstrated exotic-vehicle interest).
        We need ~120 of them to hit Year 3.
      </Lede>
      <StatGrid
        stats={[
          { value: "$14.8B", label: "US luxury auto market" },
          { value: "2.4M", label: "Target HHs (HNW + interest)" },
          { value: "120", label: "Members for Y3 plan" },
          { value: "0", label: "Member-managed US competitors" },
        ]}
      />
    </div>
  );
}

function SolutionSlide() {
  return (
    <div>
      <Eyebrow>Solution</Eyebrow>
      <H2>One car. 5–10 co-owners. Member-managed LLC. Real keys.</H2>
      <ol className="mt-12 space-y-4">
        {[
          ["Source", "RYDA sources curated supercars on behalf of each vehicle LLC in target markets."],
          ["Structure", "Each vehicle = single-purpose Delaware LLC. 5–10 verified members co-own and manage the LLC together."],
          ["Operate", "RYDA contracts with each LLC as a service provider — storage, insurance, maintenance, scheduling, concierge."],
          ["Use", "Members book usage on the RYDA app — ~30 days, ~4,000 mi per share per year."],
          ["Transfer", "After 12 months, members transfer their share to another verified member. RYDA handles LLC paperwork."],
        ].map(([title, body], i) => (
          <li key={title} className="flex gap-6">
            <span className="font-display text-2xl text-red">0{i + 1}</span>
            <div>
              <p className="font-display text-xl text-ink">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WhyNowSlide() {
  return (
    <div>
      <Eyebrow>Why now</Eyebrow>
      <H2>The structure works. The market wants it. Nobody has built it.</H2>
      <Lede>
        Three things had to be true for RYDA to work — and now all three are.
      </Lede>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Why
          title="Proven access model"
          body="NetJets jet card has shown that depreciating-asset access products scale to billions. Supercar Sharing AG has run member-managed supercar co-ownership in Switzerland for a decade. The structural playbook exists."
        />
        <Why
          title="Member-managed LLC"
          body="Delaware's member-managed LLC framework gives members real co-ownership and real authority over their vehicle. Members co-own and manage the LLC; RYDA is hired as a service provider. The product is luxury access — drive the car, share the cost — not investment return."
        />
        <Why
          title="Insurance carriers"
          body="Hagerty, Travelers, and CHUBB now write multi-driver fleet policies for vehicles >$300K. This was impossible 5 years ago. We have insurer signoff on the multi-named-insured LLC structure."
        />
      </div>
    </div>
  );
}

function Why({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-cream-2/40 p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function ModelSlide() {
  return (
    <div>
      <Eyebrow>Business model</Eyebrow>
      <H2>Five revenue streams. Recurring-heavy.</H2>
      <ul className="mt-12 space-y-3 text-sm">
        <Rev
          line="Vehicle Management Fee"
          rate="12%"
          detail="Of vehicle value/yr, charged to LLC. Primary recurring revenue."
        />
        <Rev
          line="Membership"
          rate="$500–$1,500"
          detail="Blue ($500/yr) or Black ($1,500/yr). Recurring."
        />
        <Rev
          line="Share Transfer Fee"
          rate="3%"
          detail="Of agreed price on every member-to-member share transfer."
        />
        <Rev
          line="Insurance Administration"
          rate="$500"
          detail="Per co-owner per year. Policy management + claims."
        />
        <Rev
          line="Ancillary Services"
          rate="Variable"
          detail="White-glove delivery, track day, detailing, member events."
        />
      </ul>
    </div>
  );
}

function Rev({ line, rate, detail }: { line: string; rate: string; detail: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-rule bg-cream-2/40 p-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="flex-1">
        <p className="font-display text-lg text-ink">{line}</p>
        <p className="mt-1 text-sm text-ink-soft">{detail}</p>
      </div>
      <span className="font-display text-2xl text-red">{rate}</span>
    </li>
  );
}

function ComparablesSlide() {
  return (
    <div>
      <Eyebrow>Comparables</Eyebrow>
      <H2>Access products at scale. Supercars are the gap.</H2>
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Comp
          name="Supercar Sharing AG"
          asset="Supercars · Switzerland"
          outcome="1,300+ members. CHF 34M in transactions over a decade. Direct precedent — same member co-ownership structure RYDA adapts for the US."
        />
        <Comp
          name="NetJets jet card"
          asset="Private aviation access"
          outcome="Multi-billion-dollar program. Depreciating-asset access product, no securities filing. Direct structural analog for what we're building."
        />
        <Comp
          name="Soho House / Equinox Black"
          asset="Luxury membership"
          outcome="Hundreds of thousands of members at $5–10K+/year. Proves luxury access has scale demand at this price band."
        />
        <Comp
          name="Country club / yacht club"
          asset="Member-owned recreational asset"
          outcome="Centuries-old structure: members own a depreciating asset together, hire staff to operate it, vote on material decisions. The legal template RYDA uses."
        />
      </div>
    </div>
  );
}

function Comp({ name, asset, outcome }: { name: string; asset: string; outcome: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-cream-2/40 p-6">
      <p className="font-display text-2xl text-ink">{name}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-red">{asset}</p>
      <p className="mt-4 text-sm text-ink-soft">{outcome}</p>
    </div>
  );
}

function ProjectionsSlide() {
  return (
    <div>
      <Eyebrow>Projections</Eyebrow>
      <H2>3-year plan to $1.2M ARR.</H2>
      <div className="mt-12 overflow-hidden rounded-2xl border border-rule bg-cream-2/40">
        <table className="w-full text-sm">
          <thead className="border-b border-rule bg-cream-2">
            <tr className="text-xs uppercase tracking-wider text-ink-soft">
              <th className="px-6 py-4 text-left">Year</th>
              <th className="px-6 py-4 text-left">Markets</th>
              <th className="px-6 py-4 text-right">Vehicles</th>
              <th className="px-6 py-4 text-right">Co-owners</th>
              <th className="px-6 py-4 text-right">ARR</th>
              <th className="px-6 py-4 text-right">EBITDA</th>
            </tr>
          </thead>
          <tbody>
            <Yr y="Year 1" m="Miami" v="5" c="30" arr="$252K" ebitda="(15%)" />
            <Yr y="Year 2" m="Miami + LA" v="12" c="72" arr="$700K" ebitda="3%" />
            <Yr y="Year 3" m="+ NY" v="20" c="120" arr="$1.2M" ebitda="16.1%" emph />
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs text-mute">
        Numbers exclude vehicle balance-sheet financing. Full model on request.
      </p>
    </div>
  );
}

function Yr({
  y,
  m,
  v,
  c,
  arr,
  ebitda,
  emph,
}: {
  y: string;
  m: string;
  v: string;
  c: string;
  arr: string;
  ebitda: string;
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
      <td className={`px-6 py-4 text-right tabular-nums ${cls}`}>{ebitda}</td>
    </tr>
  );
}

function FundsSlide() {
  return (
    <div>
      <Eyebrow>Use of funds</Eyebrow>
      <H2>$2.5M seed allocation.</H2>
      <ul className="mt-12 space-y-3 text-sm">
        <Fund
          line="Operations + first hires"
          pct="35%"
          dollars="$875K"
          detail="COO, Head of Acquisition, Head of Member Experience, ops team for Miami."
        />
        <Fund
          line="Fleet acquisition support"
          pct="25%"
          dollars="$625K"
          detail="Earnest deposits + bridge equity for first 5 vehicles before co-owner closings."
        />
        <Fund
          line="Platform build"
          pct="20%"
          dollars="$500K"
          detail="Engineering, design, member dashboard, member-to-member transfer flow, integrations (Stripe, Persona, insurance)."
        />
        <Fund
          line="Insurance + legal"
          pct="10%"
          dollars="$250K"
          detail="Outside counsel for LLC / MSA / insurance structure, fleet insurance, founding LLC formations."
        />
        <Fund
          line="Marketing + member acquisition"
          pct="10%"
          dollars="$250K"
          detail="Founding-100 outreach, events, content, PR for launch."
        />
      </ul>
    </div>
  );
}

function Fund({
  line,
  pct,
  dollars,
  detail,
}: {
  line: string;
  pct: string;
  dollars: string;
  detail: string;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-rule bg-cream-2/40 p-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="flex-1">
        <p className="font-display text-base text-ink">{line}</p>
        <p className="mt-1 text-sm text-ink-soft">{detail}</p>
      </div>
      <div className="flex items-baseline gap-3 whitespace-nowrap">
        <span className="font-display text-2xl text-ink tabular-nums">{pct}</span>
        <span className="text-sm text-mute tabular-nums">{dollars}</span>
      </div>
    </li>
  );
}

function TeamSlide() {
  return (
    <div>
      <Eyebrow>Team</Eyebrow>
      <H2>Three co-founders. Hiring through Q4 2026.</H2>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Person
          name="Ryan Galli"
          role="Co-Founder · CEO / CTO"
          image="/team/ryan.jpg"
          tags={["Odin Partners NY", "Bucknell Psych"]}
          bio="Runs Fixed Income Executive Search at Odin Partners NY — placing senior front-office talent at banks and macro hedge funds. Bucknell Psychology."
        />
        <Person
          name="Dave Thompson"
          role="Co-Founder · CFO / COO"
          image="/team/dave.jpg"
          tags={["SolomonEdwards", "Series 79"]}
          bio="Capital structuring + operational diligence. Manager, Private Equity Services at SolomonEdwards. 3+ years Healthcare M&A at Ziegler. SIE + Series 79. Bucknell Economics."
        />
        <Person
          name="Stefano Galli"
          role="Co-Founder · CRO / CSO"
          image="/team/stefano.jpg"
          tags={["Evercore ISI", "Wharton MBA"]}
          bio="30+ years in institutional equity markets. MD, Global Equity Sales at Evercore ISI. Prior: BofA ML (London), Artio Global ($75B AUM peak), 8 yrs at Merrill. Wharton MBA."
        />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Hiring role="Head of Vehicle Acquisition" />
        <Hiring role="Head of Member Experience" />
        <Hiring role="Senior Full-Stack Engineer" />
      </div>
    </div>
  );
}

function Person({
  name,
  role,
  bio,
  image,
  tags,
  ghost,
}: {
  name: string;
  role: string;
  bio: string;
  image?: string;
  tags?: string[];
  ghost?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-rule p-6 ${
        ghost ? "bg-cream-2/40 border-dashed" : "bg-cream-2/40"
      }`}
    >
      <div className="aspect-square w-20 overflow-hidden rounded-full bg-ink/10">
        {image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover"
            style={{ filter: "grayscale(100%) contrast(1.05)" }}
          />
        )}
      </div>
      <p className="mt-4 font-display text-xl text-ink">{name}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-red">{role}</p>
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-rule bg-cream-2/40 px-2 py-0.5 text-[10px] text-ink-soft"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{bio}</p>
    </div>
  );
}

function Hiring({ role }: { role: string }) {
  return (
    <div className="rounded-xl border border-dashed border-rule bg-cream-2/20 p-4 text-center">
      <p className="text-xs uppercase tracking-wider text-mute">Hiring</p>
      <p className="mt-1 text-sm text-ink">{role}</p>
    </div>
  );
}

function AskSlide() {
  return (
    <div>
      <Eyebrow>Ask</Eyebrow>
      <H2>$2.5M seed at $10M post.</H2>
      <Lede>
        We're targeting a $2.5M seed round at a $10M post-money valuation.
        Lead investor preference: a fund or angel with experience in
        marketplaces, luxury / hospitality, or fractional ownership.
      </Lede>
      <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-10">
        {[
          { label: "Round size", value: "$2.5M" },
          { label: "Pre-money", value: "$7.5M" },
          { label: "Post-money", value: "$10M" },
          { label: "Min check", value: "$50K" },
        ].map((s) => (
          <div key={s.label}>
            <p className="font-display text-3xl font-light text-ink sm:text-4xl">
              {s.value}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wider text-mute">
              {s.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-12 text-xs text-mute">
        SAFE preferred. Standard YC-style terms. Diligence materials available
        on request.
      </p>
    </div>
  );
}

function ContactSlide() {
  return (
    <div className="text-center">
      <Eyebrow>Let's talk</Eyebrow>
      <h2 className="mt-6 font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
        We answer every email.
      </h2>
      <div className="mt-12 space-y-3 text-base text-ink-soft">
        <p>
          <span className="text-mute">Investor relations:</span>{" "}
          <Link
            href="/contact?type=Investor#form"
            target="_blank"
            className="font-medium text-red hover:text-red-deep"
          >
            ryda.com/contact (investor)
          </Link>
        </p>
        <p>
          <span className="text-mute">Press:</span>{" "}
          <Link
            href="/contact?type=Press#form"
            target="_blank"
            className="font-medium text-red hover:text-red-deep"
          >
            ryda.com/contact (press)
          </Link>
        </p>
        <p>
          <span className="text-mute">General:</span>{" "}
          <Link
            href="/contact#form"
            target="_blank"
            className="font-medium text-red hover:text-red-deep"
          >
            ryda.com/contact
          </Link>
        </p>
      </div>
      <p className="mt-16 text-xs uppercase tracking-[0.2em] text-mute">
        RYDA LLC · Delaware · Miami HQ
      </p>
    </div>
  );
}
