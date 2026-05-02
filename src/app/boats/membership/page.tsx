import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "RYDA Boats Membership — Core, Blue, Black",
  description:
    "RYDA Boats membership: Core (free), Blue ($500/yr), Black ($1,500/yr). Co-own or charter. Captain-hours bank, priority slip windows, hurricane prep, marine surveys.",
};

// Single source of truth for the boats tier matrix.
// Mirrors the cars tier shape so members on both sides can read
// the same row labels — but the events / service team / priority rows
// are deliberately boat-native (hurricane prep, slip windows,
// captain-hours bank, charter-pool dibs). Don't reach for car
// vocabulary here — boats live and die on different ops.
type CellValue = string | boolean;

const FEATURES: { group: string; items: { label: string; core: CellValue; blue: CellValue; black: CellValue }[] }[] = [
  {
    group: "Access",
    items: [
      { label: "Browse the full RYDA Boats portfolio", core: true, blue: true, black: true },
      { label: "Charter any available hull", core: true, blue: true, black: true },
      { label: "Claim co-ownership shares · transfer to other members", core: false, blue: true, black: true },
      { label: "In-app messaging with co-owners + captains", core: true, blue: true, black: true },
      { label: "Marine survey + LLC documents", core: true, blue: true, black: true },
      { label: "Member directory (boats + cars side)", core: false, blue: true, black: true },
      { label: "Member-to-member share transfers", core: false, blue: true, black: true },
      { label: "Off-market hull pre-list visibility", core: false, blue: false, black: true },
    ],
  },
  {
    group: "Priority",
    items: [
      { label: "Priority access to new listings", core: false, blue: "24-hour", black: "48-hour" },
      { label: "Buy-in credit", core: false, blue: "$200", black: "$500" },
      { label: "Acquisition fee discount", core: false, blue: "10% off", black: "Waived (1st share)" },
      { label: "Priority booking window — peak season (Memorial → Labor)", core: false, blue: "+2 days", black: "+5 days" },
      { label: "Charter-pool first dibs (when an owner opens days)", core: false, blue: true, black: true },
    ],
  },
  {
    group: "Service & operations",
    items: [
      { label: "24/7 captain dispatch + dockside help", core: true, blue: true, black: true },
      { label: "Annual hurricane-prep pass (haul, store, re-launch)", core: false, blue: true, black: true },
      { label: "Captain-hours bank (over and above included)", core: false, blue: "2 hrs", black: "8 hrs" },
      { label: "Pre-trip provisioning (food, fuel, ice)", core: false, blue: "1 trip", black: "3 trips" },
      { label: "Service hours / year (itinerary, slips, restaurants)", core: false, blue: "1", black: "3" },
      { label: "Dedicated marine account contact", core: false, blue: false, black: true },
    ],
  },
  {
    group: "Events",
    items: [
      { label: "Quarterly Sunset Sail · happy hour from a flagship hull", core: false, blue: true, black: true },
      { label: "Member captains' breakfast (Miami, Bahamas)", core: false, blue: true, black: true },
      { label: "Miami International Boat Show — member preview day", core: false, blue: true, black: true },
      { label: "Annual rendezvous (Bimini, Exuma, or member-voted)", core: false, blue: false, black: true },
      { label: "Annual founders' weekend on the water", core: false, blue: false, black: true },
      { label: "Travel programming (Caribbean week, Mediterranean, etc.)", core: false, blue: "Open to all (paid)", black: "Priority + included" },
    ],
  },
];

const TIERS = [
  {
    key: "core" as const,
    name: "Core",
    price: "Free",
    priceSub: "",
    tagline: "Browse the boats portfolio and charter any available hull. Upgrade to Blue or Black to claim a co-ownership share.",
    cta: "Get started",
  },
  {
    key: "blue" as const,
    name: "Blue",
    price: "$500",
    priceSub: "/year",
    tagline: "For active members on the water. Priority booking windows, hurricane-prep pass, captain-hours bank, member-to-member share transfers.",
    cta: "Choose Blue",
  },
  {
    key: "black" as const,
    name: "Black",
    price: "$1,500",
    priceSub: "/year",
    tagline: "Premium everything. Annual rendezvous, dedicated marine account contact, off-market hull access.",
    cta: "Choose Black",
  },
];

