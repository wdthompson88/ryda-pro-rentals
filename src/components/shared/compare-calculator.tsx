"use client";

import { useMemo, useState } from "react";
import {
  VEHICLES,
  formatUSD,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
  RENTAL_DEFAULTS,
  computeRentalEconomics,
  type Vehicle,
} from "@/lib/market-data";
import {
  BOATS,
  BOATS_HOLDING_YEARS,
  BOATS_TARGET_DEPRECIATION_PCT,
  RENTAL_DEFAULTS_BOATS,
  computeBoatRentalEconomics,
  type Boat,
} from "@/lib/boat-data";

const RENTAL_FALLBACK = 2_500;

type CompareAsset = Vehicle | Boat;

type RentalEconomics = ReturnType<typeof computeRentalEconomics>;

export type CompareCalculatorConfig<TAsset extends CompareAsset = CompareAsset> = {
  vertical: "cars" | "boats";
  holdingYears: number;
  targetDepreciationPct: number;
  rentalDefaults: {
    defaultOccupancyPct: number;
    defaultManagementFeePct: number;
  };
  accent: "red" | "marine";
  labels: {
    asset: string;
    assetLower: string;
    assetHeldCopy: string;
    calculatorName: string;
    rentalIncomeName: string;
    rentalPoolName: string;
    rentalVerb: string;
    rentalToggleVerb: string;
    /** Adjective form, title-case: "Rental" / "Charter" */
    rentalAdjectiveTitle: string;
    /** Adjective/noun form, lower-case: "rental" / "charter" */
    rentalAdjectiveLower: string;
    useDays: string;
    useDaysAdjective: string;
    residualAssumption: string;
    rentalMarketCopy: string;
    resaleConsistencyCopy: string;
    exitAssetName: string;
  };
};

type Props<TAsset extends CompareAsset> = {
  config: CompareCalculatorConfig<TAsset>;
  lockedAsset?: TAsset;
};

const compareAccentClasses = {
  red: {
    text: "text-red",
    border: "border-red",
    borderSoft: "border-red/30",
    bg: "bg-red",
    bgSoft: "bg-red/5",
    focus: "focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20",
    hoverBgSoft: "hover:bg-red/5",
    shadow: "shadow-lg shadow-red/30",
    range: "accent-red",
  },
  marine: {
    text: "text-marine",
    border: "border-marine",
    borderSoft: "border-marine/30",
    bg: "bg-marine",
    bgSoft: "bg-marine/5",
    focus: "focus:border-marine focus:outline-none focus:ring-2 focus:ring-marine/20",
    hoverBgSoft: "hover:bg-marine/5",
    shadow: "shadow-lg shadow-marine/30",
    range: "accent-marine",
  },
} as const;

export function buildCompareCalculatorConfig(
  vertical: "cars",
): CompareCalculatorConfig<Vehicle>;
export function buildCompareCalculatorConfig(
  vertical: "boats",
): CompareCalculatorConfig<Boat>;
export function buildCompareCalculatorConfig(
  vertical: "cars" | "boats",
): CompareCalculatorConfig {
  if (vertical === "boats") {
    return {
      vertical,
      holdingYears: BOATS_HOLDING_YEARS,
      targetDepreciationPct: BOATS_TARGET_DEPRECIATION_PCT,
      rentalDefaults: RENTAL_DEFAULTS_BOATS,
      accent: "marine",
      labels: {
        asset: "Boat",
        assetLower: "boat",
        assetHeldCopy: "curated surveyed hull",
        calculatorName: "Boatculator",
        rentalIncomeName: "Charter income projection",
        rentalPoolName: "charter pool",
        rentalVerb: "chartering",
        rentalToggleVerb: "Charter",
        rentalAdjectiveTitle: "Charter",
        rentalAdjectiveLower: "charter",
        useDays: "cruising days",
        useDaysAdjective: "cruise",
        residualAssumption:
          "surveyed certified pre owned hulls",
        rentalMarketCopy:
          "Miami Caribbean charter pools average 200-240 booked days/yr.",
        resaleConsistencyCopy:
          "our 50 nm/day allowance + surveyed-hull maintenance keep the resale story consistent whether you cruise or charter it out.",
        exitAssetName: "boat",
      },
    };
  }

  return {
    vertical,
    holdingYears: HOLDING_YEARS,
    targetDepreciationPct: TARGET_DEPRECIATION_PCT,
    rentalDefaults: RENTAL_DEFAULTS,
    accent: "red",
    labels: {
      asset: "Vehicle",
      assetLower: "vehicle",
      assetHeldCopy: "curated certified pre owned car",
      calculatorName: "Carculator",
      rentalIncomeName: "Rental income projection",
      rentalPoolName: "rental pool",
      rentalVerb: "renting",
      rentalToggleVerb: "Rent",
      rentalAdjectiveTitle: "Rental",
      rentalAdjectiveLower: "rental",
      useDays: "driving days",
      useDaysAdjective: "drive",
      residualAssumption:
        "low-mileage certified pre owned exotics",
      rentalMarketCopy:
        "Miami exotic-rental fleets average 200-240 booked days/yr.",
      resaleConsistencyCopy:
        "our 100 mi/day allowance + certified pre owned maintenance keep the resale story consistent whether you drive or rent it out.",
      exitAssetName: "car",
    },
  };
}

