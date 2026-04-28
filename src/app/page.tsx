import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { VEHICLES, formatUSD } from "@/lib/market-data";

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
              Co-own the world's{" "}
              <span className="italic text-red">most exceptional cars.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              RYDA is the first US member-managed supercar co-ownership
              platform. Become a co-owner of a real Ferrari, Lamborghini, or
              McLaren — held in a Delaware LLC that you and 5–10 other
              verified members manage together. Drive ~50 days a year. Transfer
              your seat to another member when you're ready to move on.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/markets"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                See the fleet
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-medium text-ink hover:border-ink"
              >
                How it works
              </Link>
            </div>
          </div>

          {/* Mini fleet preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
                  Featured fleet
                </p>
                <Link href="/markets" className="text-xs font-medium text-red hover:text-red-deep">
                  All →
                </Link>
              </div>
              <ul className="divide-y divide-rule">
                {featured.map((v) => (
                  <li key={v.symbol}>
                    <Link
                      href={`/markets/${v.symbol}`}
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-cream-2/40"
                    >
                      <div>
                        <p className="font-display text-base text-ink">{v.name}</p>
                        <p className="text-xs text-mute">
                          {v.year} · {v.brand}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-ink tabular-nums">
                          {formatUSD(v.pricePerShare)}
                        </p>
                        <p className="text-xs text-mute">per seat</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-center text-xs text-mute">
              Co-ownership seats. {featured.length} of {VEHICLES.length} vehicles shown.
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
                Real ownership. Real driving.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-soft">
                Each car you co-own is held in a Delaware LLC that you and
                5–10 other verified members manage together. RYDA is your
                operations partner — storage, insurance, maintenance,
                scheduling, white-glove delivery — but the LLC is yours.
                You're not buying an investment product. You're buying a
                seat in a club, a key to a Ferrari, and a registered
                ownership stake in the asset that backs both.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                This is not a rental marketplace. It is not a fund. It is
                not a security. It is the closest thing to actually owning
                a $340K Ferrari for $50K — without the $80K-a-year carrying
                cost or the 363 days a year you wouldn't be driving it.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:col-span-7">
              <DiffCard title="Real ownership" body="Each car is held in a Delaware LLC. You're a member of that LLC, named on its records. Vote on material decisions with your co-owners. You're not a passive investor — you're a co-owner who hired a service company." />
              <DiffCard title="Curated only" body="We don't list anyone's car. Every vehicle is hand-selected, vetted, and prepared by RYDA. Quality is consistent across the fleet." />
              <DiffCard title="Member-to-member transfer" body="Move on whenever you want after the 12-month minimum hold. Transfer your seat to another verified member. RYDA handles the LLC paperwork." />
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
            <Step n="02" title="Choose" body="Browse the curated fleet. Rent any vehicle by the day, or claim a co-ownership seat." />
            <Step n="03" title="Co-own" body="5–10 members form a Delaware LLC together to hold the vehicle. You sign the operating agreement and fund your seat." />
            <Step n="04" title="Drive" body="Book your time on the RYDA app. ~50 days and ~4,000 miles per seat, per year." />
            <Step n="05" title="Transfer" body="After 12 months, transfer your seat to another verified member. RYDA handles the LLC paperwork. 3% transfer fee." />
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
                Owned by you. Operated by us.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-soft">
                Renting a Ferrari for the weekend builds nothing. Owning one
                outright costs $80,000 a year before you turn the key. RYDA
                is the third option — a member-managed co-ownership club
                where 5–10 verified people share a real Delaware LLC that
                holds a real car. You drive ~50 days a year. We handle every
                operational detail. You're a co-owner, not a customer.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:col-span-7">
              <Pillar title="Real ownership" body="Each car is held in a Delaware LLC that you and your co-owners manage together. Members vote on sales, modifications, and replacements." />
              <Pillar title="All costs included" body="Insurance, storage, maintenance, registration, and reserves are bundled into a single annual management fee paid to the LLC. No surprise bills." />
              <Pillar title="Curated fleet" body="Every vehicle is hand-selected — Ferrari, Lamborghini, McLaren, Porsche, Aston Martin, Rolls-Royce. Track-day eligible options on request." />
              <Pillar title="Member-to-member transfer" body="Move on after the 12-month minimum hold. Transfer your seat to another verified member at the price you negotiate. RYDA handles the paperwork." />
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
            RYDA is a luxury access platform — co-ownership stakes are not
            investments and are not offered for investment purposes.
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

