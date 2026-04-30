// Reusable "ownership primitives" block — the five numbers a member
// needs to internalise before they wire money. Pacaso uses crisp
// fractional primitives (1/8 share, 8 owners, etc) as a hero-adjacent
// trust block; we do the same with car-side numbers.
//
// Drops into:
//   - / (home, hero-adjacent)
//   - /markets (under the cinematic hero)
//   - /markets/[symbol] (under the OrderPanel section)
//   - /how-it-works (foundational reference)

import {
  DAYS_PER_SHARE,
  MILES_PER_DAY_PER_SHARE,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
} from "@/lib/market-data";

type Variant = "default" | "dark" | "compact";

export function OwnershipPrimitives({
  variant = "default",
  title,
}: {
  variant?: Variant;
  title?: string;
}) {
  const isDark = variant === "dark";
  const wrapperBg = isDark
    ? "bg-ink"
    : variant === "compact"
      ? "bg-cream-2/40"
      : "bg-surface";
  const wrapperBorder = isDark ? "border-cream/10" : "border-rule";
  const eyebrowTone = isDark ? "text-red" : "text-red";
  const headlineTone = isDark ? "text-cream" : "text-ink";
  const labelTone = isDark ? "text-cream/60" : "text-mute";
  const valueTone = isDark ? "text-cream" : "text-ink";
  const subTone = isDark ? "text-cream/70" : "text-ink-soft";

  const items = [
    {
      label: "Co-owners",
      value: "10",
      sub: "per car (max). Each share = 1/10.",
    },
    {
      label: "Days / share / yr",
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
      value: `${HOLDING_YEARS} yrs`,
      sub: `LLC sells the car at year ${HOLDING_YEARS}.`,
    },
    {
      label: "Modeled depreciation",
      value: `${TARGET_DEPRECIATION_PCT}%`,
      sub: `Across the ${HOLDING_YEARS}-yr hold (curated CPO).`,
    },
    {
      label: "Transfer min hold",
      value: "12 mo",
      sub: "Then transfer to any verified RYDA member.",
    },
  ];

  if (variant === "compact") {
    return (
      <div className={`rounded-2xl border ${wrapperBorder} ${wrapperBg} p-5`}>
        <p className={`text-[10px] font-medium uppercase tracking-[0.18em] ${eyebrowTone}`}>
          {title ?? "The ownership primitives"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
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
              {title ?? "What every share is, in six numbers."}
            </h2>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
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
