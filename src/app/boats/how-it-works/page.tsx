import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HOW_IT_WORKS_STEPS, FAQ_ITEMS } from "@/lib/boat-content";
import { BOATS_HOLDING_YEARS, BOATS_TARGET_DEPRECIATION_PCT } from "@/lib/boat-data";

export const metadata: Metadata = {
  title: "How RYDA Boats works",
  description:
    "Member-managed Delaware LLC, ten co-owners per hull, three-year planned exit, charter opt-in to offset ops. Compare to solo ownership, peer-to-peer charter, and yacht clubs.",
};

export default function BoatsHowItWorks() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            How it works · Boat co-ownership
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Member-managed Delaware LLC.{" "}
            <span className="italic">Same doctrine as cars, different ops.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft">
            Each boat is held in a single-purpose Delaware LLC. Up to 10
            verified members co-own every hull. RYDA runs operations
            (captain, dockage, insurance, hurricane prep, charter
            opt-in) under a separate Management Services Agreement.
            Boats hold for {BOATS_HOLDING_YEARS} years (vs cars at 2) —
            different depreciation curve, same structure.
          </p>
        </div>
      </section>

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

      {/* The numbers */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            The numbers, exactly
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Every share, in six numbers.
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Co-owners per hull" value="10" />
            <Stat label="Days / share / yr" value="30" />
            <Stat label="Nautical miles / share / yr" value="1,500" />
            <Stat label="Planned exit" value={`${BOATS_HOLDING_YEARS} yrs`} />
            <Stat label="Modeled depreciation" value={`${BOATS_TARGET_DEPRECIATION_PCT}%`} />
            <Stat label="Transfer min hold" value="12 mo" />
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
            Solo, charter, yacht club, RYDA.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            Same time on the water, four different cost stacks. Boats
            depreciate, dock, and dry-out — the path you pick decides
            who carries those line items.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-rule bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-rule bg-cream-2">
                  <tr>
                    <th className="px-6 py-5 text-left text-xs uppercase tracking-wider text-mute">
                      Concern
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
                    <th className="px-6 py-5 text-center bg-marine/5">
                      <p className="text-xs uppercase tracking-wider text-marine">
                        RYDA Boats
                      </p>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label="Asset on your balance sheet"
                    a="Yes — full hull"
                    b="No"
                    c="No"
                    d="Yes — your share of an LLC"
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
                    d="Included — haul, store, re-launch"
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
                    d="30 days/yr per share, with charter opt-in"
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
              detail="Solo ownership wins on flexibility and depreciation timing. RYDA isn't your fit — we'd actually push you to a broker."
              fit="not-us"
            />
            <Stance
              title="You charter 4–8 weekends a year and want a real upgrade in inventory"
              detail="A share fits cleanly. 30 days/yr × your share, plus charter opt-in revenue when you're not on board."
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
              n="01"
              title="Marine ops are the cost"
              body="The hull is half the cost of ownership. Slip, captain, insurance, hurricane prep, surveys, and depreciation are the other half. Splitting ten ways turns a $300K/yr drag into a $30K/yr line item."
            />
            <Reason
              n="02"
              title="You don't actually want to skipper"
              body="Most owners on this tier don't pilot Wajers themselves. Captain-included is the default; you save the operator's license question for a Riva."
            />
            <Reason
              n="03"
              title="Charter opt-in offsets carry"
              body="Days you don't use go into the charter pool (member-priced). Owners typically recapture 25–40% of annual ops via opt-in. Documented in the cost sheet on every listing."
            />
            <Reason
              n="04"
              title="Hurricane risk is a structural carry"
              body="Insurance, haul, indoor storage, post-season re-launch. RYDA pre-negotiates with marina partners; the cost is in the share economics, not surprise invoices."
            />
            <Reason
              n="05"
              title="Surveys are real, not theater"
              body="SAMS-accredited survey at acquisition + annual condition surveys. Members see redacted reports in the LLC document vault. No more dock-tour due diligence."
            />
            <Reason
              n="06"
              title="3-year planned exit"
              body="Member vote at year 3 to sell, refit, or roll. Modeled 15% depreciation over the period — generous vs the actual flat-to-+5% Wajers and Rivas have shown 2018–2024."
            />
            <Reason
              n="07"
              title="LLC structure beats club membership"
              body="Yacht club initiations are mostly non-refundable. RYDA shares are real ownership: you're a member of a single-purpose LLC that owns the hull. Sell the share, not your seat."
            />
            <Reason
              n="08"
              title="Cross-vertical access"
              body="Boats members can charter from the cars side and vice versa (subject to availability + tier). One membership, two verticals."
            />
            <Reason
              n="09"
              title="Concierge-grade ops"
              body="Provisioning, slip reservations, captain dispatch, charter scheduling, hurricane prep — all single-vendor. Black tier gets dedicated marine account contact."
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
            conservative — most members earn more on a Wajer (lower ops,
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
                  <li>· 30 days/yr personal use</li>
                  <li>· Annual ops + reserves: ~$32,000 per share</li>
                  <li>· You opt 8 of your 30 days into the charter pool</li>
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
              guaranteed return — Q3 hurricane months pay less, Memorial-
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
            <Pillar label="Member-managed Delaware LLC" body="Members vote on material decisions; not passive. Delaware case law is the gold standard for LLC governance." />
            <Pillar label="Separate Management Services Agreement" body="RYDA is a hired service provider, not the asset owner. Members can fire RYDA and hire someone else." />
            <Pillar label="Single-purpose LLC per hull" body="No cross-collateralization. Your Pershing 6X share isn't liable for someone else's Lagoon LLC." />
            <Pillar label="USCG documentation + state title" body="Clean chain of custody. Documents in the LLC vault." />
            <Pillar label="SAMS marine survey at acquisition" body="Independent surveyor names every defect with photos. Redacted version visible to members." />
            <Pillar label="Marine-grade insurance, agreed-value" body="LLC named insured, members named additional. Hagerty Marine / CHUBB / Travelers per hull." />
            <Pillar label="Hurricane plan codified at acquisition" body="Pre-arranged haul, indoor storage, post-storm re-launch. Costs known, not surprise-invoiced." />
            <Pillar label="Captain employment agreements" body="Captains employed via the LLC, not RYDA. Members see employment terms." />
            <Pillar label="Charter opt-in agreement" body="Per-day, per-trip — nothing automatic. Members revoke any time." />
            <Pillar label="Verified members only" body="28+, KYC, ID + credit + (skipper-license check if bareboat)." />
            <Pillar label="3-yr planned exit + 12-mo transfer market" body="Built-in liquidity. No 'forever' lock-in like club initiations." />
            <Pillar label="Open-book reserve account" body="Replacement engines, electronics, sail wardrobe. Audited annually, balance visible to members." />
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
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            See if a RYDA Boat share fits.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Schedule a 30-minute call. Real conversation, real numbers,
            no commitment.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/boats/portfolio"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-marine hover:text-cream"
            >
              See the fleet →
            </Link>
            <Link
              href="/contact?type=Membership&note=RYDA+Boats+how-it-works#form"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cream/30 px-7 text-sm font-medium text-cream hover:border-cream"
            >
              Schedule a call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-cream-2/40 p-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink tabular-nums">{value}</p>
    </div>
  );
}

