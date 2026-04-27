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
            Rent
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Drive a Ferrari this weekend.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Every RYDA rental is hand-prepared, fully insured, and white-glove
            delivered. Pick a car, pick a date — we handle the rest.
          </p>

          {/* Quick search */}
          <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-rule bg-surface p-4 shadow-sm sm:flex-row sm:items-end">
            <Field label="Where" value="Miami" />
            <Field label="From" value="Apr 28, 2026" />
            <Field label="Until" value="May 1, 2026" />
            <button className="h-12 rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Filter chips */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:px-10">
          <div className="flex flex-wrap gap-2">
            {[
              "All",
              "Ferrari",
              "Lamborghini",
              "McLaren",
              "Rolls-Royce",
              "Convertibles",
              "SUVs",
              "Hypercars",
              "Track-ready",
              "Delivered",
            ].map((c, i) => (
              <button
                key={c}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  i === 0
                    ? "bg-ink text-cream"
                    : "bg-surface text-ink-soft hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Vehicle grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-3xl text-ink">Available now</h2>
            <p className="text-sm text-mute">{rentable.length} vehicles · Miami</p>
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
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Why drive once
          </p>
          <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
            Rent it now. Own a piece of it later.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-soft">
            Most RYDA rentals are also available as co-ownership shares. Drive
            it, fall in love, then own a piece for ~10% of full price.
          </p>
          <Link
            href="/markets"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red"
          >
            See available shares →
          </Link>
        </div>
      </section>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col rounded-xl border border-rule px-4 py-3 sm:border-0 sm:border-r sm:last-of-type:border-r-0">
      <span className="text-xs uppercase tracking-wider text-mute">{label}</span>
      <span className="mt-1 font-medium text-ink">{value}</span>
    </div>
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
