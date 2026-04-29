import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CompareCalculator } from "@/components/compare-calculator";
import {
  formatUSD,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
} from "@/lib/market-data";

export const metadata = {
  title: "Compare — RYDA",
  description:
    "Honest math: RYDA co-ownership vs regular ownership vs daily rental vs supercar club. Side-by-side, money only.",
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
const RYDA_DAYS = 30;

const ASSUMED_DRIVE_DAYS = 30;
const ASSUMED_DRIVE_DAYS_2YR = ASSUMED_DRIVE_DAYS * HOLDING_YEARS; // 60

// 2-year math (10% depreciation across the board, matching site doctrine)
const RESIDUAL_PCT = (100 - TARGET_DEPRECIATION_PCT) / 100; // 0.90

const REGULAR_TOTAL_2YR = STICKER + CARRYING_REGULAR * HOLDING_YEARS;
const REGULAR_RESALE = Math.round(STICKER * RESIDUAL_PCT);
const REGULAR_NET_2YR = REGULAR_TOTAL_2YR - REGULAR_RESALE;

const RYDA_TOTAL_2YR =
  RYDA_SHARE_BUYIN + RYDA_ANNUAL_OPS * HOLDING_YEARS;
const RYDA_RESALE = Math.round(RYDA_SHARE_BUYIN * RESIDUAL_PCT);
const RYDA_NET_2YR = RYDA_TOTAL_2YR - RYDA_RESALE;

const RENTAL_TOTAL_2YR = RENTAL_DAILY * ASSUMED_DRIVE_DAYS_2YR;
const CLUB_TOTAL_2YR = CLUB_ANNUAL * HOLDING_YEARS;
const CLUB_DAYS_2YR = CLUB_DAYS_INCLUDED * HOLDING_YEARS;

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
    label: `Year 1 spend (${ASSUMED_DRIVE_DAYS} days driven)`,
    regular: formatUSD(STICKER + CARRYING_REGULAR),
    rental: formatUSD(RENTAL_DAILY * ASSUMED_DRIVE_DAYS),
    club: formatUSD(CLUB_ANNUAL),
    ryda: formatUSD(RYDA_SHARE_BUYIN + RYDA_ANNUAL_OPS),
    emphasis: true,
  },
  {
    label: "Effective $/day, year 1",
    regular: formatUSD(
      Math.round((STICKER + CARRYING_REGULAR) / ASSUMED_DRIVE_DAYS),
    ),
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
    label: `Total cash, ${HOLDING_YEARS}-yr hold (${ASSUMED_DRIVE_DAYS_2YR} days driven)`,
    regular: formatUSD(REGULAR_TOTAL_2YR),
    rental: formatUSD(RENTAL_TOTAL_2YR),
    club: formatUSD(CLUB_TOTAL_2YR),
    ryda: formatUSD(RYDA_TOTAL_2YR),
  },
  {
    label: `Recover at exit (${100 - TARGET_DEPRECIATION_PCT}% resale)`,
    regular: `+ ${formatUSD(REGULAR_RESALE)}`,
    rental: "—",
    club: "—",
    ryda: `+ ${formatUSD(RYDA_RESALE)}`,
  },
  {
    label: `Net cost over ${HOLDING_YEARS} years`,
    regular: formatUSD(REGULAR_NET_2YR),
    rental: formatUSD(RENTAL_TOTAL_2YR),
    club: formatUSD(CLUB_TOTAL_2YR),
    ryda: formatUSD(RYDA_NET_2YR),
    emphasis: true,
  },
  {
    label: `Effective $/day after exit (over ${ASSUMED_DRIVE_DAYS_2YR} days)`,
    regular: formatUSD(Math.round(REGULAR_NET_2YR / ASSUMED_DRIVE_DAYS_2YR)),
    rental: formatUSD(RENTAL_DAILY),
    club: formatUSD(Math.round(CLUB_TOTAL_2YR / CLUB_DAYS_2YR)),
    ryda: formatUSD(Math.round(RYDA_NET_2YR / ASSUMED_DRIVE_DAYS_2YR)),
    emphasis: true,
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
            exotic: buy outright, rent by the day, or join a club. RYDA is
            a fourth — structured co-ownership of a real car. The math
            below anchors on the Ferrari 296 GTB and a single share (~30
            days a year). RYDA holds each curated CPO car for 2 years,
            then sells and distributes proceeds — that's why we track the
            2-year net cost, not just the headline annual spend.
          </p>
        </div>
      </section>

      {/* Comparison table — money only */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-6 py-5 text-left">&nbsp;</th>
                    <th className="px-6 py-5 text-right">Solo ownership</th>
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
                            ? "font-display text-base text-red"
                            : "text-ink"
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
            sticker, modeled around a single co-ownership share over a
            2-year hold. Multi-share holders scale linearly: a 5-share
            holder pays ~$170K up front + ~$35K/yr in ops for ~150 days/yr.
            Solo-ownership carrying assumes industry averages for
            insurance, storage, maintenance, and depreciation reserve
            (range: $40–80K/yr depending on the car). Club figure
            represents a mid-tier US/UK supercar club annual membership;
            tiers run ~$30K–$80K/yr. Daily rental assumes Miami market
            rate for a base 296 GTB. Resale assumes 10% depreciation over
            the 2-year hold for both solo ownership and RYDA — applied
            symmetrically so the comparison stays fair.
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
              title="Solo ownership"
              good="You'd drive 60+ days a year, you love the operational responsibility (storage, insurance, maintenance, registration), and you have the capital and tolerance for $40–80K/yr in carrying."
              tradeoff="The asset sits idle 90% of the time. Carrying costs accrue whether you drive or not. Selling takes weeks to months."
            />
            <Take
              title="Daily rental"
              good="You drive once or twice a year, you don't want any commitment, and the per-day price is not your primary concern."
              tradeoff="$2,400+/day adds up fast. No priority on the vehicle you want, no relationship with it, no ownership upside."
            />
            <Take
              title="Supercar club"
              good="You want rotating access to many cars, you don't care which specific car, and you don't want to own anything."
              tradeoff="Annual fees rival co-ownership without an ownership stake. You're a customer of the club, not a co-owner."
            />
            <Take
              title="RYDA"
              good="You'd drive ~30–60 days a year on a specific car (1–2 shares is the typical buy). You want real ownership without the operational burden, you're comfortable with the 2-year planned exit, and you'd rather scale entitlement by adding shares than buying a second car."
              tradeoff="You commit to a specific car for the hold. Earlier exits are possible by transferring to another verified member after the 12-month minimum hold; transfer prices are member-to-member."
              highlight
            />
          </div>
        </div>
      </section>

      {/* Deeper math — anchored on 2-yr exit doctrine */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            The deeper math.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              The headline number on /how-it-works (~$236/day in
              steady-state ops on a co-owned Ferrari) is the operating
              cost — what you spend per driving day{" "}
              <span className="italic">while you hold the share</span>,
              ignoring the buy-in. That's roughly $7,080 ÷ 30 days.
            </p>
            <p>
              Year 1 includes the buy-in as real cash. $34K share +
              $7,080 ops = $41,080 spent (the table number; a one-time
              $1,500 closing fee is added at signing). At 30 days
              driven that's ~$1,369 per driving day in Year 1 — still
              below the cost of renting the same Ferrari for the same 30
              days ($2,400/day × 30 = $72,000). And you exit with a
              transferable share, not a stack of receipts.
            </p>
            <p>
              At the 2-year planned exit (RYDA's doctrinal hold): $34K
              buy-in + $7,080 × 2 ops = $48,160 spent. The LLC sells the
              car at a modeled 10% depreciation = $30,600 returned per
              share. Net cost ~$17,560 over 60 driving days ={" "}
              <strong>~$293 per driving day</strong>. That's the
              apples-to-apples number to use against rental.
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
