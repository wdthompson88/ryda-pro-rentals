// Year-by-year share value depreciation visualization, vehicle value,
// share value, and cumulative miles per year, anchored on RYDA's
// 2-year planned exit doctrine.
//
// Three rows per year (each rendered as a horizontal bar):
//   1. Cumulative miles (mute / gray)
//   2. Vehicle value (red, primary brand)
//   3. Per-share value (ink, secondary)
//
// Year 0 = "new to fleet" baseline. Year 1 = midpoint. Year 2 = planned
// LLC sale (resale point, highlighted with a red marker line).
//
// Math: linear interpolation of the doctrinal depreciation between
// Year 0 (full price) and Year 2 (full price × residual). Annual mileage
// add = shareholder usage × shares + rental pool usage. We use the
// vehicle's currentMiles as the starting odometer.

import {
  TARGET_DEPRECIATION_PCT,
  HOLDING_YEARS,
  formatUSD,
  type Vehicle,
} from "@/lib/market-data";

const SHAREHOLDER_DAYS_PER_SHARE_USED = 12; // typical actual usage (matches RENTAL_DEFAULTS)
const RENTAL_POOL_OCCUPANCY = 0.5;
const RENTAL_DAYS_PER_BOOKING_AVG = 100; // baseline mi/day on rentals

type YearPoint = {
  label: string;
  miles: number;            // cumulative miles
  vehicleValue: number;     // total car value
  shareValue: number;       // per-share value
  isExit?: boolean;
};

function computeAnnualMilesAdded(v: Vehicle): number {
  // Conservative all-in annual usage: assumes typical 12-day shareholder
  // usage × 10 shares + 50% pool occupancy on the leftover days, each at
  // ~100 mi/day (matching the shareholder allowance). Total available
  // days = 365 - ~45 service-reserve = 320 (matches RENTAL_DEFAULTS).
  const ownerMiles =
    SHAREHOLDER_DAYS_PER_SHARE_USED * v.shares * 100;
  const poolDays = 320 - SHAREHOLDER_DAYS_PER_SHARE_USED * v.shares;
  const bookedDays = Math.round(poolDays * RENTAL_POOL_OCCUPANCY);
  const rentalMiles = bookedDays * RENTAL_DAYS_PER_BOOKING_AVG;
  return ownerMiles + rentalMiles;
}

export function ShareValueChart({ vehicle: v }: { vehicle: Vehicle }) {
  const startingMiles = v.currentMiles ?? 0;
  const annualMiles = computeAnnualMilesAdded(v);

  // Linear depreciation from 100% at year 0 → (100 − TARGET_DEPRECIATION_PCT)% at year HOLDING_YEARS
  const annualDepreciationPct = TARGET_DEPRECIATION_PCT / HOLDING_YEARS;

  const points: YearPoint[] = [];
  for (let y = 0; y <= HOLDING_YEARS; y++) {
    const remainingPct = (100 - annualDepreciationPct * y) / 100;
    const vehicleValue = Math.round(v.fullPrice * remainingPct);
    const shareValue = Math.round(v.pricePerShare * remainingPct);
    const miles = startingMiles + annualMiles * y;
    const labelMap: Record<number, string> = {
      0: "New to fleet",
      1: "Year 1",
    };
    const label = y === HOLDING_YEARS ? `Year ${y} · LLC sells` : labelMap[y] ?? `Year ${y}`;
    points.push({
      label,
      miles,
      vehicleValue,
      shareValue,
      isExit: y === HOLDING_YEARS,
    });
  }

  // Bar scales: longest bar = 100% width within the chart area.
  const maxValue = points[0].vehicleValue; // year 0 is always max
  const maxMiles = points[points.length - 1].miles;

  const exitPoint = points[points.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
      <div className="border-b border-rule bg-cream-2/60 px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Share value over the {HOLDING_YEARS}-year hold
        </p>
        <p className="mt-1 font-display text-xl text-ink">
          What your share is worth, year by year
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-b border-rule px-6 py-3 text-[11px] text-mute">
        <LegendDot color="bg-mute" label="Cumulative miles" />
        <LegendDot color="bg-red" label="Vehicle value" />
        <LegendDot color="bg-ink" label="Per-share value" />
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em]">
          {TARGET_DEPRECIATION_PCT}% modeled depreciation over {HOLDING_YEARS}{" "}
          yrs
        </span>
      </div>

      {/* Chart rows */}
      <div className="space-y-6 px-6 py-6">
        {points.map((p) => (
          <YearBlock
            key={p.label}
            point={p}
            maxValue={maxValue}
            maxMiles={maxMiles}
            startingMiles={startingMiles}
          />
        ))}
      </div>

      {/* Exit callout */}
      <div className="border-t border-rule bg-red/5 px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-red">
              Net share value at exit
            </p>
            <p className="mt-1 font-display text-2xl text-ink">
              {formatUSD(exitPoint.shareValue)}
              <span className="ml-2 text-sm text-mute">
                instead of {formatUSD(v.pricePerShare)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">
              Year {HOLDING_YEARS} · resale point
            </p>
            <p className="mt-1 text-sm text-ink-soft tabular-nums">
              ~{exitPoint.miles.toLocaleString()} mi on the car
            </p>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="border-t border-rule bg-cream-2/40 px-6 py-3">
        <p className="text-[11px] leading-relaxed text-mute">
          Illustrative only. Actual sale price varies by model, condition,
          and market. Linear depreciation modeled at{" "}
          {(TARGET_DEPRECIATION_PCT / HOLDING_YEARS).toFixed(1)}% per year
          for chart simplicity; real depreciation curves are usually
          front-loaded in year 1. Co-ownership shares are member-managed
          LLC interests, not securities.
        </p>
      </div>
    </div>
  );
}

function YearBlock({
  point,
  maxValue,
  maxMiles,
  startingMiles,
}: {
  point: YearPoint;
  maxValue: number;
  maxMiles: number;
  startingMiles: number;
}) {
  const milesAdded = point.miles - startingMiles;
  const valuePct = (point.vehicleValue / maxValue) * 100;
  const sharePct = (point.shareValue / (maxValue / 10)) * 100; // share scales same denominator
  // Miles bar, scaled to the year-2 max so it grows visibly each year.
  const milesPct = maxMiles > 0 ? (point.miles / maxMiles) * 100 : 0;

  return (
    <div
      className={`relative ${
        point.isExit ? "rounded-xl border border-red/20 bg-red/[0.03] p-4" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p
          className={`text-xs font-medium uppercase tracking-[0.18em] ${
            point.isExit ? "text-red" : "text-mute"
          }`}
        >
          {point.label}
        </p>
        <p className="text-[11px] text-mute tabular-nums">
          +{milesAdded.toLocaleString()} mi
        </p>
      </div>

      <div className="mt-3 space-y-2.5">
        {/* Miles bar */}
        <BarRow
          colorClass="bg-mute/70"
          widthPct={milesPct}
          label={`${point.miles.toLocaleString()} mi`}
          subLabel="cumulative"
        />
        {/* Vehicle value bar */}
        <BarRow
          colorClass="bg-red"
          widthPct={valuePct}
          label={formatUSD(point.vehicleValue)}
          subLabel="vehicle value"
          emphasized
        />
        {/* Per-share value bar */}
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
