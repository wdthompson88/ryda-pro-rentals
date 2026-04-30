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

const RENTAL_FALLBACK = 2_500;
const DEFAULT_RESIDUAL_PCT = 100 - TARGET_DEPRECIATION_PCT; // 90% of buy-in

export function CompareCalculator({
  lockedVehicle,
}: {
  /** When set, hides the vehicle picker and locks math to this vehicle.
   *  Used on /markets/[symbol] so each listing has its own calculator. */
  lockedVehicle?: Vehicle;
} = {}) {
  // Educational tool — let users model 1..vehicle.shares regardless of
  // current inventory. Real availability lives on each vehicle's listing.
  // Defaults reflect the doctrinal CPO 2-year planned exit.
  const initial =
    lockedVehicle ?? VEHICLES.find((v) => v.symbol === "F296") ?? VEHICLES[0];
  const [vehicleSymbol, setVehicleSymbol] = useState(initial.symbol);
  const [shares, setShares] = useState(1);
  // Default to 12 owner-use days/yr per share — matches the static
  // worked example on /how-it-works and the rental scenario shown in
  // CostBreakdown / cost-sheet (both pull from RENTAL_DEFAULTS).
  const [days, setDays] = useState(12);
  const [holdYears, setHoldYears] = useState(HOLDING_YEARS);
  const [residualPct, setResidualPct] = useState(DEFAULT_RESIDUAL_PCT);
  const [optInRental, setOptInRental] = useState(false);
  const [rentalOccupancy, setRentalOccupancy] = useState(
    RENTAL_DEFAULTS.defaultOccupancyPct,
  );

  const vehicle: Vehicle = lockedVehicle
    ?? VEHICLES.find((v) => v.symbol === vehicleSymbol)
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
    // rental scenarios — CPO maintenance + curated mileage caps keep
    // the resale story consistent regardless of utilization.
    const residual = Math.round(buyIn * (residualPct / 100));

    // Rental income for shareholders if opted in. Owner-use days come
    // from what THIS user actually drives (cappedDays per year per their
    // share count). The pool of rentable days is the rest of the calendar
    // across ALL shares.
    const ownerUseDaysPerShare = Math.round(cappedDays / safeShares);
    const rentalEcon = computeRentalEconomics(vehicle, {
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
    // Apply the same residual % the user picked — depreciation hits the
    // whole car, not just one share.
    const regularBuyIn = vehicle.fullPrice;
    const regularAnnualCarrying = vehicle.annualSoloCarrying;
    const regularTotalCash = regularBuyIn + regularAnnualCarrying * holdYears;
    const regularResidual = Math.round(regularBuyIn * (residualPct / 100));
    const regularEconomicCost = regularTotalCash - regularResidual;

    // Utilization — how much of the entitled days you'd actually use
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
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
        Run the math on your usage
      </p>
      <h3 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
        Co-own vs. rent — your numbers.
      </h3>
      <p className="mt-3 max-w-xl text-sm text-ink-soft">
        Move the sliders. The math is honest: each curated CPO car is held
        for {HOLDING_YEARS} years (the default), then sold and proceeds are
        returned pro-rata. The calculator subtracts your estimated share
        sale from your total cash to show real{" "}
        <span className="font-medium text-ink">net cost</span> — and
        compares it against renting the same car or owning it solo.
      </p>

      {/* Inputs */}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="calc-vehicle"
            className="block text-xs font-medium uppercase tracking-wider text-mute"
          >
            Vehicle
          </label>
          {lockedVehicle ? (
            <div className="mt-2 flex h-12 w-full items-center rounded-xl border border-rule bg-cream-2 px-4 text-sm font-medium text-ink">
              {lockedVehicle.year} {lockedVehicle.name}
            </div>
          ) : (
            <select
              id="calc-vehicle"
              value={vehicleSymbol}
              onChange={(e) => setVehicleSymbol(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream-2 px-4 text-sm text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
            >
              {VEHICLES.map((v) => (
                <option key={v.symbol} value={v.symbol}>
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
          min={1}
          max={maxShares}
          step={1}
          valueLabel={`${safeShares} of ${vehicle.shares}`}
          subLabel={`Unlocks ~${maxDays} days/yr · buy-in ${formatUSD(
            vehicle.pricePerShare * safeShares,
          )}`}
        />

        <Slider
          id="calc-days"
          label="Days you'd actually drive per year"
          value={Math.min(days, maxDays)}
          onChange={setDays}
          min={5}
          max={maxDays}
          step={1}
          valueLabel={`${Math.min(days, maxDays)} ${
            Math.min(days, maxDays) === 1 ? "day" : "days"
          }`}
          subLabel={`Cap: ${maxDays} (your share entitlement at ${safeShares} share${safeShares > 1 ? "s" : ""})`}
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
          subLabel={`Default: ${HOLDING_YEARS}-yr CPO exit baseline · 12-month minimum hold`}
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
          subLabel={`Default ${DEFAULT_RESIDUAL_PCT}% — assumes ~${TARGET_DEPRECIATION_PCT}% depreciation over ${HOLDING_YEARS} yrs on low-mileage CPO exotics`}
        />
      </div>

      {/* Rental opt-in — promoted to a stronger card with prominent toggle */}
      <div
        className={`mt-10 rounded-2xl border-2 p-6 transition-colors ${
          optInRental
            ? "border-red bg-red/5"
            : "border-red/30 bg-cream-2"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red">
              Optional · Rent your unused days
            </p>
            <h4 className="mt-2 font-display text-2xl text-ink">
              Toggle on to add rental income to your math.
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Miami exotic-rental fleets average 200–240 booked days/yr.
              Shareholders can opt their unused entitlement into the
              rental pool — RYDA handles bookings, insurance, and
              cleaning. Revenue splits{" "}
              {100 - RENTAL_DEFAULTS.defaultManagementFeePct}/
              {RENTAL_DEFAULTS.defaultManagementFeePct} (you / RYDA),
              distributed pro-rata across shares.
            </p>
            <p className="mt-2 text-xs text-mute">
              Same {TARGET_DEPRECIATION_PCT}% depreciation assumption
              applies — our 100 mi/day allowance + CPO maintenance keep
              the resale story consistent whether you drive or rent it
              out.
            </p>
          </div>

          {/* Larger, higher-contrast toggle with explicit ON/OFF labels */}
          <button
            type="button"
            role="switch"
            aria-checked={optInRental}
            onClick={() => setOptInRental((v) => !v)}
            className={`group flex shrink-0 items-center gap-3 rounded-full border-2 px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all hover:scale-105 ${
              optInRental
                ? "border-red bg-red text-cream shadow-lg shadow-red/30"
                : "border-red bg-cream text-red shadow-md hover:bg-red/5"
            }`}
          >
            <span>{optInRental ? "Opted in" : "Opt in"}</span>
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                optInRental ? "bg-cream" : "bg-red"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                  optInRental
                    ? "translate-x-6 bg-red"
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
              label="Rental occupancy (% of pooled days booked)"
              value={rentalOccupancy}
              onChange={setRentalOccupancy}
              min={30}
              max={90}
              step={5}
              valueLabel={`${rentalOccupancy}%`}
              subLabel={`At ${rentalOccupancy}% on ${numbers.rentalEcon.rentablePoolDays} pooled days = ~${numbers.rentalEcon.bookedDays} booked days/yr`}
            />
            <div className="rounded-2xl border border-rule bg-surface p-5">
              <p className="text-xs uppercase tracking-wider text-mute">
                Rental income — your share{safeShares > 1 ? "s" : ""}
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

      {/* Results — RYDA */}
      <div className="mt-12">
        <p className="text-xs font-medium uppercase tracking-wider text-mute">
          RYDA — your share{safeShares > 1 ? "s" : ""}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ResultCard
            label="Total cash out"
            value={formatUSD(numbers.ryda.totalCash)}
            sub={`${formatUSD(numbers.ryda.buyIn)} buy-in + ${formatUSD(
              numbers.ryda.annualOps,
            )}/yr × ${holdYears}`}
          />
          <ResultCard
            label={(() => {
              const profit = -numbers.ryda.economicCost;
              const isPos = profit > 0;
              const returnPct =
                numbers.ryda.totalCash === 0
                  ? 0
                  : (profit / numbers.ryda.totalCash) * 100;
              return `Projected outcome (${isPos ? "+" : ""}${returnPct.toFixed(2)}%)`;
            })()}
            value={
              numbers.ryda.economicCost < 0
                ? `+ ${formatUSD(Math.abs(numbers.ryda.economicCost))}`
                : `− ${formatUSD(numbers.ryda.economicCost)}`
            }
            sub={
              optInRental
                ? `${formatUSD(numbers.ryda.rentalIncomePerShare)} rental income + ${formatUSD(numbers.ryda.residual)} sale − ${formatUSD(numbers.ryda.buyIn)} buy-in − ${formatUSD(numbers.ryda.totalCash - numbers.ryda.buyIn)} carrying`
                : `${formatUSD(numbers.ryda.residual)} sale − ${formatUSD(numbers.ryda.buyIn)} buy-in − ${formatUSD(numbers.ryda.totalCash - numbers.ryda.buyIn)} carrying`
            }
            accent
            positive={numbers.ryda.economicCost < 0}
          />
        </div>

        {/* The math — explicit breakdown */}
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
                  ? "border-emerald-500/40 bg-emerald-500/5"
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
                />
                <CalcMathRow
                  sign="−"
                  label={`${holdYears}-yr carrying cost`}
                  value={formatUSD(
                    numbers.ryda.totalCash - numbers.ryda.buyIn,
                  )}
                  cost
                />
                {optInRental ? (
                  <CalcMathRow
                    sign="+"
                    label={`Projected rental income (${holdYears} yrs)`}
                    value={formatUSD(numbers.ryda.rentalIncomePerShare)}
                    positive
                  />
                ) : null}
                <CalcMathRow
                  sign="+"
                  label={`Projected sale at exit (${residualPct}% of buy-in)`}
                  value={formatUSD(numbers.ryda.residual)}
                  positive
                />
              </dl>
              <div
                className={`mt-3 flex items-baseline justify-between gap-4 border-t pt-3 ${
                  isPositive
                    ? "border-emerald-500/30"
                    : "border-rule"
                }`}
              >
                <span className="text-sm font-medium text-ink">
                  Projected outcome ({isPositive ? "+" : ""}
                  {returnPct.toFixed(2)}%)
                </span>
                <span
                  className={`font-display text-2xl tabular-nums ${
                    isPositive ? "text-emerald-600" : "text-ink"
                  }`}
                >
                  {isPositive ? "+ " : "− "}
                  {formatUSD(Math.abs(profit))}
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

      {/* Results — alternatives */}
      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-mute">
          The alternatives, same {numbers.ryda.totalDays} driving days
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
            label="Renting the same days"
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
            Saved vs. renting
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
            /day renting.
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
        Default exit: RYDA sells the car at year {HOLDING_YEARS} and
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
          entitled days/yr unused. RYDA still wins on cost per actually-driven
          day, but if your real usage is much lower than your share count
          unlocks, fewer shares is the more honest economic answer.
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
}) {
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
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-rule accent-red"
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
}: {
  sign: "+" | "−";
  label: string;
  value: string;
  positive?: boolean;
  cost?: boolean;
}) {
  const tone = positive
    ? "text-emerald-600"
    : cost
      ? "text-red"
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
  sub,
  accent,
  positive,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  positive?: boolean;
}) {
  const borderColor = positive
    ? "border-emerald-500 bg-emerald-500/5"
    : accent
      ? "border-red bg-red/5"
      : "border-rule bg-cream-2/40";
  const textColor = positive ? "text-emerald-600" : "text-ink";

  return (
    <div className={`rounded-2xl border p-6 ${borderColor}`}>
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className={`mt-2 font-display text-3xl tabular-nums ${textColor}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}
