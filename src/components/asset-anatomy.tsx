// Rally-anatomy detail-page sections: provenance timeline, originality
// /condition checklist, and editorial press pull-quote. All three render
// conditionally based on whether the vehicle has the field populated,
// so we can ship one car at a time without retrofitting the entire
// fleet at once.
//
// Design notes:
// - Section headings use the "#VEHICLE-ID HEADING" treatment from the
//   Rally analysis ("#65FM1 GALLERY" → "#F296 PROVENANCE"), small caps
//   in the brand-red eyebrow style. This is editorial polish, not a
//   trading signal — we're using the vehicle code as a brand mark for
//   the unit, same as a hotel suite number.
// - Provenance timeline: vertical on mobile, horizontal scroll-cards
//   on lg+. Mirrors Rally's date-stamped milestone list.
// - Condition checklist: 2-up grid of label/value/passed-badge rows.
//   Green ring on passed, neutral ring otherwise. Keeps it scannable.
// - Press quote: single editorial pull-quote with attribution. Optional;
//   not every vehicle will have a worthy press citation.
//
// Importantly: NONE of this implies a tradable security. Provenance is
// physical history; originality is condition; the press quote is about
// the model. SEC-safe.

import type {
  ConditionItem,
  ProvenanceEvent,
  Vehicle,
} from "@/lib/market-data";

// Hashtag-style heading (`#F296 PROVENANCE`). Small caps, red, mono-ish
// vibe via tracking. Keeps the editorial brand consistent across the
// detail page sections.
function VehicleHashtagHeading({
  code,
  label,
}: {
  code: string;
  label: string;
}) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.22em] text-red">
      <span className="opacity-70">#</span>
      {code} · {label}
    </p>
  );
}

export function ProvenanceTimeline({
  events,
  code,
}: {
  events: ProvenanceEvent[];
  code: string;
}) {
  if (!events || events.length === 0) return null;
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
        <VehicleHashtagHeading code={code} label="Provenance" />
        <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
          Where this car has been.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">
          A dated timeline of build, custody, and operational milestones
          for this vehicle. Documents available to seated members
          through the document vault.
        </p>

        {/* Timeline. Vertical with a left rule on mobile, balanced
            grid on lg+. The leftmost rule + dot pattern reads as a
            history line at a glance. */}
        <ol className="mt-10 grid grid-cols-1 gap-y-6 lg:grid-cols-4 lg:gap-x-6">
          {events.map((e, i) => (
            <li
              key={i}
              className="relative pl-6 lg:pl-0 lg:pt-6 lg:border-t lg:border-rule"
            >
              {/* Mobile: vertical rule + dot. lg: top rule + dot. */}
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-px bg-rule lg:left-0 lg:top-0 lg:h-px lg:w-full lg:bg-transparent"
              />
              <span
                aria-hidden
                className="absolute left-[-3px] top-1.5 h-1.5 w-1.5 rounded-full bg-red lg:left-0 lg:top-[-3px]"
              />
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-red">
                {e.date}
              </p>
              <p className="mt-2 font-display text-lg text-ink leading-snug">
                {e.title}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                {e.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ConditionGrid({
  items,
  code,
}: {
  items: ConditionItem[];
  code: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <section className="border-b border-rule bg-cream-2">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
        <VehicleHashtagHeading code={code} label="Originality &amp; condition" />
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            What we verified before purchase.
          </h2>
          <p className="text-xs text-mute">
            Pre-purchase inspection report available on request.
          </p>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">
          Every RYDA car passes a multi-point pre-purchase inspection
          and is documented head-to-toe before a single share is sold.
          What we record below carries through resale.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-start justify-between gap-4 rounded-xl border border-rule bg-surface p-4"
            >
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                  {item.label}
                </p>
                <p className="mt-1 text-sm text-ink">{item.value}</p>
              </div>
              {item.passed ? (
                <CheckBadge />
              ) : (
                <NeutralBadge />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PressQuote({
  body,
  source,
  code,
}: {
  body: string;
  source: string;
  code: string;
}) {
  if (!body) return null;
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
        <VehicleHashtagHeading code={code} label="In the press" />
        <figure className="mt-6">
          <blockquote className="border-l-2 border-red pl-6 sm:pl-8">
            <p className="font-display text-2xl font-light italic leading-snug text-ink sm:text-3xl">
              &ldquo;{body}&rdquo;
            </p>
          </blockquote>
          <figcaption className="mt-5 pl-6 text-xs font-medium uppercase tracking-[0.2em] text-ink-soft sm:pl-8">
            — {source}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function CheckBadge() {
  return (
    <span
      aria-label="Verified"
      // text-success-deep matches the AA-contrast convention used in
      // bookings/cost-sheet pages — the lighter `text-success` fails
      // contrast against the cream background in light mode (~3.1:1
      // vs. needed 4.5:1). Audit T1.2.
      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success-deep"
    >
      <svg
        viewBox="0 0 16 16"
        width={14}
        height={14}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="3 8.5 6.5 12 13 4" />
      </svg>
    </span>
  );
}

function NeutralBadge() {
  return (
    <span
      aria-label="Noted"
      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rule/40 text-mute"
    >
      <svg
        viewBox="0 0 16 16"
        width={14}
        height={14}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <line x1="3.5" y1="8" x2="12.5" y2="8" />
      </svg>
    </span>
  );
}

// Convenience wrapper: drops in all three sections at once for the
// detail page. Caller passes the full Vehicle object; nothing renders
// for fields that aren't populated.
export function AssetAnatomySections({ vehicle }: { vehicle: Vehicle }) {
  return (
    <>
      {vehicle.provenance && vehicle.provenance.length > 0 && (
        <ProvenanceTimeline events={vehicle.provenance} code={vehicle.ticker} />
      )}
      {vehicle.pressQuote && (
        <PressQuote
          body={vehicle.pressQuote.body}
          source={vehicle.pressQuote.source}
          code={vehicle.ticker}
        />
      )}
      {vehicle.conditionCheck && vehicle.conditionCheck.length > 0 && (
        <ConditionGrid items={vehicle.conditionCheck} code={vehicle.ticker} />
      )}
    </>
  );
}
