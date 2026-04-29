import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CompareCalculator } from "@/components/compare-calculator";
import { formatUSD } from "@/lib/market-data";

export const metadata = {
  title: "Compare — RYDA",
  description:
    "Honest math: RYDA co-ownership vs regular ownership vs daily rental vs supercar club. Side-by-side, no fine print.",
};

// Anchor numbers for the comparison. Tied to the Ferrari 296 GTB illustration
// used elsewhere on the site so the doctrine stays consistent.
const STICKER = 340_000;
const CARRYING_REGULAR = 46_000; // insurance + storage + maintenance + depreciation reserve
const RENTAL_DAILY = 2_400; // matches F296 published rental rate
// Mid-tier US/UK supercar club (e.g. Freedom Supercars Diamond, Premier
// Auto Club). Range across the category is ~$30K–$80K depending on tier.
const CLUB_ANNUAL = 48_000;
const CLUB_DAYS_INCLUDED = 30;

const RYDA_SHARE_BUYIN = 34_000;
const RYDA_ANNUAL_OPS = 7_080;
const RYDA_DAYS = 34;

const ASSUMED_DRIVE_DAYS = 34;

type Row = {
  label: string;
  regular: string;
  rental: string;
  club: string;
  ryda: string;
  emphasis?: boolean;
};

const ROWS: Row[] = [
  {
    label: "Up-front cost",
    regular: formatUSD(STICKER),
    rental: "$0",
    club: formatUSD(CLUB_ANNUAL) + " (annual)",
    ryda: formatUSD(RYDA_SHARE_BUYIN),
  },
  {
    label: "Annual carrying / fees",
    regular: formatUSD(CARRYING_REGULAR),
    rental: "—",
    club: "Included",
    ryda: formatUSD(RYDA_ANNUAL_OPS),
  },
  {
    label: "Days of access per year",
    regular: "365 (in theory)",
    rental: "Pay-per-day",
    club: `~${CLUB_DAYS_INCLUDED}`,
    ryda: `~${RYDA_DAYS} per share (hold 1–10)`,
  },
  {
    label: "Year 1 spend, 34 days driven",
    regular: formatUSD(STICKER + CARRYING_REGULAR),
    rental: formatUSD(RENTAL_DAILY * ASSUMED_DRIVE_DAYS),
    club: formatUSD(CLUB_ANNUAL),
    ryda: formatUSD(RYDA_SHARE_BUYIN + RYDA_ANNUAL_OPS),
    emphasis: true,
  },
  {
    label: "Effective $/day, year 1",
    regular: formatUSD(Math.round((STICKER + CARRYING_REGULAR) / ASSUMED_DRIVE_DAYS)),
    rental: formatUSD(RENTAL_DAILY),
    club: formatUSD(Math.round(CLUB_ANNUAL / CLUB_DAYS_INCLUDED)),
    ryda: formatUSD(
      Math.round((RYDA_SHARE_BUYIN + RYDA_ANNUAL_OPS) / ASSUMED_DRIVE_DAYS),
    ),
  },
  {
    label: "Effective $/day, ops only (after Y1)",
    regular: formatUSD(Math.round(CARRYING_REGULAR / ASSUMED_DRIVE_DAYS)),
    rental: formatUSD(RENTAL_DAILY),
    club: formatUSD(Math.round(CLUB_ANNUAL / CLUB_DAYS_INCLUDED)),
    ryda: formatUSD(Math.round(RYDA_ANNUAL_OPS / RYDA_DAYS)),
    emphasis: true,
  },
  {
    label: "Real ownership stake",
    regular: "Yes — 100%",
    rental: "No",
    club: "No",
    ryda: "Yes — LLC member",
  },
  {
    label: "Operational burden",
    regular: "All of it",
    rental: "None (reservation only)",
    club: "None",
    ryda: "None (concierge ops)",
  },
  {
    label: "Liquidity / exit",
    regular: "Sell privately or to dealer",
    rental: "Walk away",
    club: "Cancel renewal",
    ryda: "Transfer share after 12-month hold (3% fee)",
  },
  {
    label: "Insurance + maintenance bundled",
    regular: "No",
    rental: "Yes",
    club: "Yes",
    ryda: "Yes",
  },
  {
    label: "Pick a different car each trip",
    regular: "No",
    rental: "Yes",
    club: "Yes (rotating)",
    ryda: "Not within one share — hold shares across multiple LLCs",
  },
  {
    label: "Booking priority on the vehicle",
    regular: "100% — it's yours",
    rental: "First-come-first-served",
    club: "Calendar-based (limited)",
    ryda: "Pro-rata to your share count",
  },
  {
    label: "Damage / deductible exposure",
    regular: "All of it",
    rental: "Per-rental deductible (varies)",
    club: "Capped per booking",
    ryda: "Low deductible; LLC absorbs at-fault below threshold",
  },
  {
    label: "Tax / title / admin friction",
    regular: "On you",
    rental: "None",
    club: "None",
    ryda: "On the LLC; RYDA handles paperwork",
  },
];

