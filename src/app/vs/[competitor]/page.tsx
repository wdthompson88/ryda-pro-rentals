// /vs/[competitor] — head-to-head comparison pages for SEO + objection
// handling. Buyers WILL google "RYDA vs Turo / vs Marengo / vs club X";
// owning these pages with structured comparisons captures that intent.

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
    slug: "turo",
    competitor: "Turo",
    shortName: "Turo",
    category: "Peer-to-peer car rental marketplace",
    hook: "Turo is a marketplace for renting from individual hosts. RYDA is asset-backed co-ownership of curated CPO exotics. Different models entirely.",
    rows: [
      {
        label: "What you get",
        competitor: "A daily rental from an individual host",
        ryda: "A real ownership share in a Delaware LLC that holds title to a specific car",
      },
      {
        label: "Who the seller is",
        competitor: "Anyone with a car and a Turo account",
        ryda: "RYDA — verified CPO inventory, member-managed LLCs, single operational standard",
      },
      {
        label: "Insurance",
        competitor: "Coverage varies by host's chosen Turo plan; review their protection plan docs for premium-vehicle specifics",
        ryda: "Agreed-value LLC fleet policy from an A-rated US carrier; co-owners named insureds",
      },
      {
        label: "Cost on a Ferrari 296",
        competitor: "$2,000–3,000/day on Turo (host-set rates); commercial insurance often required if you list a high-value car",
        ryda: "$34K share + $7,080/yr ops = ~$236/day in steady-state ops + $30,600 estimated resale at year 2",
      },
      {
        label: "Operational burden",
        competitor: "Owner handles cleaning, fueling, screening, claims, registration",
        ryda: "RYDA handles everything end-to-end — concierge ops included in annual contribution",
      },
      {
        label: "What you walk away with",
        competitor: "Receipts",
        ryda: "Sale proceeds at year-2 LLC exit (modeled 90% of buy-in)",
      },
    ],
    whenChoose: {
      theirs:
        "You want to drive once or twice a year, you don't care about a specific car, and your priority is no commitment + lowest possible all-in spend.",
      ours: "You'd drive 30–60 days/yr on a specific car, you want real ownership without operating it, and you're comfortable with a 2-year planned exit.",
    },
  },
  {
    slug: "marengo",
    competitor: "Marengo Motors",
    shortName: "Marengo",
    category: "Subscription supercar club",
    hook: "Marengo is a monthly subscription that gives you rotating access to a fleet. RYDA is asset-backed co-ownership of one specific car. Subscription vs. asset.",
    rows: [
      {
        label: "What you get",
        competitor: "Monthly access to a rotating fleet — different car each time",
        ryda: "A registered legal interest in one specific Delaware LLC + one specific car",
      },
      {
        label: "Pricing model",
        competitor: "Monthly subscription, ~$3K–$10K/mo depending on tier; cancel any time",
        ryda: "$34K one-time buy-in + ~$7,080/yr ops on a Ferrari 296; 2-year hold",
      },
      {
        label: "What backs your money",
        competitor: "A subscription contract with the operator",
        ryda: "Title to a physical vehicle held by a Delaware LLC where you're a member",
      },
      {
        label: "If the platform fails",
        competitor: "You lose access immediately; your subscription is gone",
        ryda: "The LLC and car still belong to the members; you still own your share",
      },
      {
        label: "Relationship to the car",
        competitor: "None — you drive whatever's available that month",
        ryda: "It's your car (and 9 other people's). Same VIN every booking.",
      },
    ],
    whenChoose: {
      theirs:
        "You want variety over relationship — the McLaren this month, the Porsche next month — and you don't want to own anything.",
      ours: "You want one specific car (the Aventador Ultimae, the Valhalla, the Cullinan) and you'd rather build a relationship with it than rotate through a club menu.",
    },
  },
  {
    slug: "supercar-club",
    competitor: "Premier Auto Club / Freedom Supercars",
    shortName: "Supercar Club",
    category: "Annual supercar club membership",
    hook: "Premium clubs charge a flat annual fee (~$30K–$80K/yr) for X days of access on a rotating fleet. RYDA is a one-time buy-in for one car you partly own. Membership vs. ownership.",
    rows: [
      {
        label: "Annual cost",
        competitor: "$30K–$80K/yr depending on tier",
        ryda: "$7,080/yr ops on a Ferrari 296 (~9% of the full carrying cost a sole owner would pay)",
      },
      {
        label: "What you keep at exit",
        competitor: "Nothing — fee is consumed",
        ryda: "Pro-rata share of the LLC's resale (~$30,600 on a $34K buy-in at modeled 90% residual)",
      },
      {
        label: "Days of access",
        competitor: "~25–30 days/yr included; rotating menu",
        ryda: "~30 days/yr on one specific car per share; multi-share holders scale linearly",
      },
      {
        label: "Multi-year cost (2 yrs)",
        competitor: "$60K–$160K annual fees, all consumed",
        ryda: "$48,160 spent + $30,600 returned at exit = $17,560 net cost",
      },
      {
        label: "Booking model",
        competitor: "Calendar-based, first-come-first-served on the rotating menu",
        ryda: "Pro-rata to your share count on a specific car; co-owners coordinate directly",
      },
    ],
    whenChoose: {
      theirs:
        "You want variety, predictable annual budgeting, and zero commitment to a specific vehicle. Club membership reads as a usage-fee, not an investment.",
      ours: "You want an ownership stake and cost discipline — at exit, the LLC's resale returns most of your buy-in (subject to actual market depreciation, modeled here at 10%), so the all-in over 2 years is materially lower than club fees consumed for nothing.",
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
  if (!c) return { title: "RYDA · Comparison" };
  return {
    title: `RYDA vs ${c.shortName} | RYDA`,
    description: `Asset-backed co-ownership compared to ${c.competitor}. Cost, structure, what you walk away with, when each option makes sense.`,
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Comparison · {c.category}
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            RYDA vs{" "}
            <span className="italic text-red">{c.shortName}.</span>
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
                      <th className="px-6 py-5 text-left text-red">RYDA</th>
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
              <div className="rounded-2xl border border-red bg-red/5 p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-red">
                  Pick RYDA if
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Other comparisons
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {COMPARISONS.filter((x) => x.slug !== c.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/vs/${other.slug}`}
                className="group block rounded-2xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-mute">
                  {other.category}
                </p>
                <p className="mt-2 font-display text-lg text-ink">
                  RYDA vs {other.shortName}
                </p>
                <p className="mt-3 text-xs font-medium text-red group-hover:text-red-deep">
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
            See if RYDA fits before you compare further.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Schedule a 30-minute call. Real conversation, real numbers,
            no commitment.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/markets"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
            >
              See the fleet →
            </Link>
            <Link
              href="/contact?type=Membership#form"
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
