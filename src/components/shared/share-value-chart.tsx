// Year-by-year share value depreciation visualization, asset value,
// share value, and cumulative usage per year, anchored on RYDA's
// planned exit doctrine.
//
// Three rows per year (each rendered as a horizontal bar):
//   1. Cumulative usage (mute / gray)
//   2. Asset value (vertical brand accent)
//   3. Per-share value (ink, secondary)
//
// Year 0 = "new to fleet" baseline. The planned LLC sale point is
// highlighted with the vertical accent.
//
// Consolidated across cars and boats so depreciation display, bar
// sizing, tabular alignment, and exit callout behavior stay identical
// while each vertical supplies its own usage model, labels, constants,
// and brand accent.

import {
  TARGET_DEPRECIATION_PCT,
  HOLDING_YEARS,
  formatUSD,
  type Vehicle,
} from "@/lib/market-data";
import {
  BOATS_HOLDING_YEARS,
  BOATS_TARGET_DEPRECIATION_PCT,
  RENTAL_DEFAULTS_BOATS,
  type Boat,
} from "@/lib/boat-data";

const SHAREHOLDER_DAYS_PER_SHARE_USED = 12;
const RENTAL_POOL_OCCUPANCY = 0.5;
const RENTAL_DAYS_PER_BOOKING_AVG = 100;
const CHARTER_POOL_OCCUPANCY = RENTAL_DEFAULTS_BOATS.defaultOccupancyPct / 100;
const CHARTER_NM_PER_BOOKING_AVG = 50;

type ChartAsset = {
  fullPrice: number;
  pricePerShare: number;
  shares: number;
};

type YearPoint = {
  label: string;
  usage: number;
  assetValue: number;
  shareValue: number;
  isExit?: boolean;
};

type ShareValueVocabulary = {
  cumulativeLegend: string;
  assetValueLegend: string;
  usageUnit: string;
  assetNoun: string;
  assetValueSubLabel: string;
  footnote: string;
};

type AccentClasses = {
  text: "text-red" | "text-marine";
  bgSoft: "bg-red/5" | "bg-marine/5";
  exitBg: "bg-red/[0.03]" | "bg-marine/[0.04]";
  exitBorder: "border-red/20" | "border-marine/20";
  bar: "bg-red" | "bg-marine";
};

