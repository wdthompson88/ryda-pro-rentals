// Boat-side share value chart — parallel of ShareValueChart, anchored
// on RYDA Boats' 3-year planned exit doctrine and 15% modeled
// depreciation. Mileage replaced with nautical miles; usage profile
// adapted for boat operations (240 days/yr available — boats are
// hauled out for off-season + hurricane prep — and lower charter
// occupancy than the car fleet).

import {
  BOATS_HOLDING_YEARS,
  BOATS_TARGET_DEPRECIATION_PCT,
  RENTAL_DEFAULTS_BOATS,
  formatUSD,
  type Boat,
} from "@/lib/boat-data";

const SHAREHOLDER_DAYS_PER_SHARE_USED = 12; // typical actual usage
const CHARTER_POOL_OCCUPANCY = RENTAL_DEFAULTS_BOATS.defaultOccupancyPct / 100;
const CHARTER_NM_PER_BOOKING_AVG = 50; // baseline nm/day on charters

type YearPoint = {
  label: string;
  nm: number;             // cumulative nautical miles
  vesselValue: number;    // total hull value
  shareValue: number;     // per-share value
  isExit?: boolean;
};

function computeAnnualNmAdded(b: Boat): number {
  // Conservative all-in annual usage: typical 12-day shareholder
  // usage × 10 shares + charter occupancy on the leftover days, each
  // at ~50 nm/day.
  const ownerNm = SHAREHOLDER_DAYS_PER_SHARE_USED * b.shares * 50;
  const poolDays =
    RENTAL_DEFAULTS_BOATS.daysAvailablePerYear -
    SHAREHOLDER_DAYS_PER_SHARE_USED * b.shares;
  const bookedDays = Math.round(Math.max(0, poolDays) * CHARTER_POOL_OCCUPANCY);
  const charterNm = bookedDays * CHARTER_NM_PER_BOOKING_AVG;
  return ownerNm + charterNm;
}

export function BoatShareValueChart({ boat: b }: { boat: Boat }) {
  // Rough proxy: 8 nm per engine hour at cruise. Defensive coalesce
  // in case currentEngineHours is missing on a partial dataset.
  const startingNm = (b.currentEngineHours ?? 0) * 8;
  const annualNm = computeAnnualNmAdded(b);

  // Linear depreciation from 100% at year 0 → (100 − BOATS_TARGET_DEPRECIATION_PCT)% at year HOLDING_YEARS
  const annualDepreciationPct =
    BOATS_TARGET_DEPRECIATION_PCT / BOATS_HOLDING_YEARS;

  const points: YearPoint[] = [];
  for (let y = 0; y <= BOATS_HOLDING_YEARS; y++) {
    const remainingPct = (100 - annualDepreciationPct * y) / 100;
    const vesselValue = Math.round(b.fullPrice * remainingPct);
    const shareValue = Math.round(b.pricePerShare * remainingPct);
    const nm = startingNm + annualNm * y;
    const labelMap: Record<number, string> = {
      0: "New to fleet",
      1: "Year 1",
      2: "Year 2",
    };
    const label =
      y === BOATS_HOLDING_YEARS ? `Year ${y} · LLC sells` : labelMap[y] ?? `Year ${y}`;
    points.push({
      label,
      nm,
      vesselValue,
      shareValue,
      isExit: y === BOATS_HOLDING_YEARS,
    });
  }

  const maxValue = points[0].vesselValue;
  const maxNm = points[points.length - 1].nm;
  const exitPoint = points[points.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
      <div className="border-b border-rule bg-cream-2/60 px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
          Share value over the {BOATS_HOLDING_YEARS}-year hold
        </p>
        <p className="mt-1 font-display text-xl text-ink">
          What your share is worth, year by year
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-b border-rule px-6 py-3 text-[11px] text-mute">
        <LegendDot color="bg-mute" label="Cumulative nm" />
        <LegendDot color="bg-marine" label="Vessel value" />
        <LegendDot color="bg-ink" label="Per-share value" />
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em]">
          {BOATS_TARGET_DEPRECIATION_PCT}% modeled depreciation over{" "}
          {BOATS_HOLDING_YEARS} yrs
        </span>
      </div>

      {/* Chart rows */}
      <div className="space-y-6 px-6 py-6">
        {points.map((p) => (
          <YearBlock
            key={p.label}
            point={p}
            maxValue={maxValue}
            maxNm={maxNm}
            startingNm={startingNm}
          />
        ))}
      </div>

      {/* Exit callout */}
      <div className="border-t border-rule bg-marine/5 px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-marine">
              Net share value at exit
            </p>
            <p className="mt-1 font-display text-2xl text-ink">
              {formatUSD(exitPoint.shareValue)}
              <span className="ml-2 text-sm text-mute">
                instead of {formatUSD(b.pricePerShare)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">
              Year {BOATS_HOLDING_YEARS} · resale point
            </p>
            <p className="mt-1 text-sm text-ink-soft tabular-nums">
              ~{exitPoint.nm.toLocaleString()} nm on the hull
            </p>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="border-t border-rule bg-cream-2/40 px-6 py-3">
        <p className="text-[11px] leading-relaxed text-mute">
          Illustrative only. Actual sale price varies by model, condition,
          and market — classic builds (Riva, certain Pershings) can
          appreciate. Linear depreciation modeled at{" "}
          {(BOATS_TARGET_DEPRECIATION_PCT / BOATS_HOLDING_YEARS).toFixed(1)}%
          per year for chart simplicity. Co-ownership shares are member-
          managed LLC interests, not securities.
        </p>
      </div>
    </div>
  );
}