function Row({
  label,
  a,
  b,
  c,
  d,
  emphasis,
}: {
  label: string;
  a: string;
  b: string;
  c: string;
  d: string;
  emphasis?: boolean;
}) {
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className={`px-6 py-4 ${emphasis ? "font-medium text-ink" : "text-ink"}`}>
        {label}
      </td>
      <td className="px-6 py-4 text-center text-ink-soft">{a}</td>
      <td className="px-6 py-4 text-center text-ink-soft">{b}</td>
      <td className="px-6 py-4 text-center text-ink-soft">{c}</td>
      <td className="bg-marine/5 px-6 py-4 text-center text-ink">{d}</td>
    </tr>
  );
}

function Stance({
  title,
  detail,
  fit,
}: {
  title: string;
  detail: string;
  fit: "great" | "good" | "not-us";
}) {
  const ribbon =
    fit === "great"
      ? { label: "Great fit", cls: "bg-marine text-cream" }
      : fit === "good"
        ? { label: "Good fit", cls: "border border-marine text-marine" }
        : { label: "Not our fit", cls: "border border-rule text-mute" };
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="font-display text-lg text-ink">{title}</p>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${ribbon.cls}`}>
          {ribbon.label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}

function Reason({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-sm text-marine">{n}</p>
      <p className="mt-2 font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Pillar({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="font-display text-base text-ink">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