export default function ComparePage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Compare
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Four ways to think about{" "}
            <span className="italic text-red">a Ferrari.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Wealthy enthusiasts have three real options for getting into an
            exotic: buy outright, rent by the day, or join a club. RYDA is a
            fourth — structured co-ownership of a real car. The math below
            anchors on the Ferrari 296 GTB and a single share (~34 days a
            year of driving). Most members start there; high-use buyers add
            shares to scale entitlement on the same car.
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-6 py-5 text-left">&nbsp;</th>
                    <th className="px-6 py-5 text-right">Regular ownership</th>
                    <th className="px-6 py-5 text-right">Daily rental</th>
                    <th className="px-6 py-5 text-right">Supercar club</th>
                    <th className="px-6 py-5 text-right text-red">RYDA</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  {ROWS.map((r) => (
                    <tr
                      key={r.label}
                      className={`border-b border-rule last:border-b-0 ${
                        r.emphasis ? "bg-cream-2/60" : ""
                      }`}
                    >
                      <td
                        className={`px-6 py-4 ${
                          r.emphasis
                            ? "font-medium text-ink"
                            : "text-ink-soft"
                        }`}
                      >
                        {r.label}
                      </td>
                      <td
                        className={`px-6 py-4 text-right tabular-nums ${
                          r.emphasis ? "font-display text-base text-ink" : ""
                        }`}
                      >
                        {r.regular}
                      </td>
                      <td
                        className={`px-6 py-4 text-right tabular-nums ${
                          r.emphasis ? "font-display text-base text-ink" : ""
                        }`}
                      >
                        {r.rental}
                      </td>
                      <td
                        className={`px-6 py-4 text-right tabular-nums ${
                          r.emphasis ? "font-display text-base text-ink" : ""
                        }`}
                      >
                        {r.club}
                      </td>
                      <td
                        className={`px-6 py-4 text-right tabular-nums ${
                          r.emphasis
                            ? "font-display text-base text-ink"
                            : ""
                        }`}
                      >
                        {r.ryda}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-xs text-mute">
            Numbers shown for illustration on the Ferrari 296 GTB at $340K
            sticker, modeled around a single co-ownership share. Multi-share
            holders scale linearly: a 5-share holder pays ~$170K up front +
            ~$35K/yr in ops for ~170 days/yr. Regular-ownership carrying
            assumes industry averages for insurance, storage, maintenance,
            and depreciation reserve (range: $40–80K/yr depending on the
            car). Club figure represents a mid-tier US/UK supercar club
            annual membership; tiers run ~$30K–$80K/yr. Daily rental
            assumes Miami market rate for a base 296 GTB.
          </p>
        </div>
      </section>

      {/* Honest framing — when each makes sense */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            When each option actually makes sense.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            We'll be honest about the trade-offs. Different buyers want
            different things.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Take
              title="Regular ownership"
              good="You'd drive 60+ days a year, you love the operational responsibility (storage, insurance, maintenance, registration), and you have the capital and tolerance for $40–80K/yr in carrying."
              tradeoff="The asset sits idle 90% of the time. Carrying costs accrue whether you drive or not. Selling takes weeks to months."
            />
            <Take
              title="Daily rental"
              good="You drive once or twice a year, you don't want any commitment, and the per-day price is not your primary concern."
              tradeoff="$2,500–$5,000/day adds up fast. No priority on the vehicle you want, no relationship with it, no ownership upside."
            />
            <Take
              title="Supercar club"
              good="You want rotating access to many cars, you don't care which specific car, and you don't want to own anything."
              tradeoff="Annual fees rival co-ownership without an ownership stake. You're a customer of the club, not a co-owner."
            />
            <Take
              title="RYDA"
              good="You'd drive ~30–60 days a year on a specific car (1–2 shares is the typical buy). You want real ownership without the operational burden, you're comfortable with a 12-month minimum hold, and you'd rather scale entitlement by adding shares than buying a second car."
              tradeoff="You commit to a specific car for the hold. Transfers are negotiated member-to-member, no guaranteed buyer or price."
              highlight
            />
          </div>
        </div>
      </section>

      {/* Deeper math note */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            The deeper math.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              The headline number on /how-it-works (effective ~$208/day on a
              co-owned Ferrari) is the steady-state ops cost — what you spend
              per driving day in years 2+, after the buy-in is amortized.
              That's roughly $7,080 ÷ 34 days.
            </p>
            <p>
              Year 1 looks different because the buy-in is real cash. $34K
              share + $7,080 ops + $1,500 closing fee = ~$42,580 spent. At
              34 days driven that's ~$1,250 per driving day in Year 1 —
              still roughly half the cost of renting the same Ferrari for
              34 days ($2,400/day × 34 = $81,600). And you exit with a
              transferable share, not receipts.
            </p>
            <p>
              At year 3, assuming you transfer your share at ~80% of buy-in
              (typical for CPO-warranty exotics over a 24–36 month hold),
              the math: $34K buy-in + $7,080 × 3 yr ops = $55,240 spent;
              recover $27,200 at exit; net economic cost ~$28,040 over
              102 driving days = ~<strong>$275 per driving day</strong>.
              That's the apples-to-apples number to use against rental.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
          <CompareCalculator />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            See the cars.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Six vehicles available, more coming online quarterly.
          </p>
          <Link
            href="/markets"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Browse the fleet →
          </Link>
        </div>
      </section>
    </>
  );
}

function Take({
  title,
  good,
  tradeoff,
  highlight,
}: {
  title: string;
  good: string;
  tradeoff: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight ? "border-red bg-red/5" : "border-rule bg-surface"
      }`}
    >
      <p
        className={`font-display text-xl ${
          highlight ? "text-red" : "text-ink"
        }`}
      >
        {title}
      </p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-mute">
        Right for you if
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{good}</p>
      <p className="mt-5 text-xs font-medium uppercase tracking-wider text-mute">
        The trade-off
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{tradeoff}</p>
    </div>
  );
}