function YearBlock({
  point,
  maxValue,
  maxNm,
  startingNm,
}: {
  point: YearPoint;
  maxValue: number;
  maxNm: number;
  startingNm: number;
}) {
  const nmAdded = point.nm - startingNm;
  const valuePct = (point.vesselValue / maxValue) * 100;
  const sharePct = (point.shareValue / (maxValue / 10)) * 100;
  const nmPct = maxNm > 0 ? (point.nm / maxNm) * 100 : 0;

  return (
    <div
      className={`relative ${
        point.isExit ? "rounded-xl border border-marine/20 bg-marine/[0.04] p-4" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p
          className={`text-xs font-medium uppercase tracking-[0.18em] ${
            point.isExit ? "text-marine" : "text-mute"
          }`}
        >
          {point.label}
        </p>
        <p className="text-[11px] text-mute tabular-nums">
          +{nmAdded.toLocaleString()} nm
        </p>
      </div>

      <div className="mt-3 space-y-2.5">
        <BarRow
          colorClass="bg-mute/70"
          widthPct={nmPct}
          label={`${point.nm.toLocaleString()} nm`}
          subLabel="cumulative"
        />
        <BarRow
          colorClass="bg-marine"
          widthPct={valuePct}
          label={formatUSD(point.vesselValue)}
          subLabel="vessel value"
          emphasized
        />
        <BarRow
          colorClass="bg-ink"
          widthPct={sharePct}
          label={formatUSD(point.shareValue)}
          subLabel="per share"
        />
      </div>
    </div>
  );
}

function BarRow({
  colorClass,
  widthPct,
  label,
  subLabel,
  emphasized,
}: {
  colorClass: string;
  widthPct: number;
  label: string;
  subLabel: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <div className="h-5 w-full rounded-sm bg-cream-2/60" aria-hidden />
        <div
          className={`absolute inset-y-0 left-0 rounded-sm ${colorClass}`}
          style={{ width: `${Math.max(2, Math.min(100, widthPct))}%` }}
          aria-hidden
        />
      </div>
      <div className="w-44 shrink-0 text-right">
        <p
          className={`tabular-nums ${
            emphasized
              ? "font-display text-sm text-ink"
              : "text-xs text-ink-soft"
          }`}
        >
          {label}
        </p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-mute">
          {subLabel}
        </p>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span>{label}</span>
    </span>
  );
}
