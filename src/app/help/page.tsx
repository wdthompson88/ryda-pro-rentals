import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Help Center — RYDA",
  description:
    "Answers about RYDA membership, share purchases, bookings, insurance, maintenance, and account management.",
};

type Article = { q: string; href: string };
type Category = {
  slug: string;
  icon: string;
  title: string;
  blurb: string;
  articles: Article[];
};

const CATEGORIES: Category[] = [
  {
    slug: "getting-started",
    icon: "→",
    title: "Getting started",
    blurb: "New to RYDA. How membership works, what tier to pick, what happens after you apply.",
    articles: [
      { q: "What is RYDA, in one paragraph?", href: "/help/getting-started/what-is-ryda" },
      { q: "How is co-ownership different from a timeshare?", href: "/help/getting-started/vs-timeshare" },
      { q: "Membership tiers explained: Core, Blue, Black", href: "/help/getting-started/membership-tiers" },
      { q: "Do I need to be an accredited investor?", href: "/help/getting-started/accreditation" },
      { q: "What markets is RYDA in?", href: "/help/getting-started/markets" },
    ],
  },
  {
    slug: "shares",
    icon: "$",
    title: "Buying & selling shares",
    blurb: "Share purchases, the Operating Agreement, the 12-month minimum hold, secondary-market sales.",
    articles: [
      { q: "How do I buy a share?", href: "/help/shares/how-to-buy" },
      { q: "What documents will I sign?", href: "/help/shares/documents" },
      { q: "What does a share actually entitle me to?", href: "/help/shares/entitlement" },
      { q: "Can I sell my share whenever I want?", href: "/help/shares/selling" },
      { q: "How is a share priced on the secondary market?", href: "/help/shares/pricing" },
      { q: "What's the 3% transfer fee?", href: "/help/shares/transfer-fee" },
    ],
  },
  {
    slug: "bookings",
    icon: "◷",
    title: "Bookings & usage",
    blurb: "Reserving days, fair-use rules, peak-season caps, cancellations, no-shows, track days.",
    articles: [
      { q: "How do I book my time on a vehicle?", href: "/help/bookings/how-to-book" },
      { q: "Fair-use rules during high season", href: "/help/bookings/fair-use" },
      { q: "Cancellations and rebooking", href: "/help/bookings/cancellations" },
      { q: "Booking a track day", href: "/help/bookings/track-day" },
      { q: "Mileage limits and overages", href: "/help/bookings/mileage" },
      { q: "Bringing a passenger or co-driver", href: "/help/bookings/passengers" },
    ],
  },
  {
    slug: "insurance-claims",
    icon: "⛨",
    title: "Insurance & claims",
    blurb: "What's covered, deductibles, how to file a claim, replacement vehicles.",
    articles: [
      { q: "What does the insurance cover?", href: "/help/insurance/coverage" },
      { q: "What's my deductible if I'm at fault?", href: "/help/insurance/deductible" },
      { q: "How to file a claim — step by step", href: "/help/insurance/file-claim" },
      { q: "Roadside assistance & replacement vehicle", href: "/help/insurance/roadside" },
      { q: "What if the car is totaled?", href: "/help/insurance/total-loss" },
    ],
  },
  {
    slug: "maintenance",
    icon: "⚙",
    title: "Maintenance & care",
    blurb: "Service schedule, inspections, who pays for what, reporting damage, condition reports.",
    articles: [
      { q: "How is maintenance handled?", href: "/help/maintenance/process" },
      { q: "Who pays for routine service?", href: "/help/maintenance/who-pays" },
      { q: "How do I report new damage?", href: "/help/maintenance/report-damage" },
      { q: "Inspection reports and condition documentation", href: "/help/maintenance/inspections" },
      { q: "Detailing and pre-booking preparation", href: "/help/maintenance/detailing" },
    ],
  },
  {
    slug: "account",
    icon: "◉",
    title: "Account & billing",
    blurb: "Membership renewals, payment methods, taxes, statements, KYC verification.",
    articles: [
      { q: "Updating payment methods", href: "/help/account/payment-methods" },
      { q: "How am I billed?", href: "/help/account/billing" },
      { q: "Tax treatment of share ownership", href: "/help/account/taxes" },
      { q: "KYC verification — what we collect and why", href: "/help/account/kyc" },
      { q: "Closing my account", href: "/help/account/close" },
    ],
  },
  {
    slug: "legal",
    icon: "§",
    title: "Legal & compliance",
    blurb: "Operating Agreement, Reg D 506(c), securities disclaimer, data privacy.",
    articles: [
      { q: "The Operating Agreement, explained", href: "/help/legal/operating-agreement" },
      { q: "Reg D 506(c) and what it means", href: "/help/legal/reg-d" },
      { q: "Are RYDA shares securities?", href: "/help/legal/securities" },
      { q: "Data privacy & member information", href: "/help/legal/privacy" },
    ],
  },
];