export default function BoatsMembershipPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
            RYDA Boats · Membership
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Three doors{" "}
            <span className="italic">into RYDA Boats.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Core to browse and charter. Blue or Black to claim a share.
            Boats-specific perks throughout — captain hours, hurricane prep,
            slip priority — because owning a hull doesn&apos;t look like
            owning a Ferrari.
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
                        t.key === "blue" ? "bg-marine/5" : ""
                      }`}
                    >
                      <p
                        className={`text-xs uppercase tracking-wider ${
                          t.key === "blue" ? "text-marine" : "text-mute"
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
            Boats membership is structured around dock-and-go reality, not
            coupons. The perks save real time on the water.
          </p>

          <div className="mt-8 space-y-4">
            <Detail
              tier="Blue · $500/yr"
              detail="Active membership: $200 buy-in credit, hurricane-prep pass, +2 days peak-season booking priority, 2 captain-hours bank, one provisioning trip per year, member-to-member share transfers, member directory, and priority access to new hulls."
            />
            <Detail
              tier="Black · $1,500/yr"
              detail="Premium everything: $500 buy-in credit, +5 days peak-season priority, 8 captain-hours bank, three provisioning trips, three service hours, waived first acquisition fee, annual rendezvous + founders' weekend, off-market hull pre-list visibility, and a dedicated marine account contact."
            />
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Who can join?</h2>
          <ul className="mt-8 space-y-4 text-base text-ink-soft">
            <Bullet>28 or older with a valid US-issued ID</Bullet>
            <Bullet>Pass identity verification (KYC)</Bullet>
            <Bullet>
              Operator&apos;s license (US, BVI, or equivalent) only required
              if you intend to skipper personally — most members don&apos;t.
              Hulls are crewed by default.
            </Bullet>
            <Bullet>No accredited-investor status required</Bullet>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-4xl font-light sm:text-5xl">
            Founding cohort opens for the first 60 boat members.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            Apply by July 2026 to lock founding-member pricing on Blue or
            Black for life.
          </p>
          <Link
            href="/founding-members?vertical=boats"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-marine hover:text-cream"
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

  // Monochrome tier cards — mirrors the cars /membership treatment.
  // 2px top accent line in the tier color carries the differentiation:
  // marine Core (entry tier on the boats side) / deeper marine Blue
  // / GOLD Black (only place gold lands on the boats marketing side).
  const accentLine = isBlack
    ? "before:bg-[#C9A66B]" // gold (--ryda-gold)
    : isBlue
      ? "before:bg-[#1e40af]" // deeper sapphire
      : "before:bg-marine";

  const eyebrowColor = isBlack
    ? "text-[#C9A66B]"
    : isBlue
      ? "text-[#1e40af]"
      : "text-marine";

  return (
    <div
      className={`relative flex flex-col rounded-none border border-rule bg-surface p-8 before:absolute before:inset-x-0 before:top-0 before:h-[3px] ${accentLine}`}
    >
      <p className={`text-[10px] font-medium uppercase tracking-[0.22em] ${eyebrowColor}`}>
        RYDA Boats {tier.name}
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
        href={tier.key === "core" ? "/signup?next=/boats" : "/founding-members?vertical=boats"}
        className="mt-10 inline-flex h-12 items-center justify-center border border-ink bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-marine hover:border-marine"
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
  // Quiet ink dot for "included," em-dash for "not." Mirrors cars
  // /membership Cell treatment after the iter 1 polish — no red ✓
  // marks, no accent column shading. The dot is wrapped with
  // role="img" + aria-label so screen readers announce the state.
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

function Detail({ tier, detail }: { tier: string; detail: string }) {
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
