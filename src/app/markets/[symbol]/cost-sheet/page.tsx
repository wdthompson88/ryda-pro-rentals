// Print-optimized cost-comparison sheet, modeled on Supercar Sharing AG's
// "Costs and Savings Overview" PDF format. Browser-native print → PDF.
// Each /markets/[symbol]/cost-sheet renders a one-page sheet for that
// specific vehicle with the math anchored to its actual numbers.

import { notFound } from "next/navigation";
import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import {
  VEHICLES,
  getVehicleBySymbol,
  formatUSD,
  computeShareEconomics,
  computeRentalEconomics,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
  HOLDING_MILES_CAP,
} from "@/lib/market-data";

export async function generateStaticParams() {
  return VEHICLES.map((v) => ({ symbol: v.symbol.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v) return { title: "RYDA · Cost sheet" };
  return {
    title: `${v.name} · Cost Sheet | RYDA`,
    description: `Sole ownership vs RYDA co-ownership cost comparison for the ${v.name}.`,
    robots: { index: false, follow: false }, // print-only, don't surface in search
  };
}

export default async function CostSheetPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const v = getVehicleBySymbol(symbol);
  if (!v) notFound();

  // Per-share economics (1 share, 2-year hold, 10% depreciation)
  const econ1 = computeShareEconomics(v, { shares: 1 });
  const rental = computeRentalEconomics(v, { holdYears: HOLDING_YEARS });
  const rentalIncome2yr = rental.perShareTotalIncome;
  const rentedNet = econ1.netCost - rentalIncome2yr;
  const rentedProfit = -rentedNet;
  const rentedReturnPct =
    econ1.totalSpend === 0
      ? 0
      : (rentedProfit / econ1.totalSpend) * 100;
  const rentedIsPositive = rentedProfit > 0;

  // Solo-ownership math, same hold period & residual assumption
  const soloBuyIn = v.fullPrice;
  const soloAnnualCarrying = v.annualSoloCarrying;
  const soloTotalCarrying = soloAnnualCarrying * HOLDING_YEARS;
  const soloTotalSpend = soloBuyIn + soloTotalCarrying;
  const soloResale = Math.round(
    soloBuyIn * ((100 - TARGET_DEPRECIATION_PCT) / 100),
  );
  const soloNet = soloTotalSpend - soloResale;

  const savingsAcquisition = soloBuyIn - econ1.buyIn;
  const savingsAnnual = soloAnnualCarrying - econ1.annualCarrying;
  const savings2yrNet = soloNet - econ1.netCost;

  return (
    <div className="bg-cream text-ink print:bg-white">
      {/* Screen-only header. Hidden when printing. */}
      <div className="border-b border-rule print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link
            href={`/markets/${v.symbol}`}
            className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
          >
            ← Back to {v.name}
          </Link>
          <div className="flex gap-3">
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Sheet body */}
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14 print:py-6 print:max-w-none print:px-12">
        {/* Letterhead */}
        <header className="border-b border-rule pb-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-2xl tracking-tight text-ink">
              RYDA
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-mute">
              Cost &amp; Savings Overview
            </p>
          </div>
          <h1 className="mt-6 font-display text-3xl text-ink sm:text-4xl">
            {v.name} · 1 Share
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {v.year} · {v.brand} · Stored in {v.market} · {HOLDING_YEARS}-year
            planned exit doctrine ({HOLDING_YEARS} yrs OR{" "}
            {HOLDING_MILES_CAP.toLocaleString()} mi, whichever first).
            Asset-backed Delaware-LLC co-ownership.
          </p>
        </header>

        {/* Headline comparison table */}
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Sole purchase vs RYDA co-ownership · 1 share
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-rule">
            <table className="w-full text-sm">
              <thead className="bg-cream-2 text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-5 py-3 text-left">&nbsp;</th>
                  <th className="px-5 py-3 text-right">
                    Costs sole purchase
                  </th>
                  <th className="px-5 py-3 text-right">
                    Costs RYDA co-owner
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                <tr>
                  <td className="px-5 py-3 text-ink-soft">Purchase price</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatUSD(soloBuyIn)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatUSD(econ1.buyIn)}
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3 text-ink-soft">
                    One-time closing fee
                  </td>
                  <td className="px-5 py-3 text-right text-ink-soft">—</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatUSD(1_500)}
                  </td>
                </tr>
                <tr className="bg-cream-2/60">
                  <td className="px-5 py-3 font-medium text-ink">
                    Acquisition costs total
                  </td>
                  <td className="px-5 py-3 text-right font-display tabular-nums">
                    {formatUSD(soloBuyIn)}
                  </td>
                  <td className="px-5 py-3 text-right font-display tabular-nums">
                    {formatUSD(econ1.buyIn + 1_500)}
                  </td>
                </tr>
                <tr className="bg-emerald-500/[0.06]">
                  <td className="px-5 py-3 font-medium text-emerald-700">
                    Acquisition savings
                  </td>
                  <td className="px-5 py-3 text-right text-mute">—</td>
                  <td className="px-5 py-3 text-right font-display text-emerald-700 tabular-nums">
                    {formatUSD(savingsAcquisition)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Annual costs breakdown */}
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Annual costs · split per share
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-rule">
            <table className="w-full text-sm">
              <thead className="bg-cream-2 text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-5 py-3 text-left">Line item</th>
                  <th className="px-5 py-3 text-right">Sole owner</th>
                  <th className="px-5 py-3 text-right">RYDA · 1 share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                <CostLine
                  label="Insurance, agreed-value"
                  solo={Math.round(soloAnnualCarrying * 0.24)}
                  share={Math.round(econ1.annualCarrying * 0.16)}
                />
                <CostLine
                  label="Service & maintenance"
                  solo={Math.round(soloAnnualCarrying * 0.17)}
                  share={Math.round(econ1.annualCarrying * 0.11)}
                />
                <CostLine
                  label="Storage & preparation"
                  solo={Math.round(soloAnnualCarrying * 0.11)}
                  share={Math.round(econ1.annualCarrying * 0.07)}
                />
                <CostLine
                  label="Reserve allocation (notional)"
                  solo={Math.round(soloAnnualCarrying * 0.48)}
                  share={Math.round(econ1.annualCarrying * 0.31)}
                />
                <CostLine
                  label="RYDA service fee"
                  solo={0}
                  share={Math.round(econ1.annualCarrying * 0.35)}
                />
                <tr className="bg-cream-2/60">
                  <td className="px-5 py-3 font-medium text-ink">
                    Total annual
                  </td>
                  <td className="px-5 py-3 text-right font-display tabular-nums">
                    {formatUSD(soloAnnualCarrying)}
                  </td>
                  <td className="px-5 py-3 text-right font-display tabular-nums">
                    {formatUSD(econ1.annualCarrying)}
                  </td>
                </tr>
                <tr className="bg-emerald-500/[0.06]">
                  <td className="px-5 py-3 font-medium text-emerald-700">
                    Annual savings
                  </td>
                  <td className="px-5 py-3 text-right text-mute">—</td>
                  <td className="px-5 py-3 text-right font-display text-emerald-700 tabular-nums">
                    {formatUSD(savingsAnnual)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-mute">
            Per-line splits illustrative; actual expense categories vary
            quarter to quarter and are reported on the LLC&apos;s books.
            &quot;Reserve allocation&quot; is the periodic set-aside a
            prudent owner holds against eventual depreciation — it is
            not paid out, and the realized depreciation hit is captured
            separately at exit in the resale figure below (no
            double-counting).
          </p>
        </section>

        {/* 2-year math summary */}
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            {HOLDING_YEARS}-year math · drive-only scenario
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-rule">
            <table className="w-full text-sm">
              <thead className="bg-cream-2 text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-5 py-3 text-left">&nbsp;</th>
                  <th className="px-5 py-3 text-right">Sole owner</th>
                  <th className="px-5 py-3 text-right">RYDA · 1 share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                <tr>
                  <td className="px-5 py-3 text-ink-soft">Total cash out</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatUSD(soloTotalSpend)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatUSD(econ1.totalSpend)}
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3 text-ink-soft">
                    Resale at exit ({100 - TARGET_DEPRECIATION_PCT}%)
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    + {formatUSD(soloResale)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    + {formatUSD(econ1.estimatedResale)}
                  </td>
                </tr>
                <tr className="bg-cream-2/60">
                  <td className="px-5 py-3 font-medium text-ink">
                    Net cost over {HOLDING_YEARS} years
                  </td>
                  <td className="px-5 py-3 text-right font-display tabular-nums">
                    {formatUSD(soloNet)}
                  </td>
                  <td className="px-5 py-3 text-right font-display tabular-nums">
                    {formatUSD(econ1.netCost)}
                  </td>
                </tr>
                <tr className="bg-emerald-500/[0.06]">
                  <td className="px-5 py-3 font-medium text-emerald-700">
                    {HOLDING_YEARS}-yr savings vs sole
                  </td>
                  <td className="px-5 py-3 text-right text-mute">—</td>
                  <td className="px-5 py-3 text-right font-display text-emerald-700 tabular-nums">
                    {formatUSD(savings2yrNet)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Rental opt-in scenario */}
        {v.rentalAvailable && rentalIncome2yr > 0 ? (
          <section className="mt-8 rounded-xl border-2 border-red/30 bg-red/[0.03] p-5">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Optional · rent your unused days
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              At the default 50% rental-pool occupancy, your 1 share earns{" "}
              <span className="font-medium text-ink tabular-nums">
                {formatUSD(rental.perShareAnnualIncome)}
              </span>{" "}
              /yr in rental income. Same {TARGET_DEPRECIATION_PCT}%
              depreciation assumption applies; the all-inclusive
              annual-carrying line above stays unchanged.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-rule bg-surface px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-mute">
                  Rental income · {HOLDING_YEARS} yrs
                </p>
                <p className="mt-1 font-display text-lg text-emerald-700 tabular-nums">
                  + {formatUSD(rentalIncome2yr)}
                </p>
              </div>
              <div
                className={`rounded-lg border px-4 py-3 ${
                  rentedIsPositive
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-rule bg-surface"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-mute">
                  Net ({HOLDING_YEARS} yrs)
                </p>
                <p
                  className={`mt-1 font-display text-lg tabular-nums ${
                    rentedIsPositive ? "text-emerald-700" : "text-ink"
                  }`}
                >
                  = {rentedIsPositive ? "+ " : "− "}
                  {formatUSD(Math.abs(rentedProfit))}
                  <span className="ml-1.5 align-baseline text-[10px] font-normal opacity-75">
                    {rentedIsPositive ? "+" : ""}
                    {rentedReturnPct.toFixed(2)}%
                  </span>
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Quick facts */}
        <section className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-rule pt-6 text-sm sm:grid-cols-4">
          <Fact label="Days / share / yr" value={`${v.daysPerYear}`} />
          <Fact label="Miles / share / yr" value={v.milesPerYear.toLocaleString()} />
          <Fact label="Total shares" value={String(v.shares)} />
          <Fact label="Hold period" value={`${HOLDING_YEARS} yrs · ${HOLDING_MILES_CAP / 1000}K mi cap`} />
        </section>

        {/* Footer / disclaimer */}
        <footer className="mt-10 border-t border-rule pt-6 text-[11px] leading-relaxed text-mute">
          <p>
            Illustrative usage-economics for the {v.name}. Co-ownership
            shares are member-managed Delaware LLC interests, not
            registered securities and not offered for investment
            purposes. Modeled outcomes are not guaranteed; actual sale
            price varies by model, mileage, and market. Sole-ownership
            carrying assumes industry averages for insurance, storage,
            maintenance, and depreciation reserve. Run your own scenario
            in the calculator on /markets/{v.symbol.toLowerCase()}.
          </p>
          <p className="mt-3">
            RYDA · Member-managed co-ownership · Miami · LA · NYC
          </p>
        </footer>
      </div>

      {/* Print styling — set page size + margins, hide chrome */}
      <style>{`
        @media print {
          @page { size: Letter; margin: 0.5in; }
          body { background: white !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </div>
  );
}

function CostLine({
  label,
  solo,
  share,
}: {
  label: string;
  solo: number;
  share: number;
}) {
  return (
    <tr>
      <td className="px-5 py-3 text-ink-soft">{label}</td>
      <td className="px-5 py-3 text-right tabular-nums">
        {solo > 0 ? formatUSD(solo) : "—"}
      </td>
      <td className="px-5 py-3 text-right tabular-nums">
        {share > 0 ? formatUSD(share) : "—"}
      </td>
    </tr>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">
        {label}
      </p>
      <p className="mt-1 font-display text-base text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}
