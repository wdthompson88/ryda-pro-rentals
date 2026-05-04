import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StickyToc } from "@/components/sticky-toc";
import { BookingTiersExplainer } from "@/components/booking-tiers-explainer";
import {
  formatUSD,
  HOLDING_YEARS,
  TARGET_DEPRECIATION_PCT,
  HOLDING_MILES_CAP,
} from "@/lib/market-data";

const TOC_ITEMS = [
  { id: "three-step", label: "How it works" },
  { id: "lifecycle", label: "5 steps" },
  { id: "compare", label: "Compare" },
  { id: "right-for-you", label: "Right for you?" },
  { id: "nine-reasons", label: "9 reasons" },
  { id: "booking", label: "Booking model" },
  { id: "trust", label: "Buyer protection" },
  { id: "deeper-math", label: "Deeper math" },
  { id: "rental-opt-in", label: "Rent your days" },
  { id: "faq", label: "FAQ" },
];

export const metadata = {
  title: "How it works — RYDA",
  description:
    "Asset-backed co-ownership of curated certified pre owned supercars. Five steps to a key, side-by-side comparison of RYDA vs solo / rental / club, the 24-month exit doctrine and the optional rental opt-in.",
};

// 4-way comparison anchor numbers, same Ferrari 296 GTB illustration
// used across the site so the doctrine stays consistent.
const STICKER = 340_000;
const CARRYING_REGULAR = 46_000;
const RENTAL_DAILY = 2_400;
const CLUB_ANNUAL = 48_000;
const CLUB_DAYS_INCLUDED = 30;
const RYDA_SHARE_BUYIN = 34_000;
const RYDA_ANNUAL_OPS = 7_080;
const RYDA_DAYS = 32;
const ASSUMED_DRIVE_DAYS = 32;
const ASSUMED_DRIVE_DAYS_2YR = ASSUMED_DRIVE_DAYS * HOLDING_YEARS;
const RESIDUAL_PCT = (100 - TARGET_DEPRECIATION_PCT) / 100;

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
    rental: "—",
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

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            How it works · Asset-backed co-ownership
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Own a piece of the world&apos;s{" "}
            <span className="italic">best cars.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Each car is held in a single-purpose LLC with 10
            shares. Your share is backed by a real, titled vehicle —
            not by a subscription, lease or rental contract. Verified
            members hold two shares or more (2-share minimum per
            person); RYDA is hired as the operations partner.
          </p>
        </div>
      </section>

      <StickyToc items={TOC_ITEMS} />

      {/* Turo-style 3-step explainer, the simple version of the doctrine
          for first-time visitors. The technical 5-step lifecycle below
          is the deep dive; this is the elevator pitch. Big numbers,
          short copy, one icon idea per step. */}
      <section id="three-step" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            How it works
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
            Three steps to a key.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-3">
            <SimpleStep
              n="1"
              icon="search"
              title="Choose"
              body="Browse a curated, certified pre owned fleet. Every car has a documented Pre-Purchase Inspection by the dealer before a single share is sold."
            />
            <SimpleStep
              n="2"
              icon="signature"
              title="Co-own"
              body="Buy your share in a member-managed LLC. Up to 5 verified co-owners per car, with a 2-share minimum per person. RYDA runs operations end-to-end."
            />
            <SimpleStep
              n="3"
              icon="key"
              title="Drive"
              body="Book your time on the RYDA smart calendar. Each share unlocks ~32 days and ~3,200 miles a year. Planned exit at 24 months; transfer earlier after the 12-month minimum hold."
            />
          </div>
          <p className="mt-12 max-w-2xl text-base leading-relaxed text-ink-soft">
            That&apos;s the short version. The technical detail
            (paperwork, exit math, booking rules) lives in the five-step
            lifecycle below.
          </p>
        </div>
      </section>

      {/* 5-step lifecycle */}
      <section id="lifecycle" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Co-ownership
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
            Asset-backed co-ownership in five steps.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            One Ferrari 296 share: $34K up front, ~$7,080/year all-in,
            ~32 days/year, roughly $221/day in steady-state ops.
            Compare with $2,400+/day to rent or $40–80K/yr to own
            outright.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
            <Step n="01" title="Verify" body="Apply and complete identity verification. Valid US license, clean recent driving record, 28 or older. No accreditation required." />
            <Step n="02" title="Choose" body="Browse the curated, certified pre owned fleet. Every car passes a multi-point Pre-Purchase Inspection by the dealer before a single share is sold." />
            <Step n="03" title="Co-own" body="RYDA forms a LLC for up to 5 members to hold the vehicle. You sign the operating agreement and fund your share (2 shares minimum per person)." />
            <Step n="04" title="Drive" body="Book your time on the RYDA smart calendar. Each share unlocks ~32 days and ~3,200 miles a year (100 mi/day)." />
            <Step n="05" title="Exit" body="RYDA sells the car at year 2–3 OR 60,000–75,000 miles depending on certified pre owned program. Proceeds split pro-rata. Need out earlier? Transfer your share to another verified member after the 12-month minimum hold. 3% transfer fee on member-to-member transfers." />
          </div>
        </div>
      </section>

      {/* 4-way comparison, money only */}
      <section id="compare" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Compare · Three are usage rights. Only RYDA is asset-backed.
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Four ways to think about a Ferrari.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
            RYDA is structured co-ownership of a real car. Compared
            against the alternatives, buying outright, renting by the
            day or joining a club, the math comes out the way most
            buyers actually use the asset. Numbers below anchor on the
            Ferrari 296 GTB and a single share over the {HOLDING_YEARS}-year
            planned exit.
          </p>

          <div className="mt-10 overflow-hidden rounded-2xl border border-rule bg-surface">
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Comparison table — scroll horizontally to see all columns"
              tabIndex={0}
            >
              <table className="w-full min-w-[840px] text-sm">
                <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-6 py-5 text-left">&nbsp;</th>
                    <th className="px-6 py-5 text-right text-red">RYDA</th>
                    <th className="px-6 py-5 text-right">Solo ownership</th>
                    <th className="px-6 py-5 text-right">Daily rental</th>
                    <th className="px-6 py-5 text-right">Supercar club</th>
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
                        className={`px-6 py-4 text-right font-display tabular-nums text-base text-ink ${
                          r.emphasis ? "font-medium" : ""
                        }`}
                      >
                        {r.ryda}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-display tabular-nums text-base ${
                          r.emphasis ? "font-medium text-ink" : "text-ink-soft"
                        }`}
                      >
                        {r.regular}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-display tabular-nums text-base ${
                          r.emphasis ? "font-medium text-ink" : "text-ink-soft"
                        }`}
                      >
                        {r.rental}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-display tabular-nums text-base ${
                          r.emphasis ? "font-medium text-ink" : "text-ink-soft"
                        }`}
                      >
                        {r.club}
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
            {" "}{HOLDING_YEARS}-year hold. Multi-share holders scale
            linearly: a 5-share holder pays ~$170K up front + ~$35K/yr
            in ops for ~160 days/yr. Solo-ownership carrying assumes
            industry averages for insurance, storage, maintenance, and
            depreciation reserve (range: $40–80K/yr depending on the
            car). Club figure represents a mid-tier US/UK supercar club
            annual membership; tiers run ~$30K–$80K/yr. Daily rental
            assumes Miami market rate. Resale assumes
            {" "}{TARGET_DEPRECIATION_PCT}% depreciation over the hold for
            both solo ownership and RYDA, applied symmetrically.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Want the math on a specific car?{" "}
            <Link href="/markets" className="font-medium text-red hover:text-red-deep">
              Open any listing
            </Link>{" "}
            to run a calculator anchored to that vehicle, or download a
            printable cost-comparison sheet from the same page.
          </p>
        </div>
      </section>

      {/* When each option makes sense */}
      <section id="right-for-you" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            When each option actually makes sense.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            We&apos;ll be honest about the trade-offs. Different buyers
            want different things.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Take
              title="RYDA"
              good="You'd drive ~32–64 days a year on a specific car (2 shares is the minimum buy). You want real ownership without the operational burden and you'd rather scale entitlement by adding shares than buying a second car."
              tradeoff="You commit to a specific car for the hold. Earlier exits are possible by transferring to another verified member after the 12-month minimum hold; transfer prices are member-to-member."
              highlight
            />
            <Take
              title="RYDA vs solo ownership"
              good="Solo ownership works if you'd drive 60+ days a year, you love the operational responsibility (storage, insurance, maintenance, registration) and you have the capital and tolerance for $40–80K/yr in carrying."
              tradeoff="The asset sits idle 90% of the time. Carrying costs accrue whether you drive or not. Selling takes weeks to months."
            />
            <Take
              title="RYDA vs daily rental"
              good="Daily rental works if you drive once or twice a year, you don't want any commitment and the per-day price is not your primary concern."
              tradeoff="$2,400+/day adds up fast. No priority on the vehicle you want, no relationship with it, no ownership upside."
            />
            <Take
              title="RYDA vs supercar club"
              good="A club works if you want rotating access to many cars, you don't care which specific car and you don't want to own anything."
              tradeoff="Annual fees rival co-ownership without an ownership stake. You're a customer of the club, not a co-owner."
            />
          </div>
        </div>
      </section>

      {/* Why asset-backed co-ownership, 9 reasons */}
      <section id="nine-reasons" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Why asset-backed co-ownership
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Nine reasons it makes more sense than the alternatives.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Reason
              n="01"
              title="A real asset, not a subscription"
              body="You're not buying a usage right or a monthly contract. Each share is a registered legal interest in an LLC that holds title to a specific physical vehicle. Substance, not subscription."
            />
            <Reason
              n="02"
              title="Financial security through tangible ownership"
              body="A car in storage is a real, titled asset. The LLC holds title to the physical vehicle and you own a registered share of the LLC. The asset is real, in a garage, with a VIN you can verify, independent of any platform."
            />
            <Reason
              n="03"
              title="Shared costs, not the full burden"
              body="Insurance, maintenance, tires, detailing, storage and depreciation reserve split across the LLC's 10 shares. Each share carries roughly 10% of what the solo owner of the same car would pay."
            />
            <Reason
              n="04"
              title="Built for travelers and multi-residence owners"
              body="Your car is operated by a professional team and ready when you need it. No worrying about cold-start trickle-chargers, lapsed registration or missed inspection windows while you're abroad."
            />
            <Reason
              n="05"
              title="No hidden costs, all-inclusive packages"
              body="One transparent annual contribution covers insurance, taxes, service, maintenance, tires, detailing, seasonal storage, fleet management and prep. Predictable. No surprise invoices."
            />
            <Reason
              n="06"
              title="Bigger share = more usage time"
              body="1 share ≈ 32 days + 3,200 mi/yr. 5 shares ≈ 160 days. 10 shares ≈ year-round access, effectively solo ownership with professional ops on top. Linear scaling, no premium for size."
            />
            <Reason
              n="07"
              title="Flexible buying & selling of shares"
              body="Member-to-member transfers after the 12-month minimum hold. RYDA handles the paperwork. The LLC's planned exit at year 2 (or 60K miles) gives every shareholder a clean liquidity event by default."
            />
            <Reason
              n="08"
              title="Depreciation risk shared, not solo"
              body="A new Ferrari 296 typically loses $50–60K over the first 18 months. Solo, you eat all of that. With 1 share at 10%, your exposure is $5–6K, and the share-resale at exit cushions even that."
            />
            <Reason
              n="09"
              title="Community over solitary ownership"
              body="Verified members, member events, off-market sourcing, drive-day meetups. The car is a passion asset; the network around it is what makes the asset useful when you're not driving."
            />
          </div>
        </div>
      </section>

      {/* Booking model, Pacaso SmartStay translated to RYDA. Surfaced
          here so prospective buyers see calendar fairness before they
          ever click into the buy flow. */}
      <section id="booking" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Booking model
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Two ways to book, short-notice and planned.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            Same annual entitlement, two clear modes so you always know what
            you can grab and what you have to plan ahead. Calendar
            fairness is enforced by code, not by polite asks.
          </p>
          <div className="mt-10">
            <BookingTiersExplainer variant="full" />
          </div>
        </div>
      </section>

      {/* Trust grid, 6 buyer protections + 6 advantages */}
      <section id="trust" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Buyer protection & further advantages
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Twelve guardrails on the way in and the way out.
          </h2>

          <div className="mt-12">
            <p className="text-xs font-medium uppercase tracking-wider text-mute">
              Buyer protection
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Pillar label="Tested vehicles" body="Certified pre owned + multi-point PPI before any share sells." />
              <Pillar label="Verified members" body="28+, KYC, license & record check before joining." />
              <Pillar label="Encrypted data" body="Member docs & payment info secured in transit and at rest." />
              <Pillar label="Vehicle warranty" body="Manufacturer or independent certified pre owned warranty in force at handover." />
              <Pillar label="Transparent costs" body="Pass-through ops invoiced at cost; service fee disclosed up front." />
              <Pillar label="Flexible share sale" body="Member-to-member transfers after 12 months; LLC sale at year 2 / 60K mi." />
            </div>
          </div>

          <div className="mt-10">
            <p className="text-xs font-medium uppercase tracking-wider text-mute">
              Further advantages
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Pillar label="Several locations" body="Miami first; LA + NYC online by 2027." />
              <Pillar label="Resource conservation" body="Cars get driven instead of garaged 350 days a year." />
              <Pillar label="Fair-use rules" body="Calendar caps consecutive peak-season days so no one corners the car." />
              <Pillar label="Professional storage" body="Climate-controlled, 24/7 monitored, insured partner facilities." />
              <Pillar label="Like-minded community" body="Verified members + member events + off-market access." />
              <Pillar label="Online live booking" body="Reserve days from the app; live availability across the calendar." />
            </div>
          </div>
        </div>
      </section>

      {/* The deeper math, consolidated honest-math + 2-yr exit story */}
      <section id="deeper-math" className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            How to read the price
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            $221/day is operating cost. Net cost is the real number.
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft">
            <p>
              The $221/day figure is steady-state operating cost: $7,080
              of annual ops divided by 32 driving days. It&apos;s what
              every day behind the wheel costs you{" "}
              <span className="italic">while you hold the share</span>,
              ignoring the buy-in.
            </p>
            <p>
              Year 1 includes the buy-in as real cash. $34K share +
              $7,080 ops = $41,080 spent (the table number above; a
              one-time $1,500 closing fee is added at signing). At 32
              days driven that&apos;s ~$1,284 per driving day in Year 1,
              still below the cost of renting the same Ferrari for
              the same 32 days ($2,400/day × 32 = $76,800). And you
              exit with a transferable share, not a stack of receipts.
            </p>
            <p>
              The bigger number is net cost over the full hold.
              RYDA&apos;s doctrine is a 2-year planned exit (or
              {" "}{(HOLDING_MILES_CAP / 1000).toFixed(0)}K-mile cap,
              whichever comes first): each curated certified pre owned car is held for
              ~2 years, then the LLC sells it and proceeds are
              distributed pro-rata. We model {TARGET_DEPRECIATION_PCT}%
              depreciation over the hold, a conservative middle that
              absorbs both the drive-only and rental-opt-in usage
              profiles, given the 100 mi/day shareholder allowance.
            </p>
            <p>
              Illustrative numbers below model a single share for
              clarity. Most members hold the 2-share minimum, so double
              every line: $68K buy-in, ~$14,160/yr carrying, ~$96,320
              spent over 2 years, ~$61,200 resale, net ~$35,120 for
              ~128 driving days, ~$274 per actual driving day, the same
              effective rate at any share count.
            </p>
            <p>
              For the F296 at one share over 2 years: $34K buy-in +
              $7,080 × 2 carrying = $48,160 spent. Resale at 90% of
              buy-in returns ~$30,600.{" "}
              <strong>Net cost ~$17,560</strong> for 64 driving days ={" "}
              <strong>~$274 per actual driving day</strong>. That&apos;s
              the apples-to-apples number to use against rental
              ($2,400/day × 64 = $153,600). You also exit with cash
              from the sale, not a stack of receipts.
            </p>
          </div>
          <Link
            href="/markets"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
          >
            Run the math on a specific car →
          </Link>
        </div>
      </section>

      {/* Rental opt-in for shareholders */}
      <section id="rental-opt-in" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Optional · Rental opt-in
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Don&apos;t want to drive every day you&apos;re entitled to? Rent
            it out.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft">
            Miami&apos;s exotic-rental fleets average 200–240 booked days a
            year on full-control calendars. RYDA&apos;s pool is the leftover
            days after members book first, so realistic occupancy on the
            pool runs lower (~50%). Shareholders can opt their unused
            entitlement into the rental pool, we handle the bookings,
            insurance, condition checks and damage reserve. Revenue splits
            65/35 (you / RYDA), distributed pro-rata across the days each
            share contributes.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Worked example · Ferrari 296
              </p>
              <p className="mt-3 font-display text-xl text-ink">
                Drive 12 days/yr. Rent the rest.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Owners reserve 12 days each (120 total). 200 days enter the
                pool. At 50% occupancy = ~100 booked days @ $2,400/day =
                $240,000/yr gross. After RYDA&apos;s 35% management fee,
                shareholders split ~$156,000.{" "}
                <span className="font-medium text-ink">~$15,600/share/yr</span>,
                roughly 2.2× your $7,080/yr carrying cost.
              </p>
            </div>
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                What we cover
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                <li>· Listing on /rent + booking management</li>
                <li>· Renter screening (28+, clean record, RYDA verified)</li>
                <li>· Pre/post inspection, photos, fueling, detailing</li>
                <li>· Insurance riders + agreed-value damage policy</li>
                <li>· Damage reserve held at LLC level</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Honest tradeoffs
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                <li>· Same {TARGET_DEPRECIATION_PCT}% depreciation assumption applies, our flat-rate model already absorbs the heavier rental-pool wear.</li>
                <li>· Rental days are pooled across all shares, no individual day-of priority guaranteed.</li>
                <li>· Members keep first-call on owner-priority weeks. Renters fill the gaps.</li>
                <li>· Track-day cars come out of the pool when you take them on track.</li>
              </ul>
            </div>
          </div>

          <Link
            href="/markets"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream hover:bg-red-deep"
          >
            Toggle rental income on a specific car →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Frequently asked questions.
          </h2>
          <div className="mt-10 space-y-6">
            <Faq
              q="Are RYDA co-ownership stakes securities?"
              a="No. RYDA is a luxury access platform, not an investment platform. Each car is held in a member-managed LLC where you and your co-owners hold authority over material decisions; RYDA is hired as a service provider via a separate Management Services Agreement. Co-ownership stakes are not registered securities and are not offered for investment purposes."
            />
            <Faq
              q="Can I transfer my share whenever I want?"
              a="After a 12-month minimum hold, yes, to another verified RYDA member. RYDA handles the LLC paperwork. Settlement takes 1–3 business days. RYDA charges a 3% transfer fee on the sale price."
            />
            <Faq
              q="Can I rent out my share days for income?"
              a={`Yes, opting into RYDA's rental pool is voluntary, share-by-share. We list the car on /rent, handle bookings, insurance, screening and condition checks. Rental revenue splits 65/35 (you / RYDA) and is distributed pro-rata across the days each share contributes. The pool is whatever days members don't reserve, so realistic pool occupancy is ~50% (full-control fleets clock 60–70%). On that basis, a single Ferrari 296 share can offset ~$15–18K/yr of carrying, typically 2–2.5× your annual ops cost, sometimes enough to bring your two-year net cost down close to zero or below. Same flat ${TARGET_DEPRECIATION_PCT}% depreciation assumption applies in both scenarios. Co-ownership shares are member-managed LLC interests, not securities; rental is a usage offset, not an investment yield.`}
            />
            <Faq
              q="What if a co-owner stops paying?"
              a="The vehicle LLC has remedies in the Operating Agreement, including forced transfer of the delinquent share. RYDA also keeps a maintenance reserve at the LLC level so vehicle ops continue uninterrupted while it's resolved."
            />
            <Faq
              q="Where are the cars stored?"
              a="In RYDA-vetted partner storage facilities, climate-controlled, 24/7 monitored, insured. Miami first, with LA and NY following in 2027."
            />
            <Faq
              q="What's covered by insurance?"
              a="Each vehicle carries a fleet policy with $1M+ third-party liability and agreed-value physical damage. Co-owners are named insureds. Damage during sanctioned-track-event use is excluded by the standard policy."
            />
            <Faq
              q="Can I bring a friend in the car?"
              a="Yes. Approved additional drivers (28+, clean license, RYDA-verified) can drive too. Passengers are unrestricted."
            />
            <Faq
              q="Why is membership only 28+?"
              a="Underwriting reality. Insurance carriers price exotic-car policies aggressively for younger drivers. The 28+ minimum keeps premiums manageable and matches the underwriting norm for collector and exotic policies."
            />
            <Faq
              q="Is there a membership fee?"
              a="Three tiers. RYDA Core is free. RYDA Blue is $500/year. RYDA Black is $1,500/year, priority booking during peak season, included white-glove delivery, dedicated dedicated contact. First-100 lock in $350/$1,000 for life."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-red">{n}</p>
      <p className="mt-2 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

// Bigger sibling of Step, used in the Turo-style 3-step explainer
// at the top of the page. Larger numerals, a small line-art icon, more
// whitespace, fewer words per step. The technical 5-step lifecycle
// still uses Step.
type StepIcon = "search" | "signature" | "key";

function SimpleStep({
  n,
  title,
  body,
  icon,
}: {
  n: string;
  title: string;
  body: string;
  icon: StepIcon;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-5">
        <p className="font-display text-6xl font-light leading-none text-red sm:text-7xl">
          {n}
        </p>
        <span className="text-ink/40" aria-hidden>
          <StepGlyph kind={icon} />
        </span>
      </div>
      <p className="mt-5 font-display text-2xl text-ink">{title}</p>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

// Tiny line-art glyphs for the 3-step explainer. Stroked in
// currentColor so they tint with whatever wraps them. Designed to feel
// like a hand-drawn marginalia mark, not a UI button.
function StepGlyph({ kind }: { kind: StepIcon }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 28 28",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "search") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="23" y2="23" />
      </svg>
    );
  }
  if (kind === "signature") {
    return (
      <svg {...common} aria-hidden>
        <path d="M3 21c2-1 4-7 6-7s2 4 4 4 3-9 5-9 2 6 4 6 3-2 3-2" />
        <line x1="3" y1="25" x2="25" y2="25" />
      </svg>
    );
  }
  // key
  return (
    <svg {...common} aria-hidden>
      <circle cx="9" cy="14" r="4.5" />
      <line x1="13.5" y1="14" x2="25" y2="14" />
      <line x1="20" y1="14" x2="20" y2="18" />
      <line x1="24" y1="14" x2="24" y2="17" />
    </svg>
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

function Reason({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-2xl text-red">{n}</p>
      <p className="mt-2 font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Pillar({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-red">
        {label}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-2xl border border-rule bg-surface p-6 open:bg-cream-2/40">
      <summary className="cursor-pointer text-base font-medium text-ink">
        {q}
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{a}</p>
    </details>
  );
}
