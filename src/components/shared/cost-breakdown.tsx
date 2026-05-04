// Concise per-listing cost breakdown.
// Same doctrine as the /compare page calculator, but compact enough to
// drop on every individual market detail page (and anywhere else we
// want to show "what you actually pay over the hold").
//
// Consolidated across cars and boats so the shared math presentation,
// success/loss tones, tabular alignment, and hover-neutral table shape
// stay identical while each vertical supplies its own economics,
// vocabulary, constants, and brand accent.

import {
  computeShareEconomics,
  computeRentalEconomics,
  formatUSD,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
  type RentalEconomics,
  type ShareEconomics,
  type Vehicle,
} from "@/lib/market-data";
import {
  computeBoatShareEconomics,
  computeBoatRentalEconomics,
  BOATS_HOLDING_YEARS,
  BOATS_TARGET_DEPRECIATION_PCT,
  type Boat,
  type BoatRentalEconomics,
  type BoatShareEconomics,
} from "@/lib/boat-data";
import type { ReactNode } from "react";

type AssetEconomics = ShareEconomics | BoatShareEconomics;
type PoolEconomics = RentalEconomics | BoatRentalEconomics;

type CostAsset = {
  pricePerShare: number;
};

type CostBreakdownVocabulary = {
  carryingLabel: string;
  carryingSub?: (e: AssetEconomics) => string;
  usageDaysLabel: string;
  poolName: string;
  poolEyebrow: string;
  poolCopy: (pool: PoolEconomics) => ReactNode;
  projectedIncomeLabel: string;
  depreciationNote: string;
  doctrine: string;
};

export type CostBreakdownConfig = {
  asset: CostAsset;
  accentTextClass: "text-red" | "text-marine";
  economics: (asset: CostAsset, opts: { shares: number }) => AssetEconomics;
  poolEconomics: (
    asset: CostAsset,
    opts: { holdYears: number },
  ) => PoolEconomics;
  showScenario: boolean;
  depreciationPct: number;
  holdingYears: number;
  vocabulary: CostBreakdownVocabulary;
};

export function buildCostBreakdownConfig(
  asset: Vehicle | Boat,
  vertical: "cars" | "boats",
): CostBreakdownConfig {
  if (vertical === "boats") {
    return {
      asset,
      accentTextClass: "text-marine",
      economics: (boat, opts) => computeBoatShareEconomics(boat as Boat, opts),
      poolEconomics: (boat, opts) =>
        computeBoatRentalEconomics(boat as Boat, opts),
      showScenario: true,
      depreciationPct: BOATS_TARGET_DEPRECIATION_PCT,
      holdingYears: BOATS_HOLDING_YEARS,
      vocabulary: {
        carryingLabel: "operating cost",
        carryingSub: (e) =>
          `${formatUSD(e.annualCarrying)}/yr × ${e.holdYears} (slip + crew + fuel + insurance + hurricane prep)`,
        usageDaysLabel: "cruising days",
        poolName: "charter",
        poolEyebrow: "Or, opt into the charter pool",
        poolCopy: (charter) => (
          <>
            Pool your unused days into the RYDA charter program. Boat
            charter occupancy runs lower than supercar rental fleets —
            Miami high-season boats average ~120 booked days a year. At a{" "}
            {charter.occupancyPct}% pool occupancy and a{" "}
            {charter.managementFeePct}% management fee, your share
            earns about{" "}
            <span className="font-medium text-ink tabular-nums">
              {formatUSD(charter.perShareAnnualIncome)}
            </span>{" "}
            /yr in charter income.
          </>
        ),
        projectedIncomeLabel: "Projected charter income",
        depreciationNote: `Same ${BOATS_TARGET_DEPRECIATION_PCT}% depreciation assumption applies whether you cruise or charter, surveyed certified pre owned hulls and shareholder mileage caps keep the resale story consistent.`,
        doctrine: `Doctrine: RYDA holds each curated hull for ${BOATS_HOLDING_YEARS} years, then sells it and distributes proceeds pro-rata. Modeled at ${BOATS_TARGET_DEPRECIATION_PCT}% depreciation, actual sale price varies by model, condition, and market.`,
      },
    };
  }

  return {
    asset,
    accentTextClass: "text-red",
    economics: (vehicle, opts) =>
      computeShareEconomics(vehicle as Vehicle, opts),
    poolEconomics: (vehicle, opts) =>
      computeRentalEconomics(vehicle as Vehicle, opts),
    showScenario: true,
    depreciationPct: TARGET_DEPRECIATION_PCT,
    holdingYears: HOLDING_YEARS,
    vocabulary: {
      carryingLabel: "carrying cost",
      usageDaysLabel: "driving days",
      poolName: "rental",
      poolEyebrow: "Or, opt into the rental pool",
      poolCopy: (rental) => (
        <>
          Pool your unused days into RYDA&apos;s rental program (Miami exotic
          fleets average 200–240 booked days/yr). At a{" "}
          {rental.occupancyPct}% rental occupancy and a{" "}
          {rental.managementFeePct}% management fee, your share earns about{" "}
          <span className="font-medium text-ink tabular-nums">
            {formatUSD(rental.perShareAnnualIncome)}
          </span>{" "}
          /yr in rental income.
        </>
      ),
      projectedIncomeLabel: "Projected rental income",
      depreciationNote: `Same ${TARGET_DEPRECIATION_PCT}% depreciation assumption applies — our certified pre owned maintenance + 100 mi/day shareholder allowance keep the resale story consistent whether you drive or rent it out.`,
      doctrine: `Doctrine: RYDA holds each curated certified pre owned car for ${HOLDING_YEARS} years, then sells it and distributes proceeds pro-rata. Modeled at ${TARGET_DEPRECIATION_PCT}% depreciation, actual sale price varies by model, mileage, and market conditions.`,
    },
  };
}

