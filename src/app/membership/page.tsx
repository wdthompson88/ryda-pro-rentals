import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Membership — RYDA",
  description:
    "RYDA Core (free) and RYDA Black ($1,500/yr). Compare what each tier unlocks.",
};

export default function MembershipPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Membership
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Two tiers.{" "}
            <span className="italic text-red">No subscription overload.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Most RYDA members are on Core — free, full access to browse and
            book. Black is for the active driver who wants priority,
            concierge service, and the perks that make ownership feel
            effortless.
          </p>
        </div>
      </section>

      {/* Tier comparison */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Tier
              name="RYDA Core"
              price="Free"
              tagline="The foundation. Everything you need to drive and own."
              features={[
                "Browse all vehicles in every market",
                "Buy shares, list shares for sale",
                "Rent any available vehicle",
                "In-app messaging with co-owners",
                "Inspection reports + LLC documents",
                "Standard handover (self-pickup)",
                "24/7 roadside assistance",
              ]}
            />
            <Tier
              name="RYDA Black"
              price="$1,500"
              priceSub="/year"
              tagline="The accelerator. Priority access, complimentary services, and member events."
              features={[
                "$500 share-purchase credit (recoups 1/3 of membership)",
                "24-hour priority access to new listings",
                "2 free white-glove deliveries / year",
                "2 free concierge hours / year",
                "Quarterly RYDA member events (Miami GP, Pebble Beach, etc.)",
                "Off-market vehicle pre-list visibility",
                "1 free pre-trip vehicle prep (worth $250)",
                "Member directory + networking platform",
                "Member-only secondary market early access",
                "Annual flagship event invite",
              ]}
              dark
              cta="Upgrade to Black"
            />
          </div>
        </div>
      </section>

      {/* Math: when Black pays for itself */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            When does Black pay for itself?
          </h2>
          <p className="mt-4 text-base text-ink-soft">
            The math, transparently:
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <Math
              line="Share-purchase credit"
              value="$500"
              note="One-time, applied to first share you buy"
            />
            <Math
              line="2 white-glove deliveries"
              value="$600"
              note="Normally $300/each — included"
            />
            <Math
              line="2 concierge hours"
              value="$300"
              note="Travel + booking support, normally $150/hr"
            />
            <Math
              line="Pre-trip preparation"
              value="$250"
              note="Premium detail + condition check, included"
            />
            <Math
              line="Quarterly events"
              value="Priceless"
              note="Members-only, not for sale"
            />
            <li className="flex items-baseline justify-between border-t border-rule pt-4 font-display text-base text-ink">
              <span>Tangible value</span>
              <span className="tabular-nums">$1,650+</span>
            </li>
          </ul>
          <p className="mt-6 text-xs text-mute">
            For an active member who buys 1 share + uses 1 delivery in their
            first year, Black is net-positive day one.
          </p>
        </div>
      </section>

      {/* Eligibility */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Who can join?</h2>
          <ul className="mt-8 space-y-4 text-base text-ink-soft">
            <Bullet>28 years or older</Bullet>
            <Bullet>Valid US driver's license, clean recent driving record</Bullet>
            <Bullet>Pass identity verification (KYC)</Bullet>
            <Bullet>
              For share purchases: pass financial qualification (accredited investor self-cert reviewed by RYDA)
            </Bullet>
            <Bullet>
              No requirement to buy a share to join — Core members are welcome to browse and rent only
            </Bullet>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-4xl font-light sm:text-5xl">
            Founding members start in Miami.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            We're vetting the first 100 members for Q3 2026 launch. Early
            members get founding-member pricing on Black for life.
          </p>
          <Link
            href="/founding-members"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Apply now →
          </Link>
        </div>
      </section>
    </>
  );
}

function Tier({
  name,
  price,
  priceSub,
  tagline,
  features,
  dark,
  cta = "Get started",
}: {
  name: string;
  price: string;
  priceSub?: string;
  tagline: string;
  features: string[];
  dark?: boolean;
  cta?: string;
}) {
  const bg = dark ? "bg-ink text-cream" : "bg-white text-ink";
  const sub = dark ? "text-cream/70" : "text-ink-soft";
  const ctaCls = dark
    ? "bg-cream text-ink hover:bg-red hover:text-cream"
    : "bg-ink text-cream hover:bg-red";
  return (
    <div className={`rounded-2xl border border-rule p-10 ${bg}`}>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">{name}</p>
      <p className="mt-4 font-display text-5xl font-light">
        {price}
        {priceSub && <span className={`text-base ${sub}`}>{priceSub}</span>}
      </p>
      <p className={`mt-3 text-base ${sub}`}>{tagline}</p>
      <ul className="mt-8 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span className="mt-1 text-red">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/founding-members"
        className={`mt-10 inline-flex h-12 w-full items-center justify-center rounded-full px-7 text-sm font-medium transition-colors ${ctaCls}`}
      >
        {cta}
      </Link>
    </div>
  );
}

function Math({ line, value, note }: { line: string; value: string; note: string }) {
  return (
    <li className="flex flex-col border-b border-rule pb-3 sm:flex-row sm:items-baseline sm:justify-between">
      <span>
        <span className="text-ink">{line}</span>
        <span className="ml-2 text-xs text-mute">{note}</span>
      </span>
      <span className="font-medium text-ink tabular-nums">{value}</span>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed">
      <span className="mt-1 text-red">·</span>
      <span>{children}</span>
    </li>
  );
}
