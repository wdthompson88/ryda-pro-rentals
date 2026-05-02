import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BOATS, formatUSD } from "@/lib/boat-data";

export const metadata: Metadata = {
  title: "RYDA Boats Charter — Yachts by the day in Miami",
  description:
    "Crewed yacht charter in Miami. Same four hulls as the co-ownership portfolio, available by the day. White-glove handover, RYDA-vetted captain, full insurance.",
};

export default function BoatsRentPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Charter · Try before you commit
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Crewed yacht charter, by the day.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            The same four hulls as the co-ownership portfolio, available
            by the day. Hand-prepared, fully insured, RYDA-vetted
            captain. Charter a weekend, claim a share if it fits.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="#available"
              className="inline-flex h-12 items-center justify-center rounded-full bg-marine px-7 text-sm font-medium text-cream transition-colors hover:bg-marine-deep"
            >
              See {BOATS.length} available boats →
            </Link>
          </div>
        </div>
      </section>

      {/* Counter / summary strip — parallel to /rent's RentalListings
          counter. Boats charter fleet is small (4 hulls) so we don't
          need a full filter UI; the counter + visible cards is right-
          sized for the data. */}
      <section id="available" className="border-b border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-4 px-6 py-5 sm:px-10">
          <p className="text-sm text-ink-soft">
            <span className="font-display text-xl text-ink tabular-nums">
              {BOATS.filter((b) => b.rentalAvailable).length}
            </span>
            <span className="ml-2">
              {BOATS.filter((b) => b.rentalAvailable).length === 1
                ? "hull"
                : "hulls"}{" "}
              available
            </span>
            <span className="ml-2 text-mute">
              · Up to{" "}
              {BOATS.filter((b) => b.rentalAvailable).reduce(
                (n, b) => n + b.capacity,
                0,
              )}{" "}
              total guest capacity
            </span>
          </p>
          <p className="text-sm text-ink-soft">
            Daily rates from{" "}
            <span className="ml-1 font-display text-xl text-ink tabular-nums">
              {formatUSD(
                Math.min(
                  ...BOATS.filter((b) => b.rentalAvailable).map(
                    (b) => b.rentalDailyRate,
                  ),
                ),
              )}
            </span>
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BOATS.filter((b) => b.rentalAvailable).map((b) => (
              <Link
                key={b.slug}
                href={`/boats/rent/${b.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream-2">
                  <Image
                    src={b.hero}
                    alt={`${b.year} ${b.name}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
                      b.flipImage ? "-scale-x-100" : ""
                    }`}
                    style={{ objectPosition: b.imagePosition ?? "center" }}
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur">
                    {b.brand}
                  </span>
                  {b.captainIncluded && (
                    <span className="absolute right-3 top-3 rounded-full bg-marine/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cream backdrop-blur">
                      Crewed
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mute">
                    {b.brand} · {b.lengthFt}&apos; · {b.year}
                  </p>
                  <h3 className="mt-1 font-display text-xl text-ink leading-tight">
                    {b.name}
                  </h3>
                  <p className="mt-1 text-xs text-mute">{b.category}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-ink-soft">
                    <span>{b.market}</span>
                    <span className="text-mute">· Up to {b.capacity} guests</span>
                  </div>
                  <div className="mt-5 border-t border-rule pt-4">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                          Daily rate
                        </p>
                        <p className="font-display text-2xl text-ink tabular-nums">
                          {formatUSD(b.rentalDailyRate)}
                          <span className="ml-1 text-sm text-mute">/day</span>
                        </p>
                      </div>
                      {b.sharesAvailable > 0 && (
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
                            Or own a share
                          </p>
                          <p className="text-sm text-marine tabular-nums">
                            {b.sharesAvailable} of {b.shares} left
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-xs text-ink-soft">Captain + mate included</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-marine transition-colors group-hover:text-marine-deep">
                      View details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="border-y border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-3xl text-ink">
            What every RYDA charter includes
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Pillar
              title="RYDA-vetted captain"
              body="Captain + mate on every charter. Sport yachts also include a chef. All RYDA-trained, USCG licensed."
            />
            <Pillar
              title="Full insurance"
              body="$1M third-party liability and agreed-value hull damage. Bundled into the daily rate; no add-on insurance bait-and-switch."
            />
            <Pillar
              title="Fuel allowance"
              body="Generous fuel budget for typical bay-day use. Long-range runs (Bimini, Bahamas) billed at cost."
            />
            <Pillar
              title="Provisioning on request"
              body="Our team stocks the galley, ice, drinks, and chef on request. Coordinated by RYDA, billed at cost."
            />
          </div>
        </div>
      </section>

      {/* Co-own teaser */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Beyond the charter
          </p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Charter is your sea trial. Ownership is the relationship.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            On a Wajer 55 S, charter runs $14,500/day. A share runs
            $195K + $32K/yr — about $1,067/day in steady-state ops on a
            30-day allowance. That&apos;s where we want you to land.
          </p>
          <Link
            href="/boats/portfolio"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-marine hover:text-cream"
          >
            See the co-ownership portfolio →
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
