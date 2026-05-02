// Boat-side cost breakdown — parallel of CostBreakdown but using
// boat economics (3-year hold, 15% depreciation, nautical-mile
// allowance instead of miles, cruising days). Boats run materially
// higher annual operating cost than cars (slip + crew + fuel +
// insurance + hurricane prep) so the math reads differently — but
// the shape is the same so members can compare apples-to-apples
// across verticals.

import {
  computeBoatShareEconomics,
  computeBoatRentalEconomics,
  formatUSD,
  BOATS_HOLDING_YEARS,
  BOATS_TARGET_DEPRECIATION_PCT,
  type Boat,
} from "@/lib/boat-data";

export function BoatCostBreakdown({
  boat,
  shares = 1,
  className = "",
  showCharterScenario = true,
}: {
  boat: Boat;
  shares?: number;
  className?: string;
  showCharterScenario?: boolean;
}) {
  const e = computeBoatShareEconomics(boat, { shares });
  const charter = computeBoatRentalEconomics(boat, { holdYears: e.holdYears });
  const charterIncomeForShares = charter.perShareTotalIncome * shares;
  const charteredNet = e.netCost - charterIncomeForShares;
  const charteredProfit = -charteredNet;
  const charteredIsPositive = charteredProfit > 0;
  const charteredReturnPct =
    e.totalSpend === 0 ? 0 : (charteredProfit / e.totalSpend) * 100;
  const charteredPerDay =
    e.totalDays === 0 ? 0 : Math.round(charteredNet / e.totalDays);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-rule bg-surface ${className}`}
    >
      <div className="border-b border-rule bg-cream-2/60 px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
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
          sub={`${formatUSD(boat.pricePerShare)} × ${shares}`}
        />
        <Row
          label={`${e.holdYears}-yr operating cost`}
          value={formatUSD(e.totalCarrying)}
          sub={`${formatUSD(e.annualCarrying)}/yr × ${e.holdYears} (slip + crew + fuel + insurance + hurricane prep)`}
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
          sub={`≈ ${formatUSD(e.netPerDay)}/day for ${e.totalDays} cruising days`}
        />
      </dl>

      {showCharterScenario && charter.perShareAnnualIncome > 0 ? (
        <div className="border-t border-rule bg-ink/[0.03] px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Or — opt into the charter pool
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Pool your unused days into the RYDA charter program. Boat
            charter occupancy runs lower than car rental — Miami high-
            season boats average ~120 booked days a year. At a{" "}
            {charter.occupancyPct}% pool occupancy and a{" "}
            {charter.managementFeePct}% management fee, your share
            earns about{" "}
            <span className="font-medium text-ink tabular-nums">
              {formatUSD(charter.perShareAnnualIncome)}
            </span>{" "}
            /yr in charter income.
          </p>

          <div
            className={`mt-4 rounded-xl border p-4 ${
              charteredIsPositive
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
                sub={`${formatUSD(boat.pricePerShare)} × ${shares}`}
                cost
              />
              <BreakdownRow
                sign="−"
                label={`${e.holdYears}-yr operating cost`}
                value={formatUSD(e.totalCarrying)}
                sub={`${formatUSD(e.annualCarrying)}/yr × ${e.holdYears}`}
                cost
              />
              <BreakdownRow
                sign="+"
                label={`Projected charter income (${e.holdYears} yrs)`}
                value={formatUSD(charterIncomeForShares)}
                sub={`${formatUSD(charter.perShareAnnualIncome)}/yr per share × ${e.holdYears} × ${shares} share${shares > 1 ? "s" : ""}`}
                positive
              />
              <BreakdownRow
                sign="+"
                label={`Projected sale at exit (${100 - e.depreciationPct}% of buy-in)`}
                value={formatUSD(e.estimatedResale)}
                sub={`Modeled at ${BOATS_TARGET_DEPRECIATION_PCT}% depreciation over ${e.holdYears} yrs`}
                positive
              />
            </dl>
            <div
              className={`mt-3 flex items-baseline justify-between gap-4 border-t pt-3 ${
                charteredIsPositive ? "border-emerald-500/30" : "border-rule"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  Net ({e.holdYears} yrs)
                </p>
                <p className="mt-0.5 text-[11px] text-mute">
                  {charteredIsPositive
                    ? `${formatUSD(Math.abs(charteredPerDay))}/day "kept" across ${e.totalDays} cruising days`
                    : `${formatUSD(charteredPerDay)}/day across ${e.totalDays} cruising days`}
                </p>
              </div>
              <p
                className={`shrink-0 font-display text-2xl tabular-nums ${
                  charteredIsPositive ? "text-emerald-600" : "text-red"
                }`}
              >
                = {charteredIsPositive ? "+ " : "− "}
                {formatUSD(Math.abs(charteredProfit))}
                <span className="ml-2 align-baseline text-xs font-normal opacity-75">
                  {charteredIsPositive ? "+" : ""}
                  {charteredReturnPct.toFixed(2)}%
                </span>
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-mute">
            Same {BOATS_TARGET_DEPRECIATION_PCT}% depreciation assumption
            applies whether you cruise or charter — surveyed certified pre owned hulls and
            shareholder mileage caps keep the resale story consistent.
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
          Doctrine: RYDA holds each curated hull for {BOATS_HOLDING_YEARS}{" "}
          years, then sells it and distributes proceeds pro-rata. Modeled
          at {BOATS_TARGET_DEPRECIATION_PCT}% depreciation — actual sale
          price varies by model, condition, and market.
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
  // Loss / cost coloring stays universally red across both verticals
  // — green for gains, red for outflows. Marine blue is the boats
  // brand accent (used on headers/eyebrows), not a profit indicator.
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
      {/* Headline net-cost row stays red — it's a net outflow, not a
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