export type ShareValueChartConfig = {
  asset: ChartAsset;
  holdingYears: number;
  depreciationPct: number;
  startingUsage: number;
  annualUsage: number;
  accent: AccentClasses;
  vocabulary: ShareValueVocabulary;
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

export function buildShareValueChartConfig(
  asset: Vehicle | Boat,
  vertical: "cars" | "boats",
): ShareValueChartConfig {
  if (vertical === "boats") {
    const boat = asset as Boat;

    return {
      asset: boat,
      holdingYears: BOATS_HOLDING_YEARS,
      depreciationPct: BOATS_TARGET_DEPRECIATION_PCT,
      startingUsage: (boat.currentEngineHours ?? 0) * 8,
      annualUsage: computeAnnualNmAdded(boat),
      accent: {
        text: "text-marine",
        bgSoft: "bg-marine/5",
        exitBg: "bg-marine/[0.04]",
        exitBorder: "border-marine/20",
        bar: "bg-marine",
      },
      vocabulary: {
        cumulativeLegend: "Cumulative nm",
        assetValueLegend: "Vessel value",
        usageUnit: "nm",
        assetNoun: "hull",
        assetValueSubLabel: "vessel value",
        footnote: `Illustrative only. Actual sale price varies by model, condition, and market, classic builds (Riva, certain Pershings) can appreciate. Linear depreciation modeled at ${(BOATS_TARGET_DEPRECIATION_PCT / BOATS_HOLDING_YEARS).toFixed(1)}% per year for chart simplicity. Co-ownership shares are member-managed LLC interests, not securities.`,
      },
    };
  }

  const vehicle = asset as Vehicle;

  return {
    asset: vehicle,
    holdingYears: HOLDING_YEARS,
    depreciationPct: TARGET_DEPRECIATION_PCT,
    startingUsage: vehicle.currentMiles ?? 0,
    annualUsage: computeAnnualMilesAdded(vehicle),
    accent: {
      text: "text-red",
      bgSoft: "bg-red/5",
      exitBg: "bg-red/[0.03]",
      exitBorder: "border-red/20",
      bar: "bg-red",
    },
    vocabulary: {
      cumulativeLegend: "Cumulative miles",
      assetValueLegend: "Vehicle value",
      usageUnit: "mi",
      assetNoun: "car",
      assetValueSubLabel: "vehicle value",
      footnote: `Illustrative only. Actual sale price varies by model, condition, and market. Linear depreciation modeled at ${(TARGET_DEPRECIATION_PCT / HOLDING_YEARS).toFixed(1)}% per year for chart simplicity; real depreciation curves are usually front-loaded in year 1. Co-ownership shares are member-managed LLC interests, not securities.`,
    },
  };
}

export default function ShareValueChart({
  config,
}: {
  config: ShareValueChartConfig;
}) {
  const { asset, vocabulary } = config;

  // Linear depreciation from 100% at year 0 → (100 − depreciationPct)% at year holdingYears.
  const annualDepreciationPct =
    config.depreciationPct / config.holdingYears;

  const points: YearPoint[] = [];
  for (let y = 0; y <= config.holdingYears; y++) {
    const remainingPct = (100 - annualDepreciationPct * y) / 100;
    const assetValue = Math.round(asset.fullPrice * remainingPct);
    const shareValue = Math.round(asset.pricePerShare * remainingPct);
    const usage = config.startingUsage + config.annualUsage * y;
    const labelMap: Record<number, string> = {
      0: "New to fleet",
      1: "Year 1",
      2: "Year 2",
    };
    const label =
      y === config.holdingYears ? `Year ${y} · LLC sells` : labelMap[y] ?? `Year ${y}`;
    points.push({
      label,
      usage,
      assetValue,
      shareValue,
      isExit: y === config.holdingYears,
    });
  }

  // Bar scales: longest bar = 100% width within the chart area.
  const maxValue = points[0].assetValue;
  const maxUsage = points[points.length - 1].usage;
  const exitPoint = points[points.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
      <div className="border-b border-rule bg-cream-2/60 px-6 py-4">
        <p
          className={`text-xs font-medium uppercase tracking-[0.2em] ${config.accent.text}`}
        >
          Share value over the {config.holdingYears}-year hold
        </p>
        <p className="mt-1 font-display text-xl text-ink">
          What your share is worth, year by year
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-b border-rule px-6 py-3 text-[11px] text-mute">
        <LegendDot color="bg-mute" label={vocabulary.cumulativeLegend} />
        <LegendDot color={config.accent.bar} label={vocabulary.assetValueLegend} />
        <LegendDot color="bg-ink" label="Per-share value" />
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em]">
          {config.depreciationPct}% modeled depreciation over{" "}
          {config.holdingYears} yrs
        </span>
      </div>

      {/* Chart rows */}
      <div className="space-y-6 px-6 py-6">
        {points.map((p) => (
          <YearBlock
            key={p.label}
            point={p}
            maxValue={maxValue}
            maxUsage={maxUsage}
            startingUsage={config.startingUsage}
            unit={vocabulary.usageUnit}
            valueColorClass={config.accent.bar}
            valueSubLabel={vocabulary.assetValueSubLabel}
            accent={config.accent}
          />
        ))}
      </div>

      {/* Exit callout */}
      <div className={`border-t border-rule ${config.accent.bgSoft} px-6 py-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p
              className={`text-[11px] uppercase tracking-[0.18em] ${config.accent.text}`}
            >
              Net share value at exit
            </p>
            <p className="mt-1 font-display text-2xl text-ink">
              {formatUSD(exitPoint.shareValue)}
              <span className="ml-2 text-sm text-mute">
                instead of {formatUSD(asset.pricePerShare)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">
              Year {config.holdingYears} · resale point
            </p>
            <p className="mt-1 text-sm text-ink-soft tabular-nums">
              ~{exitPoint.usage.toLocaleString()} {vocabulary.usageUnit} on the {vocabulary.assetNoun}
            </p>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="border-t border-rule bg-cream-2/40 px-6 py-3">
        <p className="text-[11px] leading-relaxed text-mute">
          {vocabulary.footnote}
        </p>
      </div>
    </div>
  );
}

function YearBlock({
  point,
  maxValue,
  maxUsage,
  startingUsage,
  unit,
  valueColorClass,
  valueSubLabel,
  accent,
}: {
  point: YearPoint;
  maxValue: number;
  maxUsage: number;
  startingUsage: number;
  unit: string;
  valueColorClass: string;
  valueSubLabel: string;
  accent: AccentClasses;
}) {
  const usageAdded = point.usage - startingUsage;
  const valuePct = (point.assetValue / maxValue) * 100;
  const sharePct = (point.shareValue / (maxValue / 10)) * 100;
  // Usage bar, scaled to the exit-year max so it grows visibly each year.
  const usagePct = maxUsage > 0 ? (point.usage / maxUsage) * 100 : 0;

  return (
    <div
      className={`relative ${
        point.isExit ? `rounded-xl border ${accent.exitBorder} ${accent.exitBg} p-4` : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p
          className={`text-xs font-medium uppercase tracking-[0.18em] ${
            point.isExit ? accent.text : "text-mute"
          }`}
        >
          {point.label}
        </p>
        <p className="text-[11px] text-mute tabular-nums">
          +{usageAdded.toLocaleString()} {unit}
        </p>
      </div>

      <div className="mt-3 space-y-2.5">
        <BarRow
          colorClass="bg-mute/70"
          widthPct={usagePct}
          label={`${point.usage.toLocaleString()} ${unit}`}
          subLabel="cumulative"
        />
        <BarRow
          colorClass={valueColorClass}
          widthPct={valuePct}
          label={formatUSD(point.assetValue)}
          subLabel={valueSubLabel}
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
