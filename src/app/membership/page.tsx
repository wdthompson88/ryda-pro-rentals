import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Membership — RYDA",
  description:
    "RYDA Core (free), Blue ($500/yr), and Black ($1,500/yr). Compare what each tier unlocks.",
};

// Single source of truth for the tier matrix.
// Used for both the tier-card hero and the comparison table below.
type CellValue = string | boolean;

const FEATURES: { group: string; items: { label: string; core: CellValue; blue: CellValue; black: CellValue }[] }[] = [
  {
    group: "Access",
    items: [
      { label: "Browse all vehicles in every market", core: true, blue: true, black: true },
      { label: "Rent any available vehicle", core: true, blue: true, black: true },
      { label: "Claim co-ownership shares · transfer to other members", core: false, blue: true, black: true },
      { label: "In-app messaging with co-owners", core: true, blue: true, black: true },
      { label: "Inspection reports + LLC documents", core: true, blue: true, black: true },
      { label: "Member directory access", core: false, blue: true, black: true },
      { label: "Member-to-member share transfers", core: false, blue: true, black: true },
      { label: "Off-market vehicle pre-list visibility", core: false, blue: false, black: true },
    ],
  },
  {
    group: "Priority",
    items: [
      { label: "Priority access to new listings", core: false, blue: "24-hour", black: "48-hour" },
      { label: "Buy-in credit", core: false, blue: "$200", black: "$500" },
      { label: "Acquisition fee discount", core: false, blue: "10% off", black: "Waived (1st share)" },
    ],
  },
  {
    group: "Service",
    items: [
      { label: "Free white-glove deliveries / year", core: false, blue: "1", black: "3" },
      { label: "Free service hours / year", core: false, blue: "1", black: "3" },
      { label: "Free pre-trip vehicle prep / year", core: false, blue: false, black: "1" },
      { label: "24/7 roadside assistance", core: true, blue: true, black: true },
      { label: "Standard handover (pickup)", core: true, blue: true, black: true },
      { label: "Dedicated account contact", core: false, blue: false, black: true },
    ],
  },
  {
    group: "Events",
    items: [
      { label: "Quarterly Cars & Cuban Coffee", core: false, blue: true, black: true },
      { label: "Member networking dinners", core: false, blue: true, black: true },
      { label: "Quarterly flagship events (Pebble, GP weekend, Art Basel)", core: false, blue: false, black: true },
      { label: "Annual founders' weekend", core: false, blue: false, black: true },
      { label: "Travel programming (Keys road trip, Monterey, etc.)", core: false, blue: "Open to all (paid)", black: "Priority + included" },
    ],
  },
];

const TIERS = [
  {
    key: "core" as const,
    name: "Core",
    price: "Free",
    priceSub: "",
    tagline: "Browse the fleet and rent any available vehicle. Upgrade to Blue or Black to claim a co-ownership share.",
    cta: "Get started",
  },
  {
    key: "blue" as const,
    name: "Blue",
    price: "$500",
    priceSub: "/year",
    tagline: "For active members. Priority on new vehicles, monthly meetups, member-to-member share transfers.",
    cta: "Choose Blue",
  },
  {
    key: "black" as const,
    name: "Black",
    price: "$1,500",
    priceSub: "/year",
    tagline: "Premium everything. Travel programming, flagship events, dedicated contact.",
    cta: "Choose Black",
    dark: true,
  },
];

