"use client";

import { useMemo, useState } from "react";
import { VEHICLES, formatUSD, type Vehicle } from "@/lib/market-data";

const RENTAL_FALLBACK = 2_500;

export function CompareCalculator() {
  // Educational tool — let users model 1..vehicle.shares regardless of
  // current inventory. Real availability lives on each vehicle's listing.
  const initial = VEHICLES.find((v) => v.symbol === "F296") ?? VEHICLES[0];
  const [vehicleSymbol, setVehicleSymbol] = useState(initial.symbol);
  const [shares, setShares] = useState(1);
  const [days, setDays] = useState(20);
  const [holdYears, setHoldYears] = useState(3);
  const [residualPct, setResidualPct] = useState(80);

  const vehicle: Vehicle =
    VEHICLES.find((v) => v.symbol === vehicleSymbol) ?? initial;

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

    // Residual: what you'd get back transferring shares at hold end
    const residual = Math.round(buyIn * (residualPct / 100));
    const economicCost = totalCash - residual;

    // Rental: pay-per-day for the same total days
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
      savings,
      savingsPct,
      savingsVsRegular,
      cappedDays,
    };
  }, [vehicle, safeShares, days, holdYears, residualPct, maxDays]);

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
        Move the sliders. The math is honest: it amortizes your buy-in over
        your hold period and assumes you transfer your share at a residual
        value at the end. Compare against renting the same car at its
        published daily rate.
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
          label="How many years would you hold?"
          value={holdYears}
          onChange={setHoldYears}
          min={1}
          max={5}
          step={1}
          valueLabel={`${holdYears} ${holdYears === 1 ? "year" : "years"}`}
          subLabel="12-month minimum hold required"
        />

        <Slider
          id="calc-residual"
          label="Residual value at exit (% of buy-in)"
          value={residualPct}
          onChange={setResidualPct}
          min={50}
          max={100}
          step={5}
          valueLabel={`${residualPct}%`}
          subLabel="CPO exotics typically transfer at 70–85% over 24–36 months"
        />
      </div>

      {/* Results — RYDA */}
      <div className="mt-12">
        <p className="text-xs font-medium uppercase tracking-wider text-mute">
          RYDA — your share{safeShares > 1 ? "s" : ""}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ResultCard
            label="Total RYDA cost"
            value={formatUSD(numbers.ryda.totalCash)}
            sub={`${formatUSD(numbers.ryda.buyIn)} buy-in + ${formatUSD(
              numbers.ryda.annualOps,
            )}/yr × ${holdYears}`}
          />
          <ResultCard
            label="RYDA economic cost"
            value={formatUSD(numbers.ryda.economicCost)}
            sub={`After ${formatUSD(numbers.ryda.residual)} residual at exit`}
            accent
          />
        </div>
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
        Numbers assume you transfer your shares at the residual you set
        above; actual exits depend on member-to-member negotiation.
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

function ResultCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        accent ? "border-red bg-red/5" : "border-rule bg-cream-2/40"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p
        className={`mt-2 font-display text-3xl tabular-nums ${
          accent ? "text-red" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}
