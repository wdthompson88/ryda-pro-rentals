import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { VEHICLES, formatUSD, changeFromPrev } from "@/lib/market-data";

export default function Home() {
  // Use the first 4 vehicles as the "featured market" carousel.
  const featured = VEHICLES.slice(0, 4);

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-red">
              First in the US · Miami · Q3 2026
            </p>
            <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              A new way to own{" "}
              <span className="italic text-red">the world's best cars.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              RYDA is the first US asset-backed supercar co-ownership platform.
              Hold a real share in a Ferrari, Lamborghini, or McLaren — held
              by a Delaware LLC, structured the way fractional jets are.
              Drive ~50 days a year. Sell on the member-only market after
              twelve months.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/markets"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                See the market
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-medium text-ink hover:border-ink"
              >
                How it works
              </Link>
            </div>
          </div>

          {/* Mini market preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
                  Live market
                </p>
                <Link href="/markets" className="text-xs font-medium text-red hover:text-red-deep">
                  All →
                </Link>
              </div>
              <ul className="divide-y divide-rule">
                {featured.map((v) => {
                  const c = changeFromPrev(v.pricePerShare, v.prevClose);
                  return (
                    <li key={v.symbol}>
                      <Link
                        href={`/markets/${v.symbol}`}
                        className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-cream-2/40"
                      >
                        <div>
                          <p className="font-display text-base text-ink">{v.name}</p>
                          <p className="text-xs text-mute">{v.ticker}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-ink tabular-nums">
                            {formatUSD(v.pricePerShare)}
                          </p>
                          <p
                            className="text-xs tabular-nums"
                            style={{ color: c.isUp ? "#00C805" : "#DC2626" }}
                          >
                            {c.isUp ? "▲" : "▼"} {c.pct.toFixed(2)}%
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-3 text-center text-xs text-mute">
              Demo data — live trading begins at Miami launch.
            </p>
          </div>
        </div>
      </section>

      {/* What this actually is — ownership-focused */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                What this is
              </p>
              <h2 className="mt-4 font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
                A new asset class.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-soft">
                Fractional ownership has matured into a multi-billion-dollar
                category in private aviation (NetJets, $3B+ AUM), fine art
                (Masterworks, $1B+ AUM), and vacation real estate. It's never
                been built for exotic vehicles in the US — until now.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                This is not a rental marketplace. It's a structured,
                asset-backed ownership platform — with the legal framework,
                insurance, and member-only secondary market that's been
                missing for the last twenty years.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:col-span-7">
              <DiffCard title="Real ownership" body="Each vehicle lives in a Delaware LLC. You hold a registered membership interest — not a club point, not a token, not a timeshare." />
              <DiffCard title="Curated only" body="We don't list anyone's car. Every vehicle is hand-selected, vetted, and prepared by RYDA. Quality is consistent." />
              <DiffCard title="Member-only market" body="Sell your share to verified members after 12 months. Settlement in 1–3 business days. Liquidity that didn't exist before." />
              <DiffCard title="Concierge-grade ops" body="Storage, insurance, maintenance, scheduling, white-glove handover — all RYDA. You drive. We handle the rest." />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">How it works</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
            Five steps to a supercar in your name.
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-5">
            <Step n="01" title="Verify" body="Apply, complete identity verification, and confirm RYDA membership requirements." />
            <Step n="02" title="Choose" body="Browse rentals or buy shares in curated supercars across Miami, LA, and NY." />
            <Step n="03" title="Acquire" body="3 to 8 co-owners form a vehicle LLC. You sign and fund your share via wire or ACH." />
            <Step n="04" title="Drive" body="Book your time on the RYDA app. ~50 days and ~4,000 miles per share, per year." />
            <Step n="05" title="Exit" body="After 12 months, sell on the RYDA market. We handle the paperwork. 3% transfer fee." />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Why RYDA</p>
              <h2 className="mt-4 font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
                Asset-backed. Curated. Concierge-operated.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-soft">
                Renting a Ferrari for the weekend builds nothing. Owning one
                outright costs $80,000 a year before you turn the key. RYDA is
                the third option — built on the legal and operational
                playbook that fractional aviation has used for decades, applied
                to exotic cars in the US for the first time.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:col-span-7">
              <Pillar title="Real ownership" body="Each vehicle lives in a Delaware LLC. Your share is a registered membership interest, not a club point." />
              <Pillar title="All costs included" body="Insurance, storage, maintenance, depreciation, and registration are bundled. No surprise bills." />
              <Pillar title="Curated fleet" body="Every vehicle is hand-selected — Ferrari, Lamborghini, McLaren, Porsche, Aston Martin. Track-day eligible options on request." />
              <Pillar title="Liquid exit" body="A members-only secondary market. List your share after 12 months — RYDA handles transfer and paperwork." />
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Founding members</p>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
            Membership is by invitation.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/70">
            We're vetting the first 100 founding members for the Miami launch.
            Tell us about yourself and we'll be in touch with the next steps.
          </p>
          <div className="mt-10">
            <WaitlistForm />
          </div>
          <p className="mt-6 text-xs text-cream/50">
            Membership is limited to verified individuals 28 years or older.
            Co-ownership shares are LLC membership interests, not registered
            securities — see legal disclaimer (forthcoming).
          </p>
        </div>
      </section>

    </>
  );
}

function DiffCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface p-8">
      <p className="font-display text-xl text-ink">{title}</p>
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

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface p-8">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