export default function MembershipPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-mute">
            Membership
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Three doors{" "}
            <span className="italic">into RYDA.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Core to browse and rent. Blue or Black to claim a share.
          </p>
        </div>
      </section>

      {/* Tier cards */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <TierCard key={tier.key} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Compare every benefit.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            Side-by-side, no fine print.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-rule bg-surface">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-rule bg-cream-2">
                <tr>
                  <th className="px-6 py-5 text-left">
                    <span className="text-xs uppercase tracking-wider text-mute">
                      Benefit
                    </span>
                  </th>
                  {TIERS.map((t) => (
                    <th
                      key={t.key}
                      className={`px-6 py-5 text-center ${
                        t.key === "blue" ? "bg-red/5" : ""
                      }`}
                    >
                      <p
                        className={`text-xs uppercase tracking-wider ${
                          t.key === "blue" ? "text-red" : "text-mute"
                        }`}
                      >
                        {t.name}
                      </p>
                      <p className="mt-1 font-display text-lg text-ink">
                        {t.price}
                        <span className="text-xs text-ink-soft">
                          {t.priceSub}
                        </span>
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((group) => (
                  <Group key={group.group} group={group} />
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </section>

      {/* Math */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            What each tier includes.
          </h2>
          <p className="mt-4 text-base text-ink-soft">
            Membership is structured around access and service, not coupons.
          </p>

          <div className="mt-8 space-y-4">
            <Math
              tier="Blue · $500/yr"
              detail="Active membership: a $200 buy-in credit, one complimentary white-glove delivery, member-to-member share transfers, member directory, and priority access to new vehicles."
            />
            <Math
              tier="Black · $1,500/yr"
              detail="Premium everything: a $500 buy-in credit, three deliveries, three service hours, waived first acquisition fee, flagship event programming (Pebble, Miami GP, Art Basel), and a dedicated account contact."
            />
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Who can join?</h2>
          <ul className="mt-8 space-y-4 text-base text-ink-soft">
            <Bullet>28 or older with a valid US driver's license and clean recent record</Bullet>
            <Bullet>Pass identity verification (KYC)</Bullet>
            <Bullet>No accredited-investor status required</Bullet>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-4xl font-light sm:text-5xl">
            Members start in Miami.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            Apply by July 2026 to lock early-member pricing on Blue or
            Black for life.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Apply now →
          </Link>
        </div>
      </section>
    </>
  );
}

// ── Tier card ───────────────────────────────────────────────────

function TierCard({ tier }: { tier: typeof TIERS[number] }) {
  const isBlue = tier.key === "blue";
  const isBlack = tier.key === "black";

  const above = isBlack ? "blue" : isBlue ? "core" : null;

  function isUpgrade(item: { core: CellValue; blue: CellValue; black: CellValue }) {
    if (!above) return item.core === true;
    const my = item[tier.key];
    const prev = item[above];
    if (my === false) return false;
    return prev === false || (my !== prev);
  }

  const items = FEATURES.flatMap((g) => g.items.filter(isUpgrade)).slice(0, 7);
  const previousLabel = isBlack ? "Everything in Blue, plus" : isBlue ? "Everything in Core, plus" : null;

  // Monochrome tier cards. Saturated red/blue/black saturated cards
  // read as Stripe pricing. Restrained palette: cream/surface body
  // with a 2px top accent line in the tier color (red / marine / gold).
  // Black tier earns the gold detail — gold was previously underused
  // in tokens; this is its one recurring brand surface.
  const accentLine = isBlack
    ? "before:bg-[#C9A66B]" // gold (--ryda-gold)
    : isBlue
      ? "before:bg-marine"
      : "before:bg-red";

  return (
    <div
      className={`relative flex flex-col rounded-none border border-rule bg-surface p-8 before:absolute before:inset-x-0 before:top-0 before:h-[3px] ${accentLine}`}
    >
      <p
        className={`text-[10px] font-medium uppercase tracking-[0.22em] ${
          isBlack ? "text-[#C9A66B]" : isBlue ? "text-marine" : "text-red"
        }`}
      >
        RYDA {tier.name}
      </p>
      <p className="mt-5 font-display text-5xl font-light text-ink">
        {tier.price}
        {tier.priceSub && (
          <span className="text-base text-mute">{tier.priceSub}</span>
        )}
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        {tier.tagline}
      </p>

      {previousLabel && (
        <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.2em] text-mute">
          {previousLabel}
        </p>
      )}

      <ul className={`${previousLabel ? "mt-3" : "mt-8"} flex-1 space-y-3 text-[14px]`}>
        {items.map((f) => (
          <li key={f.label} className="flex items-start gap-3 text-ink-soft">
            <span className="mt-1 text-mute">·</span>
            <span>
              <span className="text-ink">{f.label}</span>
              {typeof f[tier.key] === "string" && (
                <span className="ml-1.5 text-xs italic text-mute">
                  ({f[tier.key]})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={tier.key === "core" ? "/signup" : "/signup"}
        className="mt-10 inline-flex h-12 items-center justify-center border border-ink bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red hover:border-red"
      >
        {tier.cta}
      </Link>
    </div>
  );
}

// ── Comparison table ───────────────────────────────────────────

function Group({ group }: { group: typeof FEATURES[number] }) {
  return (
    <>
      <tr className="border-b border-rule bg-cream-2/40">
        <td colSpan={4} className="px-6 py-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
            {group.group}
          </span>
        </td>
      </tr>
      {group.items.map((f) => (
        <tr key={f.label} className="border-b border-rule last:border-b-0">
          <td className="px-6 py-4 text-ink">{f.label}</td>
          <Cell value={f.core} />
          <Cell value={f.blue} accent />
          <Cell value={f.black} />
        </tr>
      ))}
    </>
  );
}

function Cell({ value, accent }: { value: CellValue; accent?: boolean }) {
  // Quiet ink dot for "included," em-dash for "not included."
  // Replaces the red ✓ / cell shading combo — checkmarks + accent
  // backgrounds read as feature-comparison SaaS. The ink dot keeps
  // the affordance without shouting; accent is gone entirely from
  // the cell, the comparison table inherits no color.
  const bg = accent ? "bg-cream-2/40" : "";
  let content: React.ReactNode;
  if (value === true) {
    content = (
      <span role="img" aria-label="Included">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
      </span>
    );
  } else if (value === false) {
    content = (
      <span role="img" aria-label="Not included" className="text-mute">
        <span aria-hidden>—</span>
      </span>
    );
  } else {
    content = <span className="text-ink">{value}</span>;
  }
  return (
    <td className={`px-6 py-4 text-center text-sm ${bg}`}>{content}</td>
  );
}

// ── Math + bullets ─────────────────────────────────────────────

function Math({ tier, detail }: { tier: string; detail: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="font-display text-base text-ink">{tier}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed">
      <span className="mt-1 text-mute">·</span>
      <span>{children}</span>
    </li>
  );
}