export default function HelpCenterPage() {
  const totalArticles = CATEGORIES.reduce((n, c) => n + c.articles.length, 0);

  return (
    <>
      <SiteHeader />

      {/* Hero with search */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Help center
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            How can we help?
          </h1>

          {/* Search bar (visual only — wires up later) */}
          <div className="mt-10 max-w-2xl">
            <label className="sr-only" htmlFor="help-search">
              Search help articles
            </label>
            <div className="flex h-14 items-center gap-3 rounded-full border border-rule bg-surface px-6 shadow-sm">
              <span className="text-base text-mute">⌕</span>
              <input
                id="help-search"
                type="search"
                placeholder="Search bookings, insurance, share transfer, KYC…"
                className="h-full flex-1 bg-transparent text-base text-ink placeholder:text-mute focus:outline-none"
              />
            </div>
            <p className="mt-3 text-xs text-mute">
              {totalArticles} articles across {CATEGORIES.length} categories
            </p>
          </div>
        </div>
      </section>

      {/* Quick-link tiles */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-wider text-mute">
            Top topics
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "How to buy a share",
              "Fair-use rules",
              "File an insurance claim",
              "Operating Agreement",
              "Track day eligibility",
              "Tax treatment",
              "Sell on secondary market",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-rule bg-surface px-4 py-2 text-sm text-ink-soft hover:text-ink"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/help/${cat.slug}`}
                className="group flex flex-col rounded-2xl border border-rule bg-surface p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-cream-2 font-display text-base text-red">
                  {cat.icon}
                </div>
                <p className="mt-5 font-display text-xl text-ink">{cat.title}</p>
                <p className="mt-2 text-sm text-ink-soft">{cat.blurb}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {cat.articles.slice(0, 3).map((a) => (
                    <li key={a.href} className="text-ink-soft">
                      <span className="text-red">→</span>{" "}
                      <span className="group-hover:text-ink">{a.q}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs font-medium text-red group-hover:text-red-deep">
                  See all {cat.articles.length} articles →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Status / contact strip */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Strip
              title="Concierge & roadside"
              detail="24/7 support for active members. One number, real humans, no IVR."
              cta="Call (305) 555-0100"
              href="tel:+13055550100"
            />
            <Strip
              title="Email a specialist"
              detail="hello@ryda.com for general questions. We answer everything within one business day."
              cta="hello@ryda.com →"
              href="mailto:hello@ryda.com"
            />
            <Strip
              title="Book a 30-minute call"
              detail="Talk to a real human about membership, shares, or anything else. No commitment."
              cta="Book a consultation →"
              href="/contact#consultation"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Didn't find what you needed?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            We'll write you back within one business day. If it's urgent and
            you're an active member, call the concierge line.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}

function Strip({
  title,
  detail,
  cta,
  href,
}: {
  title: string;
  detail: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{detail}</p>
      <a
        href={href}
        className="mt-4 text-sm font-medium text-red hover:text-red-deep"
      >
        {cta}
      </a>
    </div>
  );
}
