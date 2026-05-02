// /boats/vs/[competitor] — head-to-head comparison pages for SEO +
// objection handling on the boats side. Buyers will compare RYDA Boats
// to Boatsetter, GetMyBoat, traditional yacht clubs, and solo ownership.
// Owning these pages with structured comparisons captures that intent.

import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";

type Comparison = {
  slug: string;
  competitor: string;
  shortName: string;
  category: string;
  hook: string;
  rows: { label: string; competitor: string; ryda: string }[];
  whenChoose: { theirs: string; ours: string };
};

const COMPARISONS: Comparison[] = [
  {
    slug: "boatsetter",
    competitor: "Boatsetter",
    shortName: "Boatsetter",
    category: "Peer-to-peer charter marketplace",
    hook: "Boatsetter is a marketplace for chartering from individual owners. RYDA Boats is asset-backed co-ownership of curated, surveyed yachts. Different models entirely.",
    rows: [
      {
        label: "What you get",
        competitor: "A daily charter from an individual owner",
        ryda: "A real ownership share in a Delaware LLC that holds title to a specific yacht",
      },
      {
        label: "Who the seller is",
        competitor: "Anyone with a boat and a Boatsetter account",
        ryda: "RYDA — surveyed CPO inventory, member-managed LLCs, single operational standard",
      },
      {
        label: "Insurance",
        competitor: "Coverage varies by owner's chosen plan; review their protection plan docs for >$1M boats",
        ryda: "Agreed-value LLC fleet policy from an A-rated marine carrier; co-owners named insureds",
      },
      {
        label: "Cost on a Wajer 55 S",
        competitor: "$15,000–$22,000/day on Boatsetter (owner-set rates)",
        ryda: "$195K share + $32K/yr ops = ~$1,067/day in steady-state ops + $165,750 estimated resale at year 3",
      },
      {
        label: "Operational burden",
        competitor: "Owner handles slip, captain, fuel, claims, USCG documentation",
        ryda: "RYDA handles everything end-to-end — professional ops included in annual contribution",
      },
      {
        label: "What you walk away with",
        competitor: "Receipts",
        ryda: "Sale proceeds at year-3 LLC exit (modeled 85% of buy-in)",
      },
    ],
    whenChoose: {
      theirs:
        "You want to charter once a year, you don't care about a specific boat, and your priority is no commitment + lowest possible all-in spend.",
      ours: "You'd cruise 30–60 days/yr on a specific yacht, you want real ownership without operating it, and you're comfortable with a 3-year planned exit.",
    },
  },
  {
    slug: "yacht-club",
    competitor: "Traditional yacht club",
    shortName: "Yacht Club",
    category: "Annual membership · shared fleet access",
    hook: "Yacht clubs (Carefree Boat Club, Freedom Boat Club, Suntex) charge an initiation + monthly dues for unlimited access to a shared fleet of smaller boats. RYDA Boats is a one-time buy-in for one specific yacht you partly own. Membership vs. ownership.",
    rows: [
      {
        label: "Annual cost",
        competitor: "$25K–$60K/yr depending on tier",
        ryda: "$32K/yr ops on a Wajer 55 S (~9% of the full carrying cost a sole owner would pay)",
      },
      {
        label: "What you keep at exit",
        competitor: "Nothing — fee is consumed, initiation may be partially refundable",
        ryda: "Pro-rata share of the LLC's resale (~$165K on a $195K buy-in at modeled 85% residual)",
      },
      {
        label: "Boat size + class",
        competitor: "20–35 ft center consoles and small cruisers; rotating menu",
        ryda: "55 ft+ Wajers, Pershings, Lagoons — yachts you actually want to be seen on",
      },
      {
        label: "Multi-year cost (3 yrs)",
        competitor: "$75K–$180K dues + initiation, all consumed",
        ryda: "$291K spent + $165K returned at exit = $126K net cost",
      },
      {
        label: "Booking model",
        competitor: "Calendar-based, first-come-first-served on the rotating menu",
        ryda: "Pro-rata to your share count on a specific yacht; co-owners coordinate directly",
      },
    ],
    whenChoose: {
      theirs:
        "You want variety on smaller boats, predictable monthly budgeting, and zero commitment to a specific vessel. Club membership reads as a usage-fee, not an asset.",
      ours: "You want a yacht-class hull and an ownership stake — at exit, the LLC's resale returns most of your buy-in (subject to actual market depreciation, modeled here at 15%), so the all-in over 3 years is materially lower than club fees consumed for nothing.",
    },
  },
  {
    slug: "solo-ownership",
    competitor: "Solo yacht ownership",
    shortName: "Solo ownership",
    category: "Buy and operate the yacht yourself",
    hook: "Solo ownership of a 55 ft yacht runs $1.95M for the hull and $300K+/year to keep — slip, captain, fuel, insurance, hurricane prep, maintenance. RYDA Boats is the same yacht, 1/10th the carry, all the operational hassle absorbed.",
    rows: [
      {
        label: "Up-front cost",
        competitor: "$1,950,000 (Wajer 55 S sticker)",
        ryda: "$195,000 (1/10th share)",
      },
      {
        label: "Annual carrying cost",
        competitor: "$300K–$400K/yr (slip $50K + captain $120K + fuel $40K + insurance $25K + maintenance + hurricane prep)",
        ryda: "$32K/yr per share — bundled, no surprises",
      },
      {
        label: "Operational burden",
        competitor: "You manage the captain, slip lease, USCG documentation, hurricane haul-out, charter back, every claim",
        ryda: "RYDA absorbs all of it under the Management Services Agreement",
      },
      {
        label: "Use 30 days/yr",
        competitor: "$300K÷30 = $10,000/day effective",
        ryda: "$1,067/day effective in steady-state ops (after first year)",
      },
      {
        label: "Exit liquidity",
        competitor: "Brokerage sale, 60–180 days, market-dependent, you eat depreciation",
        ryda: "LLC sells at year 3, you receive pro-rata; transfer to another verified RYDA member after 12 months",
      },
    ],
    whenChoose: {
      theirs:
        "You want full control + 100% of the calendar + no co-owners. You're comfortable operating a yacht yourself and the carrying cost doesn't change your life.",
      ours: "You want the yacht experience without the second job. You'd cruise 30 days a year and the math beats every other path to that — by 5–10x.",
    },
  },
];

