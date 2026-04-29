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
              Member-managed supercar co-ownership · Miami · Q3 2026
            </p>
            <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Co-own the world's{" "}
              <span className="italic text-red">most exceptional cars.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              Co-own a real Ferrari, Lamborghini, or McLaren together with
              5–10 other verified members in a Delaware LLC. Drive it up to
              ~65 days a year. Transfer your seat when you're done.
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

      {/* Why RYDA — consolidated into 5-step block */}
      <section id="how-it-works" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Why RYDA
          </p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-light leading-tight text-ink sm:text-5xl">
            Owned by you. Operated by us.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Renting builds nothing. Owning an exotic car outright costs
            ~$40–80K a year before you turn the key. RYDA is the third option.
          </p>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-5">
            <Step n="01" title="Verify" body="Apply, complete identity verification, and confirm RYDA membership requirements." />
            <Step n="02" title="Choose" body="Browse the curated fleet. Rent any vehicle by the day, or claim a co-ownership seat." />
            <Step n="03" title="Co-own" body="5–10 members form a Delaware LLC together to hold the vehicle. You sign the operating agreement and fund your seat." />
            <Step n="04" title="Drive" body="Book your time on the RYDA app. Up to ~65 days and ~4,000 miles per seat, per year — exact entitlement depends on the vehicle." />
            <Step n="05" title="Transfer" body="After 12 months, transfer your seat to another verified member. RYDA handles the LLC paperwork. 3% transfer fee." />
          </div>
          <div className="mt-16 flex justify-center">
            <Link
              href="/how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 px-7 text-sm font-medium text-ink hover:border-ink"
            >
              Learn more →
            </Link>
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

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-sm text-red">{n}</p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