export default function CostBreakdown({
  config,
  shares = 1,
  className = "",
}: {
  config: CostBreakdownConfig;
  shares?: number;
  className?: string;
}) {
  const { asset, vocabulary } = config;
  const e = config.economics(asset, { shares });
  const pool = config.poolEconomics(asset, { holdYears: e.holdYears });
  const poolIncomeForShares = pool.perShareTotalIncome * shares;
  const pooledNet = e.netCost - poolIncomeForShares;
  const pooledProfit = -pooledNet;
  const pooledIsPositive = pooledProfit > 0;
  const pooledReturnPct =
    e.totalSpend === 0 ? 0 : (pooledProfit / e.totalSpend) * 100;
  const pooledPerDay =
    e.totalDays === 0 ? 0 : Math.round(pooledNet / e.totalDays);
  const carryingSub =
    vocabulary.carryingSub?.(e) ??
    `${formatUSD(e.annualCarrying)}/yr × ${e.holdYears}`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-rule bg-surface ${className}`}
    >
      <div className="border-b border-rule bg-cream-2/60 px-6 py-4">
        <p
          className={`text-xs font-medium uppercase tracking-[0.2em] ${config.accentTextClass}`}
        >
          Your {e.holdYears}-year cost outlook
        </p>
        <p className="mt-1 font-display text-xl text-ink">
          What you actually pay if you hold {shares} share
          {shares > 1 ? "s" : ""} for {e.holdYears} years
        </p>
      </div>

      <dl className="divide-y divide-rule">
        <Row
          label={`Buy-in (${shares} share${shares > 1 ? "s" : ""})`}
          value={formatUSD(e.buyIn)}
          sub={`${formatUSD(asset.pricePerShare)} × ${shares}`}
        />
        <Row
          label={`${e.holdYears}-yr ${vocabulary.carryingLabel}`}
          value={formatUSD(e.totalCarrying)}
          sub={carryingSub}
        />
        <Row
          label="Total cash out"
          value={formatUSD(e.totalSpend)}
          emphasized
        />
        <Row
          label={`Est. share sale at exit (${100 - e.depreciationPct}% of buy-in)`}
          value={`− ${formatUSD(e.estimatedResale)}`}
          sub={`Modeled at ${e.depreciationPct}% depreciation over ${e.holdYears} yrs`}
        />
        <Row
          label={`Net cost over ${e.holdYears} years`}
          value={formatUSD(e.netCost)}
          accent
          sub={`≈ ${formatUSD(e.netPerDay)}/day for ${e.totalDays} ${vocabulary.usageDaysLabel}`}
        />
      </dl>

      {config.showScenario && pool.perShareAnnualIncome > 0 ? (
        <div className="border-t border-rule bg-ink/[0.03] px-6 py-5">
          <p
            className={`text-xs font-medium uppercase tracking-[0.2em] ${config.accentTextClass}`}
          >
            {vocabulary.poolEyebrow}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {vocabulary.poolCopy(pool)}
          </p>

          <div
            className={`mt-4 rounded-xl border p-4 ${
              pooledIsPositive
                ? "border-success/40 bg-success/5"
                : "border-rule bg-surface"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">
              The {e.holdYears}-year math
            </p>
            <dl className="mt-3 space-y-1.5 text-sm tabular-nums text-ink-soft">
              <BreakdownRow
                sign="−"
                label="Share price (your buy-in)"
                value={formatUSD(e.buyIn)}
                sub={`${formatUSD(asset.pricePerShare)} × ${shares}`}
                cost
              />
              <BreakdownRow
                sign="−"
                label={`${e.holdYears}-yr ${vocabulary.carryingLabel}`}
                value={formatUSD(e.totalCarrying)}
                sub={`${formatUSD(e.annualCarrying)}/yr × ${e.holdYears}`}
                cost
              />
              <BreakdownRow
                sign="+"
                label={`${vocabulary.projectedIncomeLabel} (${e.holdYears} yrs)`}
                value={formatUSD(poolIncomeForShares)}
                sub={`${formatUSD(pool.perShareAnnualIncome)}/yr per share × ${e.holdYears} × ${shares} share${shares > 1 ? "s" : ""}`}
                positive
              />
              <BreakdownRow
                sign="+"
                label={`Projected sale at exit (${100 - e.depreciationPct}% of buy-in)`}
                value={formatUSD(e.estimatedResale)}
                sub={`Modeled at ${config.depreciationPct}% depreciation over ${e.holdYears} yrs`}
                positive
              />
            </dl>
            <div
              className={`mt-3 flex items-baseline justify-between gap-4 border-t pt-3 ${
                pooledIsPositive ? "border-success/30" : "border-rule"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  Net ({e.holdYears} yrs)
                </p>
                <p className="mt-0.5 text-[11px] text-mute">
                  {pooledIsPositive
                    ? `${formatUSD(Math.abs(pooledPerDay))}/day "kept" across ${e.totalDays} ${vocabulary.usageDaysLabel}`
                    : `${formatUSD(pooledPerDay)}/day across ${e.totalDays} ${vocabulary.usageDaysLabel}`}
                </p>
              </div>
              <p
                className={`shrink-0 font-display text-2xl tabular-nums ${
                  pooledIsPositive ? "text-success" : "text-red"
                }`}
              >
                = {pooledIsPositive ? "+ " : "− "}
                {formatUSD(Math.abs(pooledProfit))}
                <span className="ml-2 align-baseline text-xs font-normal opacity-75">
                  {pooledIsPositive ? "+" : ""}
                  {pooledReturnPct.toFixed(2)}%
                </span>
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-mute">
            {vocabulary.depreciationNote}
          </p>
          <p className="mt-1 text-[11px] text-mute">
            Illustrative usage-economics only. Co-ownership shares are
            member-managed LLC interests, not securities; modeled
            outcomes are not guaranteed and not an investment offer.
          </p>
        </div>
      ) : null}

      <div className="border-t border-rule bg-cream-2/40 px-6 py-3">
        <p className="text-[11px] leading-relaxed text-mute">
          {vocabulary.doctrine}
        </p>
      </div>
    </div>
  );
}

function BreakdownRow({
  sign,
  label,
  value,
  sub,
  positive,
  cost,
}: {
  sign: "+" | "−";
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  cost?: boolean;
}) {
  // Loss / cost coloring stays universally red across both verticals,
  // green for gains. Marine blue is the boats brand accent, not a
  // profit indicator.
  const tone = positive
    ? "text-success"
    : cost
      ? "text-red"
      : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className={`w-3 shrink-0 text-center font-medium ${tone}`}>
          {sign}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-ink">{label}</p>
          {sub ? <p className="text-[11px] text-mute">{sub}</p> : null}
        </div>
      </div>
      <span className={`shrink-0 tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  emphasized,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasized?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 px-6 py-3.5 ${
        accent ? "bg-red/[0.04]" : ""
      }`}
    >
      <div className="min-w-0">
        <p
          className={`text-sm ${
            accent ? "font-medium text-ink" : "text-ink-soft"
          } ${emphasized ? "font-medium text-ink" : ""}`}
        >
          {label}
        </p>
        {sub ? <p className="mt-0.5 text-[11px] text-mute">{sub}</p> : null}
      </div>
      {/* Headline net-cost row stays red, it's a net outflow, not a
          brand accent slot. Loss = red regardless of vertical. */}
      <p
        className={`shrink-0 font-display tabular-nums ${
          accent
            ? "text-2xl text-red"
            : emphasized
              ? "text-lg text-ink"
              : "text-base text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