export async function generateStaticParams() {
  return COMPARISONS.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const c = COMPARISONS.find((x) => x.slug === competitor);
  if (!c) return { title: "RYDA Boats · Comparison" };
  return {
    title: `RYDA Boats vs ${c.shortName} | RYDA`,
    description: `Asset-backed yacht co-ownership compared to ${c.competitor}. Cost, structure, what you walk away with, when each option makes sense.`,
  };
}

export default async function VsPage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const c = COMPARISONS.find((x) => x.slug === competitor);
  if (!c) notFound();

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Comparison · {c.category}
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            RYDA Boats vs{" "}
            <span className="italic">{c.shortName}.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {c.hook}
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="px-6 py-5 text-left">&nbsp;</th>
                      <th className="px-6 py-5 text-left">{c.shortName}</th>
                      <th className="px-6 py-5 text-left text-marine">RYDA Boats</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink">
                    {c.rows.map((r) => (
                      <tr
                        key={r.label}
                        className="border-b border-rule last:border-b-0"
                      >
                        <td className="px-6 py-5 text-xs uppercase tracking-wider text-mute">
                          {r.label}
                        </td>
                        <td className="px-6 py-5 text-ink-soft">
                          {r.competitor}
                        </td>
                        <td className="px-6 py-5 font-medium text-ink">
                          {r.ryda}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* When each makes sense */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Which one is right for you?
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="rounded-2xl border border-rule bg-surface p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-mute">
                  Pick {c.shortName} if
                </p>
                <p className="mt-4 text-base leading-relaxed text-ink-soft">
                  {c.whenChoose.theirs}
                </p>
              </div>
            </Reveal>
            <Reveal delayMs={120}>
              <div className="rounded-2xl border border-marine bg-marine/5 p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-marine">
                  Pick RYDA Boats if
                </p>
                <p className="mt-4 text-base leading-relaxed text-ink-soft">
                  {c.whenChoose.ours}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Other comparisons */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            Other comparisons
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {COMPARISONS.filter((x) => x.slug !== c.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/boats/vs/${other.slug}`}
                className="group block rounded-2xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-mute">
                  {other.category}
                </p>
                <p className="mt-2 font-display text-lg text-ink">
                  RYDA Boats vs {other.shortName}
                </p>
                <p className="mt-3 text-xs font-medium text-marine group-hover:text-marine-deep">
                  Read →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            See if RYDA Boats fits before you compare further.
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
              href="/contact?type=Membership&note=RYDA+Boats#form"
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
