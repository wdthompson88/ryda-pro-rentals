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
  RENTAL_DEFAULTS,
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

  // Rental scenario uses bumped depreciation to reflect heavier wear.
  const rentedDepPct = RENTAL_DEFAULTS.rentedDepreciationPct;
  const eRented = computeShareEconomics(vehicle, {
    shares,
    depreciationPct: rentedDepPct,
  });
  const rental = computeRentalEconomics(vehicle, { holdYears: e.holdYears });
  const rentalIncomeForShares = rental.perShareTotalIncome * shares;
  const rentedNet = eRented.netCost - rentalIncomeForShares;
  const rentedPerDay =
    eRented.totalDays === 0
      ? 0
      : Math.round(rentedNet / eRented.totalDays);

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
        <div className="border-t border-rule bg-ink/[0.03] px-6 py-4">
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
            /yr — offsetting{" "}
            <span className="font-medium text-ink">
              {Math.min(100, Math.round((rental.perShareAnnualIncome / e.annualCarrying) * 100))}%
            </span>{" "}
            of your carrying cost.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-rule bg-surface px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-mute">
                Rental income · {e.holdYears}yr
              </p>
              <p className="mt-0.5 font-display text-base text-ink tabular-nums">
                + {formatUSD(rentalIncomeForShares)}
              </p>
            </div>
            <div className="rounded-lg border border-red bg-red/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-mute">
                Net cost · rental scenario
              </p>
              <p className="mt-0.5 font-display text-base text-red tabular-nums">
                {rentedNet < 0 ? "− " : ""}
                {formatUSD(Math.abs(rentedNet))}
              </p>
              <p className="mt-0.5 text-[10px] text-mute tabular-nums">
                {rentedNet < 0
                  ? `Net positive ≈ ${formatUSD(Math.abs(rentedPerDay))}/day surplus`
                  : `≈ ${formatUSD(rentedPerDay)}/day`}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-mute">
            Heavier use → faster depreciation. We model {rentedDepPct}% over
            the {e.holdYears}-year hold for the rental path (vs{" "}
            {TARGET_DEPRECIATION_PCT}% drive-only).
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
