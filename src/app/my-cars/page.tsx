import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { VEHICLES, formatUSD } from "@/lib/market-data";

export const metadata = { title: "My Cars" };

const HOLDINGS = [
  { symbol: "F458", shares: 1, isLeadOwner: true, status: "active" as const },
  { symbol: "P911", shares: 1, isLeadOwner: false, status: "active" as const },
];

export default function MyCarsPage() {
  return (
    <>
      <SiteHeader />
      <DemoBanner />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            My Cars
          </p>
          <h1 className="mt-4 font-display text-4xl font-light text-ink sm:text-5xl">
            Your vehicles.
          </h1>
          <p className="mt-2 text-sm text-mute">
            {HOLDINGS.length} vehicles · 1 as Proposal Coordinator
          </p>
        </div>
      </section>

      {/* Vehicle list */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {HOLDINGS.map((h) => {
              const v = VEHICLES.find((x) => x.symbol === h.symbol)!;
              return (
                <Link
                  key={h.symbol}
                  href={`/my-cars/${h.symbol}`}
                  className="group block overflow-hidden rounded-2xl border border-rule bg-surface transition-shadow hover:shadow-lg"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-cream-2">
                    <Image
                      src={v.hero}
                      alt={`${v.year} ${v.name}`}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${v.flipImage ? "-scale-x-100" : ""}`}
                      style={{ objectPosition: v.imagePosition ?? "center" }}
                    />
                    {h.isLeadOwner && (
                      <span className="absolute left-3 top-3 rounded-full bg-red px-3 py-1 text-xs font-medium text-cream">
                        ★ Proposal Coordinator
                      </span>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-cream">
                      {h.shares} of {v.shares} shares
                    </span>
                  </div>
                  <div className="p-6">
                    <p className="text-xs text-mute">{v.brand} · {v.market}</p>
                    <p className="mt-1 font-display text-2xl text-ink">{v.name}</p>

                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                      <Mini label="Days used" value={h.symbol === "F458" ? "8" : "6"} sub={`of ${v.daysPerYear}`} />
                      <Mini label="Miles used" value={h.symbol === "F458" ? "658" : "432"} sub={`of ${v.milesPerYear.toLocaleString()}`} />
                      <Mini label="Next booking" value={h.symbol === "F458" ? "May 12" : "Jun 5"} sub="3 days" />
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-rule pt-4">
                      <p className="text-sm text-ink-soft">
                        Currently:{" "}
                        <span className="font-medium text-ink">In storage</span>
                      </p>
                      <span className="text-sm font-medium text-red group-hover:text-red-deep">
                        Open →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Empty-state CTA / discover */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:px-10">
          <h2 className="font-display text-2xl text-ink">Add another vehicle.</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Browse the curated fleet. New vehicles come online every quarter.
          </p>
          <Link
            href="/portfolio"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
          >
            Browse the fleet →
          </Link>
        </div>
      </section>

      <section className="bg-ink py-12 text-center text-cream/75">
        <p className="text-xs">
          Sample owned-vehicle dashboard. Live operational data ships at
          Miami launch.
        </p>
      </section>
    </>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="font-display text-xl text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-mute">{label}</p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </div>
  );
}
