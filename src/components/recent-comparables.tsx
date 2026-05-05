// Public display block for hand-curated comparable sales on the
// asset detail page. Renders nothing if there are no comps for the
// vehicle — same graceful-degradation pattern as the other Rally-
// anatomy sections (provenance timeline, originality grid, press quote).
//
// Hashtag heading style ("#F296 · Recent comparable sales") matches
// the other anatomy sections so the detail page reads as one editorial
// surface, not a bunch of bolted-on widgets.

import type { VehicleComparable } from "@/lib/vehicle-enrichment";

const FALLBACK_DISCOVERY_HOSTS = [
  { label: "classic.com", base: "https://www.classic.com" },
  { label: "Bring a Trailer", base: "https://bringatrailer.com" },
  { label: "RM Sotheby's", base: "https://rmsothebys.com" },
];

export function RecentComparableSales({
  comparables,
  code,
  classicComUrl,
}: {
  comparables: VehicleComparable[];
  code: string;
  // Optional outbound link to this vehicle's classic.com market page,
  // e.g. https://www.classic.com/m/ferrari/296-gtb. When provided,
  // adds a "View live market data on classic.com →" footer link.
  classicComUrl?: string;
}) {
  if (!comparables || comparables.length === 0) return null;

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-red">
          <span className="opacity-70">#</span>
          {code} · Recent comparable sales
        </p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            What similar cars actually sold for.
          </h2>
          <p className="max-w-md text-xs text-mute">
            Hand-curated public auction results, not algorithmic estimates.
            Refreshed quarterly.
          </p>
        </div>

        {/* Comp rows. Each cites the auction house + date + lot # +
            price + an outbound link to the original listing — that's
            the credibility unlock vs. a black-box "estimated value." */}
        <ul className="mt-8 divide-y divide-rule rounded-2xl border border-rule bg-surface">
          {comparables.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 p-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-medium text-ink">{c.yearMakeModel}</p>
                  <p className="text-[11px] uppercase tracking-wider text-mute">
                    {formatSaleDate(c.saleDate)}
                  </p>
                </div>
                {c.trimNotes && (
                  <p className="mt-1 text-xs text-ink-soft">{c.trimNotes}</p>
                )}
                <p className="mt-2 text-xs text-mute">
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-ink"
                  >
                    {c.sourceName}
                    {c.lotNumber ? ` · ${c.lotNumber}` : ""}
                  </a>
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-display text-2xl tabular-nums text-ink">
                  ${(c.salePriceCents / 100).toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-mute">
                  Sold
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer attribution + outbound discovery link */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[11px] text-mute">
          <p>
            Sourced from{" "}
            {FALLBACK_DISCOVERY_HOSTS.map((h, i) => (
              <span key={h.label}>
                <a
                  href={h.base}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink"
                >
                  {h.label}
                </a>
                {i < FALLBACK_DISCOVERY_HOSTS.length - 1 ? ", " : ""}
              </span>
            ))}
            , and other public auction archives.
          </p>
          {classicComUrl && (
            <a
              href={classicComUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-red hover:underline"
            >
              View live market data on classic.com →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function formatSaleDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