export default function CompareCalculator<TAsset extends CompareAsset>({
  config,
  lockedAsset,
}: Props<TAsset>) {
  const accent = compareAccentClasses[config.accent];
  const assets = (config.vertical === "boats" ? BOATS : VEHICLES) as TAsset[];
  const defaultAsset = (config.vertical === "boats"
    ? BOATS[0]
    : VEHICLES.find((v) => v.symbol === "F296") ?? VEHICLES[0]) as TAsset;
  const getAssetKey = (asset: TAsset) =>
    config.vertical === "boats"
      ? (asset as Boat).slug
      : (asset as Vehicle).symbol;
  const getRentalEconomics = (asset: TAsset, opts: {
    holdYears: number;
    occupancyPct: number;
    ownerUseDaysPerShare: number;
  }) =>
    config.vertical === "boats"
      ? computeBoatRentalEconomics(asset as Boat, opts)
      : computeRentalEconomics(asset as Vehicle, opts);
  const defaultResidualPct = 100 - config.targetDepreciationPct;
  // Educational tool, let users model 1..vehicle.shares regardless of
  // current inventory. Real availability lives on each vehicle's listing.
  // Defaults reflect the doctrinal certified pre owned 2-year planned exit.
  const initial =
    lockedAsset ?? defaultAsset;
  const [assetKey, setAssetKey] = useState(getAssetKey(initial));
  // 2-share minimum per person under the new doctrine. Slider floor and
  // useState default both reflect that so the modeled scenario is
  // actually purchasable.
  const [shares, setShares] = useState(2);
  // Default to 12 owner-use days/yr per share, matches the static
  // worked example on /how-it-works and the rental scenario shown in
  // CostBreakdown / cost-sheet (both pull from RENTAL_DEFAULTS).
  const [days, setDays] = useState(12);
  const [holdYears, setHoldYears] = useState(config.holdingYears);
  const [residualPct, setResidualPct] = useState(defaultResidualPct);
  // Rental opt-in defaults to ON, most members will want the rental
  // income surfaced in their projection. The button text flips to
  // "Opt out" so the action is explicit when the toggle is ON.
  const [optInRental, setOptInRental] = useState(true);
  const [rentalOccupancy, setRentalOccupancy] = useState(
    config.rentalDefaults.defaultOccupancyPct,
  );

  const vehicle: TAsset = lockedAsset
    ?? assets.find((v) => getAssetKey(v) === assetKey)
    ?? initial;

  const maxShares = vehicle.shares; // total shares per LLC (educational cap)
  const safeShares = Math.min(shares, maxShares);
  const maxDays = vehicle.daysPerYear * safeShares; // scales with share count

  const numbers = useMemo(() => {
    const buyIn = vehicle.pricePerShare * safeShares;
    const annualOps = vehicle.annualOpCost * safeShares;
    const rentalDaily = vehicle.rentalDailyRate || RENTAL_FALLBACK;

    // Cap days to what this share count actually unlocks
    const cappedDays = Math.min(days, maxDays);
    const totalDays = cappedDays * holdYears;
    const totalOps = annualOps * holdYears;
    const totalCash = buyIn + totalOps;

    // Residual: what proceeds you'd get back at exit (LLC sale or
    // member-to-member transfer). Held constant across drive-only and
    // rental scenarios, certified pre owned maintenance + curated mileage caps keep
    // the resale story consistent regardless of utilization.
    const residual = Math.round(buyIn * (residualPct / 100));

    // Rental income for shareholders if opted in. Owner-use days come
    // from what THIS user actually drives (cappedDays per year per their
    // share count). The pool of rentable days is the rest of the calendar
    // across ALL shares.
    const ownerUseDaysPerShare = Math.round(cappedDays / safeShares);
    const rentalEcon = getRentalEconomics(vehicle, {
      holdYears,
      occupancyPct: rentalOccupancy,
      ownerUseDaysPerShare,
    });
    const rentalIncomePerShare = optInRental
      ? rentalEcon.perShareTotalIncome * safeShares
      : 0;

    const economicCost = totalCash - residual - rentalIncomePerShare;

    // Rental: pay-per-day for the same total days (alternative scenario)
    const rentalCost = rentalDaily * totalDays;

    // Regular ownership: same hold period, full sticker + carrying.
    // Apply the same residual % the user picked, depreciation hits the
    // whole car, not just one share.
    const regularBuyIn = vehicle.fullPrice;
    const regularAnnualCarrying = vehicle.annualSoloCarrying;
    const regularTotalCash = regularBuyIn + regularAnnualCarrying * holdYears;
    const regularResidual = Math.round(regularBuyIn * (residualPct / 100));
    const regularEconomicCost = regularTotalCash - regularResidual;

    // Utilization, how much of the entitled days you'd actually use
    const utilizationPct =
      maxDays === 0 ? 0 : Math.round((cappedDays / maxDays) * 100);
    const unusedDaysPerYear = Math.max(0, maxDays - cappedDays);

    const ryda = {
      buyIn,
      annualOps,
      totalCash,
      totalDays,
      residual,
      economicCost,
      perDayCash: totalDays === 0 ? 0 : Math.round(totalCash / totalDays),
      perDayEconomic: totalDays === 0 ? 0 : Math.round(economicCost / totalDays),
      utilizationPct,
      unusedDaysPerYear,
      rentalIncomePerShare,
      rentalIncomeAnnual: optInRental
        ? rentalEcon.perShareAnnualIncome * safeShares
        : 0,
    };
    const rental = {
      total: rentalCost,
      perDay: rentalDaily,
    };
    const regular = {
      buyIn: regularBuyIn,
      annualCarrying: regularAnnualCarrying,
      totalCash: regularTotalCash,
      residual: regularResidual,
      economicCost: regularEconomicCost,
      perDayEconomic:
        totalDays === 0 ? 0 : Math.round(regularEconomicCost / totalDays),
    };

    const savings = rental.total - ryda.economicCost;
    const savingsPct = rental.total === 0 ? 0 : Math.round((savings / rental.total) * 100);
    const savingsVsRegular = regular.economicCost - ryda.economicCost;

    return {
      ryda,
      rental,
      regular,
      rentalEcon,
      savings,
      savingsPct,
      savingsVsRegular,
      cappedDays,
    };
  }, [
    vehicle,
    config,
    safeShares,
    days,
    holdYears,
    residualPct,
    maxDays,
    optInRental,
    rentalOccupancy,
  ]);

  return (
    <div
      id="calculator"
      className="rounded-2xl border border-rule bg-surface p-6 sm:p-10"
    >
      <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accent.text}`}>
        Run the math on your usage
      </p>
      <h3 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
        Co-own vs. {config.labels.rentalVerb}, your numbers.
      </h3>
      <p className="mt-3 max-w-xl text-sm text-ink-soft">
        Move the sliders. The math is honest: each {config.labels.assetHeldCopy} is held
        for {config.holdingYears} years (the default), then sold and proceeds are
        returned pro-rata. The calculator subtracts your estimated share
        sale from your total cash to show real{" "}
        <span className="font-medium text-ink">net cost</span>, and
        compares it against {config.labels.rentalVerb} the same {config.labels.exitAssetName} or owning it solo.
      </p>

      {/* Carculator headline panel — Turo-inspired "earnings projection"
          at the top of the calculator. Surfaces the rental-income number
          upfront so the reader sees the offset story before scrolling
          through sliders. Tied to live state via numbers.ryda. */}
      {optInRental && numbers.ryda.rentalIncomeAnnual > 0 ? (
        <div className={`mt-8 rounded-2xl border ${accent.border} ${accent.bgSoft} p-6 sm:p-7`}>
          <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${accent.text}`}>
            {config.labels.calculatorName} · {config.labels.rentalIncomeName}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-end">
            <div className="sm:col-span-2">
              <p className="font-display text-4xl font-light tabular-nums text-ink sm:text-5xl">
                {formatUSD(numbers.ryda.rentalIncomeAnnual)}
                <span className="ml-2 align-baseline text-base font-normal text-ink-soft">
                  /year
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Projected from opting{" "}
                <span className="font-medium text-ink">
                  {safeShares} share{safeShares > 1 ? "s" : ""}
                </span>{" "}
                of the {vehicle.name} into the RYDA {config.labels.rentalPoolName}, at{" "}
                <span className="font-medium text-ink tabular-nums">
                  {rentalOccupancy}%
                </span>{" "}
                occupancy on{" "}
                <span className="tabular-nums">
                  {numbers.rentalEcon.rentablePoolDays}
                </span>{" "}
                pooled days. Revenue split{" "}
                {100 - config.rentalDefaults.defaultManagementFeePct}/
                {config.rentalDefaults.defaultManagementFeePct} you / RYDA.
              </p>
            </div>
            <div className={`rounded-xl border ${accent.borderSoft} bg-cream-2/60 p-4 text-center`}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-mute">
                Offsets carrying
              </p>
              <p className="mt-1 font-display text-3xl tabular-nums text-ink">
                {numbers.ryda.annualOps === 0
                  ? 0
                  : Math.round(
                      (numbers.ryda.rentalIncomeAnnual /
                        numbers.ryda.annualOps) *
                        100,
                    )}
                <span className="text-base text-ink-soft">%</span>
              </p>
              <p className="mt-1 text-[11px] text-mute">
                of {formatUSD(numbers.ryda.annualOps)}/yr ops
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-rule bg-cream-2/60 p-6 sm:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-mute">
            {config.labels.calculatorName} · {config.labels.rentalIncomeName}
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Toggle &ldquo;{config.labels.rentalToggleVerb} your unused days&rdquo; below to see what
            opting your share into the {config.labels.rentalPoolName} would project. Default
            occupancy: {config.rentalDefaults.defaultOccupancyPct}% of pooled
            days booked.
          </p>
        </div>
      )}

      {/* Inputs */}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="calc-asset"
            className="block text-xs font-medium uppercase tracking-wider text-mute"
          >
            {config.labels.asset}
          </label>
          {lockedAsset ? (
            <div className="mt-2 flex h-12 w-full items-center rounded-xl border border-rule bg-cream-2 px-4 text-sm font-medium text-ink">
              {lockedAsset.year} {lockedAsset.name}
            </div>
          ) : (
            <select
              id="calc-asset"
              value={assetKey}
              onChange={(e) => setAssetKey(e.target.value)}
              className={`mt-2 h-12 w-full rounded-xl border border-rule bg-cream-2 px-4 text-sm text-ink ${accent.focus}`}
            >
              {assets.map((v) => (
                <option key={getAssetKey(v)} value={getAssetKey(v)}>
                  {v.year} {v.name}
                </option>
              ))}
            </select>
          )}
          <p className="mt-2 text-xs text-mute">
            {formatUSD(vehicle.pricePerShare)} per share ·{" "}
            {formatUSD(vehicle.annualOpCost)}/yr ops · ~{vehicle.daysPerYear}{" "}
            days/share
          </p>
        </div>

        <Slider
          id="calc-shares"
          label="Shares you'd hold"
          value={safeShares}
          onChange={setShares}
          min={2}
          max={maxShares}
          step={1}
          valueLabel={`${safeShares} of ${vehicle.shares}`}
          subLabel={`Unlocks ~${maxDays} days/yr · buy-in ${formatUSD(
            vehicle.pricePerShare * safeShares,
          )}`}
          accent={config.accent}
        />

        <Slider
          id="calc-days"
          label={`Days you'd actually ${config.labels.useDaysAdjective} per year`}
          value={Math.min(days, maxDays)}
          onChange={setDays}
          min={5}
          max={maxDays}
          step={1}
          valueLabel={`${Math.min(days, maxDays)} ${
            Math.min(days, maxDays) === 1 ? "day" : "days"
          }`}
          subLabel={`Cap: ${maxDays} (your share entitlement at ${safeShares} share${safeShares > 1 ? "s" : ""})`}
          accent={config.accent}
        />

        <Slider
          id="calc-hold"
          label="Hold period (years)"
          value={holdYears}
          onChange={setHoldYears}
          min={1}
          max={5}
          step={1}
          valueLabel={`${holdYears} ${holdYears === 1 ? "year" : "years"}`}
          subLabel={`Default: ${config.holdingYears}-yr certified pre owned exit baseline · 12-month minimum hold`}
          accent={config.accent}
        />

        <Slider
          id="calc-residual"
          label="Estimated share sale at exit (% of buy-in)"
          value={residualPct}
          onChange={setResidualPct}
          min={50}
          max={100}
          step={5}
          valueLabel={`${residualPct}%`}
          subLabel={`Default ${defaultResidualPct}%, assumes ~${config.targetDepreciationPct}% depreciation over ${config.holdingYears} yrs on ${config.labels.residualAssumption}`}
          accent={config.accent}
        />
      </div>

      {/* Rental opt-in, defaults ON; toggle reads "Opt out" when on so
          the action is explicit. Most members rent their unused days,
          so the math should reflect that by default. */}
      <div
        className={`mt-10 rounded-2xl border-2 p-6 transition-colors ${
          optInRental
            ? `${accent.border} ${accent.bgSoft}`
            : `${accent.borderSoft} bg-cream-2`
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${accent.text}`}>
              {config.labels.rentalToggleVerb} your unused days · Included by default
            </p>
            <h4 className="mt-2 font-display text-2xl text-ink">
              {optInRental
                ? `${config.labels.rentalAdjectiveTitle} income is included in this math.`
                : `Toggle back on to add ${config.labels.rentalAdjectiveLower} income.`}
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {config.labels.rentalMarketCopy}
              Shareholders can opt their unused entitlement into the
              {config.labels.rentalPoolName}, RYDA handles bookings, insurance, and
              cleaning. Revenue splits{" "}
              {100 - config.rentalDefaults.defaultManagementFeePct}/
              {config.rentalDefaults.defaultManagementFeePct} (you / RYDA),
              distributed pro-rata across shares. Opt out for the
              {config.labels.useDaysAdjective}-only number.
            </p>
            <p className="mt-2 text-xs text-mute">
              Same {config.targetDepreciationPct}% depreciation assumption
              applies, {config.labels.resaleConsistencyCopy}
            </p>
          </div>

          {/* Toggle: when ON the action is "Opt out"; when OFF, "Opt in" */}
          <button
            type="button"
            role="switch"
            aria-checked={optInRental}
            onClick={() => setOptInRental((v) => !v)}
            className={`group flex shrink-0 items-center gap-3 rounded-full border-2 px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] ${
              optInRental
                ? `${accent.border} ${accent.bg} text-cream ${accent.shadow}`
                : `${accent.border} bg-cream ${accent.text} shadow-md ${accent.hoverBgSoft}`
            }`}
          >
            <span>{optInRental ? "Opt out" : "Opt in"}</span>
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                optInRental ? "bg-cream" : accent.bg
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                  optInRental
                    ? `translate-x-6 ${accent.bg}`
                    : "translate-x-1 bg-cream"
                }`}
              />
            </span>
          </button>
        </div>

        {optInRental && (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Slider
              id="calc-rental-occ"
              label={`${config.labels.rentalAdjectiveTitle} occupancy (% of pooled days booked)`}
              value={rentalOccupancy}
              onChange={setRentalOccupancy}
              min={30}
              max={90}
              step={5}
              valueLabel={`${rentalOccupancy}%`}
              subLabel={`At ${rentalOccupancy}% on ${numbers.rentalEcon.rentablePoolDays} pooled days = ~${numbers.rentalEcon.bookedDays} booked days/yr`}
              accent={config.accent}
            />
            <div className="rounded-2xl border border-rule bg-surface p-5">
              <p className="text-xs uppercase tracking-wider text-mute">
                {config.labels.rentalAdjectiveTitle} income, your share{safeShares > 1 ? "s" : ""}
              </p>
              <p className="mt-2 font-display text-2xl text-ink tabular-nums">
                {formatUSD(numbers.ryda.rentalIncomeAnnual)}
                <span className="ml-1 text-sm text-mute">/yr</span>
              </p>
              <p className="mt-2 text-xs text-ink-soft">
                Offsets{" "}
                <span className="font-medium text-ink tabular-nums">
                  {numbers.ryda.annualOps === 0
                    ? 0
                    : Math.round(
                        (numbers.ryda.rentalIncomeAnnual /
                          numbers.ryda.annualOps) *
                          100,
                      )}
                  %
                </span>{" "}
                of your {formatUSD(numbers.ryda.annualOps)}/yr carrying
                cost.
              </p>
              <p className="mt-2 text-[11px] text-mute">
                Total over {holdYears} yrs:{" "}
                <span className="tabular-nums">
                  {formatUSD(numbers.ryda.rentalIncomePerShare)}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Results, RYDA */}
      <div className="mt-12">
        <p className="text-xs font-medium uppercase tracking-wider text-mute">
          RYDA, your share{safeShares > 1 ? "s" : ""}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ResultCard
            label="Total cash out"
            value={formatUSD(numbers.ryda.totalCash)}
            sub={`${formatUSD(numbers.ryda.buyIn)} buy-in + ${formatUSD(
              numbers.ryda.annualOps,
            )}/yr × ${holdYears}`}
          />
          {(() => {
            const profit = -numbers.ryda.economicCost;
            const isPos = profit > 0;
            const returnPct =
              numbers.ryda.totalCash === 0
                ? 0
                : (profit / numbers.ryda.totalCash) * 100;
            return (
              <ResultCard
                label={`Net (${holdYears} yrs)`}
                value={
                  numbers.ryda.economicCost < 0
                    ? `= + ${formatUSD(Math.abs(numbers.ryda.economicCost))}`
                    : `= − ${formatUSD(numbers.ryda.economicCost)}`
                }
                valueDetail={`${isPos ? "+" : ""}${returnPct.toFixed(2)}%`}
                sub={
                  optInRental
                    ? `${formatUSD(numbers.ryda.rentalIncomePerShare)} ${config.labels.rentalAdjectiveLower} income + ${formatUSD(numbers.ryda.residual)} sale − ${formatUSD(numbers.ryda.buyIn)} buy-in − ${formatUSD(numbers.ryda.totalCash - numbers.ryda.buyIn)} carrying`
                    : `${formatUSD(numbers.ryda.residual)} sale − ${formatUSD(numbers.ryda.buyIn)} buy-in − ${formatUSD(numbers.ryda.totalCash - numbers.ryda.buyIn)} carrying`
                }
                accent
                accentColor={config.accent}
                positive={numbers.ryda.economicCost < 0}
              />
            );
          })()}
        </div>

        {/* The math, explicit breakdown */}
        {(() => {
          const profit = -numbers.ryda.economicCost; // > 0 means net positive
          const isPositive = profit > 0;
          const returnPct =
            numbers.ryda.totalCash === 0
              ? 0
              : (profit / numbers.ryda.totalCash) * 100;
          return (
            <div
              className={`mt-4 rounded-2xl border p-5 ${
                isPositive
                  ? "border-success/40 bg-success/5"
                  : "border-rule bg-cream-2/40"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-mute">
                The {holdYears}-year math
              </p>
              <dl className="mt-3 space-y-1.5 text-sm tabular-nums">
                <CalcMathRow
                  sign="−"
                  label="Share price (your buy-in)"
                  value={formatUSD(numbers.ryda.buyIn)}
                  cost
                  accent={config.accent}
                />
                <CalcMathRow
                  sign="−"
                  label={`${holdYears}-yr carrying cost`}
                  value={formatUSD(
                    numbers.ryda.totalCash - numbers.ryda.buyIn,
                  )}
                  cost
                  accent={config.accent}
                />
                {optInRental ? (
                  <CalcMathRow
                    sign="+"
                    label={`Projected ${config.labels.rentalAdjectiveLower} income (${holdYears} yrs)`}
                    value={formatUSD(numbers.ryda.rentalIncomePerShare)}
                    positive
                    accent={config.accent}
                  />
                ) : null}
                <CalcMathRow
                  sign="+"
                  label={`Projected sale at exit (${residualPct}% of buy-in)`}
                  value={formatUSD(numbers.ryda.residual)}
                  positive
                  accent={config.accent}
                />
              </dl>
              <div
                className={`mt-3 flex items-baseline justify-between gap-4 border-t pt-3 ${
                  isPositive
                    ? "border-success/30"
                    : "border-rule"
                }`}
              >
                <span className="text-sm font-medium text-ink">
                  Net ({holdYears} yrs)
                </span>
                <span
                  className={`font-display text-2xl tabular-nums ${
                    isPositive ? "text-success" : "text-ink"
                  }`}
                >
                  = {isPositive ? "+ " : "− "}
                  {formatUSD(Math.abs(profit))}
                  <span className="ml-2 align-baseline text-xs font-normal opacity-75">
                    {isPositive ? "+" : ""}
                    {returnPct.toFixed(2)}%
                  </span>
                </span>
              </div>
              <p className="mt-3 text-[11px] text-mute">
                Illustrative usage-economics only. Co-ownership shares
                are member-managed LLC interests, not securities;
                modeled outcomes are not guaranteed and not an
                investment offer.
              </p>
            </div>
          );
        })()}
      </div>

      {/* Results, alternatives */}
      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-mute">
          The alternatives, same {numbers.ryda.totalDays} {config.labels.useDays}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ResultCard
            label="Regular ownership"
            value={formatUSD(numbers.regular.economicCost)}
            sub={`${formatUSD(numbers.regular.buyIn)} sticker + ${formatUSD(
              numbers.regular.annualCarrying,
            )}/yr carrying × ${holdYears}, less ${formatUSD(numbers.regular.residual)} residual`}
          />
          <ResultCard
            label={`${config.labels.rentalAdjectiveTitle === "Rental" ? "Renting" : "Chartering"} the same days`}
            value={formatUSD(numbers.rental.total)}
            sub={`${formatUSD(numbers.rental.perDay)}/day × ${
              numbers.ryda.totalDays
            } days`}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-rule bg-cream-2/40 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-mute">
            Saved vs. {config.labels.rentalVerb}
          </p>
          <p className="mt-2 font-display text-3xl text-ink sm:text-4xl tabular-nums">
            {numbers.savings >= 0 ? "" : "−"}
            {formatUSD(Math.abs(numbers.savings))}
            <span className="ml-2 text-base text-ink-soft">
              ({numbers.savings >= 0 ? "+" : ""}
              {numbers.savingsPct}%)
            </span>
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            <span className="font-medium text-ink tabular-nums">
              {formatUSD(numbers.ryda.perDayEconomic)}
            </span>
            /day on RYDA vs.{" "}
            <span className="font-medium text-ink tabular-nums">
              {formatUSD(numbers.rental.perDay)}
            </span>
            /day {config.labels.rentalVerb}.
          </p>
        </div>
        <div className="rounded-2xl border border-rule bg-cream-2/40 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-mute">
            Saved vs. regular ownership
          </p>
          <p className="mt-2 font-display text-3xl text-ink sm:text-4xl tabular-nums">
            {numbers.savingsVsRegular >= 0 ? "" : "−"}
            {formatUSD(Math.abs(numbers.savingsVsRegular))}
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            You give up {(100 - safeShares * 10).toFixed(0)}% of access in
            exchange for {(100 - safeShares * 10).toFixed(0)}% less capital
            tied up in the asset.
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-mute">
        Default exit: RYDA sells the {config.labels.exitAssetName} at year {config.holdingYears} and
        distributes proceeds pro-rata. Earlier exits are possible by
        transferring shares to another verified member after the 12-month
        minimum hold; transfer prices are member-to-member.
      </p>

      {numbers.ryda.unusedDaysPerYear > 0 && numbers.ryda.utilizationPct < 80 && (
        <p className="mt-4 rounded-xl border border-rule bg-cream-2/60 p-4 text-xs text-ink-soft">
          <span className="font-medium text-ink">Heads up:</span> at{" "}
          {numbers.ryda.utilizationPct}% utilization, you'd leave{" "}
          <span className="tabular-nums">
            {numbers.ryda.unusedDaysPerYear}
          </span>{" "}
          entitled days/yr unused. RYDA still wins on cost per day actually
          {" "}
          {config.labels.useDaysAdjective}, but if your real usage is much
          lower than your share count unlocks, fewer shares is the more
          honest economic answer.
        </p>
      )}
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  valueLabel,
  subLabel,
  accent = "red",
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  subLabel?: string;
  accent?: "red" | "marine";
}) {
  const styles = compareAccentClasses[accent];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="text-xs font-medium uppercase tracking-wider text-mute"
        >
          {label}
        </label>
        <span className="font-display text-base text-ink tabular-nums">
          {valueLabel}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-rule ${styles.range}`}
      />
      {subLabel && <p className="mt-2 text-xs text-mute">{subLabel}</p>}
    </div>
  );
}

function CalcMathRow({
  sign,
  label,
  value,
  positive,
  cost,
  accent = "red",
}: {
  sign: "+" | "−";
  label: string;
  value: string;
  positive?: boolean;
  cost?: boolean;
  accent?: "red" | "marine";
}) {
  const tone = positive
    ? "text-success"
    : cost
      ? compareAccentClasses[accent].text
      : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex items-baseline gap-2">
        <span className={`w-3 text-center font-medium ${tone}`}>{sign}</span>
        <span className={cost ? "text-ink" : "text-ink"}>{label}</span>
      </span>
      <span className={`tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

function ResultCard({
  label,
  value,
  valueDetail,
  sub,
  accent,
  positive,
  accentColor = "red",
}: {
  label: string;
  value: string;
  /** Small annotation displayed inline next to the main value (e.g.
   *  the percentage subscript on a "Net (2 yrs)" line). */
  valueDetail?: string;
  sub: string;
  accent?: boolean;
  positive?: boolean;
  accentColor?: "red" | "marine";
}) {
  const styles = compareAccentClasses[accentColor];
  const borderColor = positive
    ? "border-success bg-success/5"
    : accent
      ? `${styles.border} ${styles.bgSoft}`
      : "border-rule bg-cream-2/40";
  const textColor = positive ? "text-success" : "text-ink";

  return (
    <div className={`rounded-2xl border p-6 ${borderColor}`}>
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className={`mt-2 font-display text-3xl tabular-nums ${textColor}`}>
        {value}
        {valueDetail ? (
          <span className="ml-2 align-baseline text-sm font-normal opacity-75">
            {valueDetail}
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}
