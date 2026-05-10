import type { Metadata } from "next";
import {
  BoatRow as Row,
  HowItWorksCta,
  HowItWorksPageTemplate,
  Pillar,
  Reason,
  Stance,
  Stat,
  Step,
} from "@/components/shared/how-it-works-page";
import { HOW_IT_WORKS_STEPS, FAQ_ITEMS } from "@/lib/boat-content";
import { BOATS_HOLDING_YEARS, BOATS_TARGET_DEPRECIATION_PCT } from "@/lib/boat-data";

export const metadata: Metadata = {
  title: "How it works — Boats",
  description:
    "Member-managed LLC, up to 5 co-owners per hull, three-year planned exit, charter opt-in to offset ops. Compare to solo ownership, peer-to-peer charter, and yacht clubs.",
};

export default function BoatsHowItWorks() {
  return (
    <HowItWorksPageTemplate
      accent="marine"
      hero={{
        eyebrow: "How it works · Boat co-ownership",
        title: <>Member-managed LLC. <span className="italic">Same doctrine as cars, different ops.</span></>,
        body: (
          <>
            Each boat is held in a single-purpose LLC with 10 shares split across 1–5 verified co-owners (2-share
            minimum per person). RYDA runs operations (captain, dockage, insurance, hurricane prep, charter opt-in)
            under a separate Management Services Agreement. Boats hold for {BOATS_HOLDING_YEARS} years on a different
            depreciation curve than the cars side.
          </>
        ),
      }}
    >

      {/* 5 steps */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Lifecycle
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            From application to your first run.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div key={s.n}>
                <p className="font-display text-sm text-marine">{s.n}</p>
                <p className="mt-3 font-display text-xl text-ink">{s.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Exit / disposition deep-dive — boats variant. Same structure
          as the cars page (Default · Planned exit / Alternate · Early
          transfer) but boats-specific copy: 36-month hold, hull
          instead of car, USCG documentation transfer, charter income
          truth-up at exit, dock-fee proration. Marine accent
          throughout to match the boats vertical. */}
      <section id="exit" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Exit doctrine
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
            How you exit, in detail.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Two paths — a planned exit at month{" "}
            {BOATS_HOLDING_YEARS * 12} that the LLC reaches by default,
            and an earlier member-to-member transfer once the 12-month
            minimum hold has cleared. Neither path uses a marketplace,
            an order book, or a public price ticker.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
            {/* Planned exit — default path, marine accent, slightly
                deeper for the "default" emphasis */}
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="rounded-full border border-marine/40 bg-marine/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-marine">
                  Default · Planned exit
                </span>
                <span className="text-[10px] uppercase tracking-wider text-mute">
                  Month {BOATS_HOLDING_YEARS * 12} or condition trigger
                </span>
              </div>
              <p className="mt-4 text-sm text-ink-soft">
                Every LLC reaches its planned exit at the{" "}
                {BOATS_HOLDING_YEARS}-year mark, or earlier if the
                hull surveys below the resale threshold. Members vote
                75% supermajority to confirm the sale; charter and
                cruise income are reconciled into the final
                distribution.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2">
                <Step
                  n="01"
                  accent="marine"
                  title="Trigger"
                  body={`The LLC's operating agreement names a planned exit at the ${BOATS_HOLDING_YEARS}-yr mark. RYDA notifies members 90 days ahead and books an out-of-water condition survey.`}
                />
                <Step
                  n="02"
                  accent="marine"
                  title="Survey + qualification"
                  body="Independent marine surveyor + three broker comparables (yard-direct, brokerage-listing, auction). Any unsolicited offer is certified with proof of funds, written terms, escrow, and comp memo BEFORE the vote opens. Charter operations pause 30 days pre-survey to clean the bilge for inspection."
                />
                <Step
                  n="03"
                  accent="marine"
                  title="Member vote"
                  body="75% supermajority of membership interests confirms (per the OA). 14-day vote window. A 5%+ competing qualified offer pauses the vote and resets it around the higher bid. Member-Council reviews any minority objection on terms or buyer."
                />
                <Step
                  n="04"
                  accent="marine"
                  title="Sale + USCG transfer"
                  body="RYDA's marine title-and-escrow partner closes. Coast Guard documentation transfers to the buyer; dock fees, captain payroll, and insurance prorate to the closing date."
                />
                <Step
                  n="05"
                  accent="marine"
                  title="Distribution"
                  body={`Proceeds (less ~${BOATS_TARGET_DEPRECIATION_PCT}% modeled depreciation, closing fees, and any unsettled charter receivables) distribute pro-rata to each member's RYDA wallet within 14 days. K-1 issued at year-end.`}
                />
              </div>
            </div>

            {/* Alternate · Early transfer — slightly different from
                cars: boats need USCG documentation update on every
                transfer, not just sale. */}
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="rounded-full border border-rule bg-surface px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-soft">
                  Alternate · Early transfer
                </span>
                <span className="text-[10px] uppercase tracking-wider text-mute">
                  After 12-mo hold
                </span>
              </div>
              <p className="mt-4 text-sm text-ink-soft">
                Need out before the planned exit? Once your 12-month
                minimum hold clears, transfer your share directly to
                another verified RYDA member. RYDA handles the LLC
                paperwork plus the USCG documentation update. No
                marketplace, no order book, no auction.
              </p>
              {/* Audit T1.4 fix — every Step on the boats page uses
                  accent="marine" to match the vertical's brand color.
                  Differentiation between Default and Alternate paths
                  is carried by the column badges + the alternate's
                  unfilled "border-rule bg-surface" treatment. */}
              <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2">
                <Step
                  n="01"
                  accent="marine"
                  title="Hold clears"
                  body="Your minimum 12-month hold from the date you joined the LLC. Capital must be in the LLC long enough that the IRS doesn't reclassify the structure."
                />
                <Step
                  n="02"
                  accent="marine"
                  title="Signal intent"
                  body="From your dashboard, mark your share for transfer. RYDA shares it with verified prospects on the matched waitlist (KYC complete, captaining experience or willing to use our captain pool)."
                />
                <Step
                  n="03"
                  accent="marine"
                  title="Direct negotiation"
                  body="You and the buyer agree on a price between yourselves. Transfer prices are private; RYDA does not publish a price ticker. RYDA can share comps from prior LLCs on request."
                />
                <Step
                  n="04"
                  accent="marine"
                  title="LLC + USCG paperwork"
                  body="RYDA drafts the membership-interest assignment, updates the LLC member register, and refiles the USCG Certificate of Documentation. Existing co-owners ratify per the OA's 75% supermajority."
                />
                <Step
                  n="05"
                  accent="marine"
                  title="Settlement"
                  body="Funds settle through marine escrow within 3–5 business days (USCG documentation update is the gate). RYDA charges a 3% transfer fee on completed transfers."
                />
              </div>
            </div>
          </div>

          {/* Doctrine reaffirmation — boats variant */}
          <div className="mt-14 grid grid-cols-1 gap-6 rounded-2xl border border-rule bg-cream-2/40 p-6 sm:grid-cols-3 sm:p-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-marine">
                Members vote
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Every disposition (planned or otherwise) goes through
                a 75% supermajority of membership interests, written
                into the Operating Agreement.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-marine">
                No public market
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                RYDA does not run an exchange, alternative trading
                system, or order book. Co-ownership stakes are not
                registered securities.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-marine">
                K-1, not 1099-B
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                The LLC issues a K-1, not a 1099-B. Charter income is
                separately reported. Speak with your tax advisor;
                treatment depends on your overall return.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The numbers */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            The numbers, exactly
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Every share, in five numbers.
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Co-owners" value="1–5" />
            <Stat label="Allotted annual days per share" value="32" />
            <Stat label="Nautical miles / share / yr" value="1,600" />
            <Stat label="Planned exit" value={`${BOATS_HOLDING_YEARS * 12} mo`} />
            <Stat label="Modeled depreciation" value={`${BOATS_TARGET_DEPRECIATION_PCT}%`} />
          </div>
        </div>
      </section>

      {/* 4-way comparison */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Compare four paths
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            RYDA, solo, charter, yacht club.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            Same time on the water, four different cost stacks. Boats
            depreciate, dock, and dry-out, the path you pick decides
            who carries those line items.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-rule bg-surface">
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Path comparison table — scroll horizontally to see all columns"
              tabIndex={0}
            >
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-rule bg-cream-2">
                  <tr>
                    <th className="px-6 py-5 text-left text-xs uppercase tracking-wider text-mute">
                      Concern
                    </th>
                    <th className="px-6 py-5 text-center bg-marine/5">
                      <p className="text-xs uppercase tracking-wider text-marine">
                        RYDA Boats
                      </p>
                    </th>
                    <th className="px-6 py-5 text-center text-xs uppercase tracking-wider text-mute">
                      Solo own
                    </th>
                    <th className="px-6 py-5 text-center text-xs uppercase tracking-wider text-mute">
                      P2P charter (Boatsetter)
                    </th>
                    <th className="px-6 py-5 text-center text-xs uppercase tracking-wider text-mute">
                      Yacht club
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label="Asset on your balance sheet"
                    a="Yes, full hull"
                    b="No"
                    c="No"
                    d="Yes, your share of an LLC"
                    emphasis
                  />
                  <Row
                    label="Annual carry"
                    a="$280–350K all-in"
                    b="$0 (pay per outing)"
                    c="$15–35K dues + per-trip"
                    d="~$25–35K per share (varies by hull)"
                  />
                  <Row
                    label="Captain on board"
                    a="Hire your own"
                    b="Sometimes (skipper varies)"
                    c="Club captains, limited"
                    d="Crewed by default; bareboat by exception"
                    emphasis
                  />
                  <Row
                    label="Hurricane prep + storage"
                    a="You arrange"
                    b="N/A"
                    c="Limited"
                    d="Included, haul, store, re-launch"
                  />
                  <Row
                    label="Insurance + survey"
                    a="You source"
                    b="Owner's policy"
                    c="Club policy"
                    d="LLC-named, marine-grade, agreed-value"
                  />
                  <Row
                    label="Days / nights you can take"
                    a="Unlimited"
                    b="Per-trip"
                    c="Reservation-gated"
                    d="32 days/yr per share, with charter opt-in"
                  />
                  <Row
                    label="Exit"
                    a="Sell privately, broker, or dock-bait"
                    b="N/A"
                    c="Refundable initiation (limited)"
                    d="3-yr planned LLC exit + 12-mo transfer market"
                    emphasis
                  />
                  <Row
                    label="Inventory quality"
                    a="Yours"
                    b="Variable"
                    c="Mid-tier mostly"
                    d="Wajer, Pershing, Riva, Lagoon"
                  />
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 text-xs text-mute">
            Solo carry sourced from US BoatUS owner-cost surveys (~3% of
            hull value/yr at this tier, plus capex on engines + hurricane).
            Yacht club ranges from member surveys 2023-2024.
          </p>
        </div>
      </section>

      {/* "Right for you" decision matrix */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Is this right for you?
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Pick your stance.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Stance
              title="You'd buy a Wajer outright if you used it 60+ days/yr"
              detail="Solo ownership wins on flexibility and depreciation timing. RYDA isn't your fit, we'd actually push you to a broker."
              fit="not-us"
            />
            <Stance
              title="You charter 4–8 weekends a year and want a real upgrade in inventory"
              detail="A share fits cleanly. 32 days/yr × your share, plus charter opt-in revenue when you're not on board."
              fit="great"
            />
            <Stance
              title="You can't tell whether to buy or charter"
              detail="Start with charter (Core membership). Move into a share when you've used the same hull twice in a season."
              fit="good"
            />
            <Stance
              title="You want zero ops responsibility and a captain every time"
              detail="Black tier with a Wajer or Pershing share. Captain hours bank. No chart-reading required."
              fit="great"
            />
          </div>
        </div>
      </section>

      {/* 9 reasons */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Why fractional now
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Nine reasons co-ownership is a better contract for boats.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Reason
              accent="marine"
              card={false}
              n="01"
              title="Marine ops are the cost"
              body="The hull is half the cost of ownership. Slip, captain, insurance, hurricane prep, surveys, and depreciation are the other half. Splitting ten ways turns a $300K/yr drag into a $30K/yr line item."
            />
            <Reason
              accent="marine"
              card={false}
              n="02"
              title="You don't actually want to skipper"
              body="Most owners on this tier don't pilot Wajers themselves. Captain-included is the default; you save the operator's license question for a Riva."
            />
            <Reason
              accent="marine"
              card={false}
              n="03"
              title="Charter opt-in offsets carry"
              body="Days you don't use go into the charter pool (member-priced). Owners typically recapture 25–40% of annual ops via opt-in. Documented in the cost sheet on every listing."
            />
            <Reason
              accent="marine"
              card={false}
              n="04"
              title="Hurricane risk is a structural carry"
              body="Insurance, haul, indoor storage, post-season re-launch. RYDA pre-negotiates with marina partners; the cost is in the share economics, not surprise invoices."
            />
            <Reason
              accent="marine"
              card={false}
              n="05"
              title="Surveys are real, not theater"
              body="SAMS-accredited survey at acquisition + annual condition surveys. Members see redacted reports in the LLC document vault. No more dock-tour due diligence."
            />
            <Reason
              accent="marine"
              card={false}
              n="06"
              title="3-year planned exit"
              body="Member vote at year 3 to sell, refit, or roll. Modeled 15% depreciation over the period, generous vs the actual flat-to-+5% Wajers and Rivas have shown 2018–2024."
            />
            <Reason
              accent="marine"
              card={false}
              n="07"
              title="LLC structure beats club membership"
              body="Yacht club initiations are mostly non-refundable. RYDA shares are real ownership: you're a member of a single-purpose LLC that owns the hull. Sell the share, not your seat."
            />
            <Reason
              accent="marine"
              card={false}
              n="08"
              title="Cross-vertical access"
              body="One RYDA membership covers both boats and cars, Boats members can charter cars and car members can charter boats, subject to availability and tier."
            />
            <Reason
              accent="marine"
              card={false}
              n="09"
              title="Service-grade ops"
              body="Provisioning, slip reservations, captain dispatch, charter scheduling, hurricane prep, all single-vendor. Black tier gets dedicated marine account contact."
            />
          </div>
        </div>
      </section>

      {/* Charter opt-in worked example */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Charter opt-in math
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            How charter opt-in offsets your ops carry.
          </h2>
          <p className="mt-4 max-w-2xl text-base text-ink-soft">
            A worked example on a Pershing 6X share. Numbers are
            conservative, most members earn more on a Wajer (lower ops,
            higher day rate) and less on a Lagoon (higher ops, family
            charter rate).
          </p>

          <div className="mt-10 rounded-2xl border border-rule bg-surface p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-mute">
                  Your share assumptions
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                  <li>· 1 share of 10 in a Pershing 6X LLC</li>
                  <li>· 32 days/yr personal use</li>
                  <li>· Annual ops + reserves: ~$32,000 per share</li>
                  <li>· You opt 8 of your 32 days into the charter pool</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-mute">
                  Charter pool result
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                  <li>· 8 days × ~$8,500 charter day rate (Miami avg)</li>
                  <li>· − 30% RYDA ops fee (captain, fuel, insurance) on charter days</li>
                  <li>
                    · ≈ <span className="font-medium text-ink">$47,600</span> gross to your share
                  </li>
                  <li>
                    · Net effect: ops carry <span className="font-medium text-ink">covered</span>,
                    plus a mid-five-figure cushion
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-6 border-t border-rule pt-5 text-xs text-mute">
              Day rates vary by hull, season, and bookings volume. Charter
              opt-in is a per-trip choice, not a commitment. Not a
              guaranteed return, Q3 hurricane months pay less, Memorial-
              to-Labor pays more. Members see the live booking calendar.
            </p>
          </div>
        </div>
      </section>

      {/* Trust pillars */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            What makes the structure defensible
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Twelve trust pillars.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            <Pillar accent="marine" card={false} label="Member-managed LLC" body="Members vote on material decisions; not passive. established LLC case law is the gold standard for LLC governance." />
            <Pillar accent="marine" card={false} label="Separate Management Services Agreement" body="RYDA is a hired service provider, not the asset owner. Members can fire RYDA and hire someone else." />
            <Pillar accent="marine" card={false} label="Single-purpose LLC per hull" body="No cross-collateralization. Your Pershing 6X share isn't liable for someone else's Lagoon LLC." />
            <Pillar accent="marine" card={false} label="USCG documentation + state title" body="Clean chain of custody. Documents in the LLC vault." />
            <Pillar accent="marine" card={false} label="SAMS marine survey at acquisition" body="Independent surveyor names every defect with photos. Redacted version visible to members." />
            <Pillar accent="marine" card={false} label="Marine-grade insurance, agreed-value" body="LLC named insured, members named additional. Hagerty Marine / CHUBB / Travelers per hull." />
            <Pillar accent="marine" card={false} label="Hurricane plan codified at acquisition" body="Pre-arranged haul, indoor storage, post-storm re-launch. Costs known, not surprise-invoiced." />
            <Pillar accent="marine" card={false} label="Captain employment agreements" body="Captains employed via the LLC, not RYDA. Members see employment terms." />
            <Pillar accent="marine" card={false} label="Charter opt-in agreement" body="Per-day, per-trip, nothing automatic. Members revoke any time." />
            <Pillar accent="marine" card={false} label="Verified members only" body="28+, KYC, ID + credit + (skipper-license check if bareboat)." />
            <Pillar accent="marine" card={false} label="3-yr planned exit + 12-mo transfer market" body="Built-in liquidity. No 'forever' lock-in like club initiations." />
            <Pillar accent="marine" card={false} label="Open-book reserve account" body="Replacement engines, electronics, sail wardrobe. Audited annually, balance visible to members." />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            The boat-side questions members ask first.
          </h2>
          <ul className="mt-12 space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <li
                key={i}
                className="rounded-2xl border border-rule bg-surface p-6"
              >
                <p className="font-display text-lg text-ink">{item.q}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <HowItWorksCta
        accent="marine"
        title="See if a RYDA Boat share fits."
        body="Schedule a 30-minute call. Real conversation, real numbers, no commitment."
        links={[
          { href: "/boats/portfolio", label: "See the fleet →" },
          { href: "/contact?type=Membership&note=RYDA+Boats+how-it-works#form", label: "Schedule a call", variant: "secondary" },
        ]}
      />
    </HowItWorksPageTemplate>
  );
}
