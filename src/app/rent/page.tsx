import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { VEHICLES, formatUSD } from "@/lib/market-data";

export const metadata = {
  title: "Rent — RYDA",
  description:
    "Rent a curated supercar by the day. Hand-prepared, fully insured, white-glove delivery available.",
};

export default function RentPage() {
  const rentable = VEHICLES.filter((v) => v.rentalAvailable);

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Try before you buy
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Drive it before you own a piece of it.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Rentals are how members and prospective buyers experience a RYDA
            vehicle before committing to a share. Hand-prepared, fully insured,
            white-glove delivered. Same fleet, same operations team — just
            paid by the day instead of by the share.
          </p>
          <Link
            href="#available"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
          >
            See what's available →
          </Link>
        </div>
      </section>

      {/* Vehicle grid */}
      <section id="available" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-3xl text-ink">Available now</h2>
            <p className="text-sm text-mute">{rentable.length} vehicles · Miami · LA · NYC</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rentable.map((v) => (
              <Link
                key={v.symbol}
                href={`/rent/${v.symbol.toLowerCase()}`}
                className="group block overflow-hidden rounded-2xl border border-rule bg-surface transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.hero}
                    alt={v.name}
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${v.flipImage ? "-scale-x-100" : ""}`}
                    style={{ objectPosition: v.imagePosition ?? "center" }}
                  />
                  {v.trackEligible && (
                    <span className="absolute left-3 top-3 rounded-full bg-red px-3 py-1 text-xs font-medium text-cream">
                      Track-ready
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs text-mute">{v.brand} · {v.year}</p>
                  <p className="mt-1 font-display text-xl text-ink">{v.name}</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <p>
                      <span className="font-display text-2xl text-ink tabular-nums">
                        {formatUSD(v.rentalDailyRate)}
                      </span>
                      <span className="text-sm text-mute">/day</span>
                    </p>
                    <span className="text-xs text-ink-soft">{v.market}</span>
                  </div>
                  <p className="mt-2 text-xs text-mute">
                    {v.specs.power} · {v.specs.zeroToSixty} 0-60 · {v.specs.transmission}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-3xl text-ink">What every RYDA rental includes</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Pillar title="Full insurance" body="$1M third-party liability. Agreed-value physical damage with a low deductible." />
            <Pillar title="White-glove handover" body="Vehicle delivered washed, fueled, and prepped. Photo-documented condition both ways." />
            <Pillar title="24/7 roadside" body="Single number, single call. Replacement vehicle if anything goes wrong on the road." />
            <Pillar title="200 miles / day" body="Generous baseline included. Extra miles available; track day mode unlocks unlimited." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-rule bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Beyond the rental
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Renting is your test drive. Ownership is the relationship.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Every RYDA vehicle is also available as a co-ownership share.
            Effective ~$208/day on a co-owned Ferrari versus ~$2,500/day to
            rent it. Transfer your share to another verified member after the
            12-month minimum hold. That's where we want you to land.
          </p>
          <Link
            href="/markets"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            See the fleet →
          </Link>
        </div>
      </section>
    </>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
