// Reusable "ownership primitives" block, the six numbers a member
// needs to internalise before they wire money. Pacaso uses crisp
// fractional primitives (1/8 share, 8 owners, etc) as a hero-adjacent
// trust block; we do the same with vertical-specific numbers.
//
// Drops into:
//   - / (home, hero-adjacent)
//   - /portfolio, /portfolio/[symbol] (cars)
//   - /boats/portfolio, /boats/portfolio/[slug] (boats, pass vertical='boats')
//   - /how-it-works, /boats/how-it-works (foundational reference)

import {
  DAYS_PER_SHARE,
  MILES_PER_DAY_PER_SHARE,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
} from "@/lib/market-data";
import {
  BOATS_DAYS_PER_SHARE,
  NM_PER_DAY_PER_SHARE,
  BOATS_HOLDING_YEARS,
  BOATS_TARGET_DEPRECIATION_PCT,
} from "@/lib/boat-data";

type Variant = "default" | "dark" | "compact";
type Vertical = "cars" | "boats";

export function OwnershipPrimitives({
  variant = "default",
  title,
  vertical = "cars",
}: {
  variant?: Variant;
  title?: string;
  vertical?: Vertical;
}) {
  const isDark = variant === "dark";
  const wrapperBg = isDark
    ? "bg-ink"
    : variant === "compact"
      ? "bg-cream-2/40"
      : "bg-surface";
  const wrapperBorder = isDark ? "border-cream/10" : "border-rule";
  // Cars use red, boats use marine, same accent system as the rest
  // of the vertical's pages.
  const accentClass = vertical === "boats" ? "text-marine" : "text-red";
  const eyebrowTone = isDark ? accentClass : accentClass;
  const headlineTone = isDark ? "text-cream" : "text-ink";
  const labelTone = isDark ? "text-cream/60" : "text-mute";
  const valueTone = isDark ? "text-cream" : "text-ink";
  const subTone = isDark ? "text-cream/70" : "text-ink-soft";

  const items =
    vertical === "boats"
      ? [
          {
            label: "Co-owners",
            value: "1–5",
            sub: "per hull. 10 shares total, 2-share minimum per person.",
          },
          {
            label: "Allotted annual days per share",
            value: String(BOATS_DAYS_PER_SHARE),
            sub: `Multi-share = ${BOATS_DAYS_PER_SHARE * 2}, ${BOATS_DAYS_PER_SHARE * 3}…`,
          },
          {
            label: "Nm / share / yr",
            value: (BOATS_DAYS_PER_SHARE * NM_PER_DAY_PER_SHARE).toLocaleString(),
            sub: `${NM_PER_DAY_PER_SHARE} nm/day allowance`,
          },
          {
            label: "Planned exit",
            value: `${BOATS_HOLDING_YEARS * 12} mo`,
            sub: `LLC sells the hull at month ${BOATS_HOLDING_YEARS * 12}.`,
          },
          {
            label: "Modeled depreciation",
            value: `${BOATS_TARGET_DEPRECIATION_PCT}%`,
            sub: `Across the ${BOATS_HOLDING_YEARS}-yr hold (surveyed hulls).`,
          },
        ]
      : [
          {
            label: "Co-owners",
            value: "1–5",
            sub: "per car. 10 shares total, 2-share minimum per person.",
          },
          {
            label: "Allotted annual days per share",
            value: String(DAYS_PER_SHARE),
            sub: `Multi-share = ${DAYS_PER_SHARE * 2}, ${DAYS_PER_SHARE * 3}…`,
          },
          {
            label: "Miles / share / yr",
            value: (DAYS_PER_SHARE * MILES_PER_DAY_PER_SHARE).toLocaleString(),
            sub: `${MILES_PER_DAY_PER_SHARE} mi/day allowance`,
          },
          {
            label: "Planned exit",
            value: `${HOLDING_YEARS * 12} mo`,
            sub: `LLC sells the car at month ${HOLDING_YEARS * 12}.`,
          },
          {
            label: "Modeled depreciation",
            value: `${TARGET_DEPRECIATION_PCT}%`,
            sub: `Across the ${HOLDING_YEARS}-yr hold (curated certified pre owned).`,
          },
        ];

  if (variant === "compact") {
    return (
      <div className={`rounded-2xl border ${wrapperBorder} ${wrapperBg} p-5`}>
        <p className={`text-[10px] font-medium uppercase tracking-[0.18em] ${eyebrowTone}`}>
          {title ?? "Every share, in five numbers"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((it) => (
            <div key={it.label}>
              <p className={`text-[10px] uppercase tracking-[0.14em] ${labelTone}`}>
                {it.label}
              </p>
              <p className={`mt-1 font-display text-xl tabular-nums ${valueTone}`}>
                {it.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      className={`border ${wrapperBorder} ${wrapperBg} ${
        isDark ? "py-16 sm:py-20" : "py-14 sm:py-18"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <p className={`text-xs font-medium uppercase tracking-[0.2em] ${eyebrowTone}`}>
              The numbers, exactly
            </p>
            <h2 className={`mt-3 font-display text-3xl sm:text-4xl ${headlineTone}`}>
              {title ?? "What every share is, in five numbers."}
            </h2>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((it) => (
            <div
              key={it.label}
              className={`rounded-2xl border p-5 ${
                isDark
                  ? "border-cream/10 bg-cream/5"
                  : "border-rule bg-cream-2/40"
              }`}
            >
              <p className={`text-[10px] uppercase tracking-[0.16em] ${labelTone}`}>
                {it.label}
              </p>
              <p className={`mt-2 font-display text-3xl tabular-nums ${valueTone}`}>
                {it.value}
              </p>
              <p className={`mt-3 text-[11px] leading-snug ${subTone}`}>
                {it.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
