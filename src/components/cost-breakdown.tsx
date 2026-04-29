// Concise per-listing cost breakdown.
// Same doctrine as the /compare page calculator, but compact enough to
// drop on every individual market detail page (and anywhere else we
// want to show "what you actually pay over the 2-year hold").

import {
  computeShareEconomics,
  computeRentalEconomics,
  formatUSD,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
  type Vehicle,
} from "@/lib/market-data";

export function CostBreakdown({
  vehicle,
  shares = 1,
  className = "",
  showRentalScenario = true,
}: {
  vehicle: Vehicle;
  shares?: number;
  className?: string;
  showRentalScenario?: boolean;
}) {
  const e = computeShareEconomics(vehicle, { shares });

  // Same depreciation assumption applies whether driven or rented.
  const rental = computeRentalEconomics(vehicle, { holdYears: e.holdYears });
  const rentalIncomeForShares = rental.perShareTotalIncome * shares;
  const rentedNet = e.netCost - rentalIncomeForShares;
  const rentedProfit = -rentedNet;                // > 0 when you profit
  const rentedIsPositive = rentedProfit > 0;
  const rentedReturnPct =
    e.totalSpend === 0 ? 0 : (rentedProfit / e.totalSpend) * 100;
  const rentedPerDay =
    e.totalDays === 0 ? 0 : Math.round(rentedNet / e.totalDays);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-rule bg-surface ${className}`}
    >
      <div className="border-b border-rule bg-cream-2/60 px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
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
          sub={`${formatUSD(vehicle.pricePerShare)} × ${shares}`}
        />
        <Row
          label={`${e.holdYears}-yr carrying cost`}
          value={formatUSD(e.totalCarrying)}
          sub={`${formatUSD(e.annualCarrying)}/yr × ${e.holdYears}`}
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
          sub={`≈ ${formatUSD(e.netPerDay)}/day for ${e.totalDays} driving days`}
        />
      </dl>

      {showRentalScenario && rental.perShareAnnualIncome > 0 ? (
        <div className="border-t border-rule bg-ink/[0.03] px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Or — opt into the rental pool
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Pool your unused days into RYDA's rental program (Miami exotic
            fleets average 200–240 booked days/yr). At a{" "}
            {rental.occupancyPct}% rental occupancy and a{" "}
            {rental.managementFeePct}% management fee, your share earns about{" "}
            <span className="font-medium text-ink tabular-nums">
              {formatUSD(rental.perShareAnnualIncome)}
            </span>{" "}
            /yr in rental income.
          </p>

          <div
            className={`mt-4 rounded-xl border p-4 ${
              rentedIsPositive
                ? "border-emerald-500/40 bg-emerald-500/5"
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
                sub={`${formatUSD(vehicle.pricePerShare)} × ${shares}`}
                cost
              />
              <BreakdownRow
                sign="−"
                label={`${e.holdYears}-yr carrying cost`}
                value={formatUSD(e.totalCarrying)}
                sub={`${formatUSD(e.annualCarrying)}/yr × ${e.holdYears}`}
                cost
              />
              <BreakdownRow
                sign="+"
                label={`Projected rental income (${e.holdYears} yrs)`}
                value={formatUSD(rentalIncomeForShares)}
                sub={`${formatUSD(rental.perShareAnnualIncome)}/yr per share × ${e.holdYears} × ${shares} share${shares > 1 ? "s" : ""}`}
                positive
              />
              <BreakdownRow
                sign="+"
                label={`Projected sale at exit (${100 - e.depreciationPct}% of buy-in)`}
                value={formatUSD(e.estimatedResale)}
                sub={`Modeled at ${TARGET_DEPRECIATION_PCT}% depreciation over ${e.holdYears} yrs`}
                positive
              />
            </dl>
            <div
              className={`mt-3 flex items-baseline justify-between gap-4 border-t pt-3 ${
                rentedIsPositive ? "border-emerald-500/30" : "border-rule"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  Projected return ({rentedIsPositive ? "+" : ""}
                  {rentedReturnPct.toFixed(2)}%)
                </p>
                <p className="mt-0.5 text-[11px] text-mute">
                  {rentedIsPositive
                    ? `${formatUSD(Math.abs(rentedPerDay))}/day "kept" across ${e.totalDays} driving days`
                    : `${formatUSD(rentedPerDay)}/day across ${e.totalDays} driving days`}
                </p>
              </div>
              <p
                className={`shrink-0 font-display text-2xl tabular-nums ${
                  rentedIsPositive ? "text-emerald-600" : "text-red"
                }`}
              >
                {rentedIsPositive ? "+ " : "− "}
                {formatUSD(Math.abs(rentedProfit))}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-mute">
            Same {TARGET_DEPRECIATION_PCT}% depreciation assumption applies —
            our CPO maintenance + 100 mi/day shareholder allowance keep
            the resale story consistent whether you drive or rent it out.
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
          Doctrine: RYDA holds each curated CPO car for {HOLDING_YEARS} years,
          then sells it and distributes proceeds pro-rata. Modeled at{" "}
          {TARGET_DEPRECIATION_PCT}% depreciation — actual sale price varies
          by model, mileage, and market conditions.
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
  const tone = positive
    ? "text-emerald-600"
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
