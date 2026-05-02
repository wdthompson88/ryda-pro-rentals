import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { VEHICLES, formatUSD } from "@/lib/market-data";

export const metadata = {
  title: "Your shares — RYDA",
  description: "Your co-ownership shares, usage, and upcoming bookings.",
};

// Sample co-ownership view for the demo phase. Real version pulls from
// authenticated member records in Supabase.
const SEATS = [
  { symbol: "F296", shares: 1, daysUsed: 18 },
  { symbol: "MC75", shares: 1, daysUsed: 7 },
];

export default function PortfolioPage() {
  const positions = SEATS.map((s) => {
    const v = VEHICLES.find((vv) => vv.symbol === s.symbol)!;
    const daysAvailable = v.daysPerYear * s.shares;
    const milesAvailable = v.milesPerYear * s.shares;
    const annualMgmt = v.annualOpCost * s.shares;
    return { v, s, daysAvailable, milesAvailable, annualMgmt };
  });

  const totalSeats = positions.reduce((n, p) => n + p.s.shares, 0);
  const totalDays = positions.reduce((n, p) => n + p.daysAvailable, 0);
  const totalDaysUsed = positions.reduce((n, p) => n + p.s.daysUsed, 0);
  const totalAnnualMgmt = positions.reduce((n, p) => n + p.annualMgmt, 0);

  return (
    <>
      <SiteHeader />
      <DemoBanner />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Your shares
          </p>
          <h1 className="mt-4 font-display text-4xl font-light text-ink sm:text-5xl">
            {totalSeats} share{totalSeats !== 1 ? "s" : ""} across {positions.length} car{positions.length !== 1 ? "s" : ""}.
          </h1>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Days available this year" value={String(totalDays)} sub={`${totalDaysUsed} used`} />
            <Stat label="Days remaining" value={String(totalDays - totalDaysUsed)} sub="across all cars" />
            <Stat label="Annual mgmt fees" value={formatUSD(totalAnnualMgmt)} sub="per year, total" />
            <Stat label="Member tier" value="Blue" sub="First-100 locked" />
          </div>
        </div>
      </section>

      {/* Holdings */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Cars you co-own</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-rule bg-surface">
            <table className="w-full">
              <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-6 py-4 text-left">Vehicle</th>
                  <th className="px-6 py-4 text-right">Shares</th>
                  <th className="hidden px-6 py-4 text-right md:table-cell">Days / yr</th>
                  <th className="hidden px-6 py-4 text-right md:table-cell">Days used</th>
                  <th className="hidden px-6 py-4 text-right lg:table-cell">Mgmt / yr</th>
                  <th className="px-6 py-4 text-right" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr
                    key={p.v.symbol}
                    className="border-b border-rule last:border-b-0 hover:bg-cream-2/40"
                  >
                    <td className="px-6 py-5">
                      <Link href={`/markets/${p.v.symbol}`} className="block">
                        <p className="font-display text-lg text-ink">{p.v.name}</p>
                        <p className="mt-1 text-xs text-mute">
                          {p.v.year} · {p.v.market}
                        </p>
                      </Link>
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums text-ink">
                      {p.s.shares} of {p.v.shares}
                    </td>
                    <td className="hidden px-6 py-5 text-right tabular-nums text-ink-soft md:table-cell">
                      {p.daysAvailable}
                    </td>
                    <td className="hidden px-6 py-5 text-right tabular-nums text-ink-soft md:table-cell">
                      {p.s.daysUsed}
                    </td>
                    <td className="hidden px-6 py-5 text-right tabular-nums text-ink-soft lg:table-cell">
                      {formatUSD(p.annualMgmt)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/my-cars/${p.v.symbol.toLowerCase()}`}
                        className="text-sm font-medium text-red hover:text-red-deep"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Recent activity</h2>
          <ul className="mt-6 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Activity label="Booking confirmed" detail="Ferrari 296 GTB · Apr 28 – May 1" date="2 hours ago" />
            <Activity label="Inspection report posted" detail="McLaren 750S Spider · 2,140 mi" date="Yesterday" />
            <Activity label="Quarterly mgmt fee paid" detail="$1,700 — Ferrari 296 LLC" date="3 days ago" />
            <Activity label="New co-owner joined" detail="McLaren 750S LLC — welcome Jordan" date="2 weeks ago" />
            <Activity label="Welcome to RYDA Blue" detail="Annual membership active" date="3 weeks ago" />
          </ul>
        </div>
      </section>

      {/* CTA — explore more */}
      <section className="bg-ink py-16 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Add another car to your collection.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-cream/70">
            Most members hold shares in 2–3 different vehicles to vary their
            experience across the year. Browse what's currently available.
          </p>
          <Link
            href="/markets"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-cream px-6 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            See the fleet →
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}

function Activity({
  label,
  detail,
  date,
}: {
  label: string;
  detail: string;
  date: string;
}) {
  return (
    <li className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-1 text-xs text-ink-soft">{detail}</p>
      </div>
      <p className="text-xs text-mute">{date}</p>
    </li>
  );
}
