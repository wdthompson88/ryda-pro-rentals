import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HELP } from "@/lib/help-content";

export const metadata = {
  title: "Help Center",
  description:
    "Answers about renting a car listed on RYDA: sending a request, paying, insurance, mileage, and your account.",
};

// Five of these seven pointed at co-ownership articles that no longer
// exist — claiming a share, transferring one, the member-managed LLC,
// the securities question, tax treatment — plus fair-use rules for a
// booking calendar this platform does not have. Each label below is the
// linked article's own `q` verbatim, so a tile cannot drift from the
// page it opens, and every href resolves to a live article in HELP. If
// you delete an article, delete its tile in the same commit.
const TOP_TOPICS: { label: string; href: string }[] = [
  { label: "What is RYDA, in one paragraph?", href: "/help/getting-started/what-is-ryda" },
  { label: "Who insures the car I rent?", href: "/help/insurance/coverage" },
  { label: "How do I pay, and does RYDA keep my card?", href: "/help/account/payment-methods" },
  { label: "Cancellations and refunds", href: "/help/bookings/cancellations" },
  { label: "Mileage limits and overages", href: "/help/bookings/mileage" },
  { label: "Who maintains and stores the cars?", href: "/help/maintenance/process" },
  { label: "What do I pay if the car is damaged?", href: "/help/insurance/deductible" },
];

export default function HelpCenterPage() {
  const totalArticles = HELP.reduce((n, c) => n + c.articles.length, 0);

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

          {/* Search, submits to the site-wide /search route which
              indexes vehicles, vs pages, and help. Help-tagged hits
              are surfaced first when the query matches a help-category
              keyword. */}
          <form action="/search" method="get" className="mt-10 max-w-2xl">
            <label className="sr-only" htmlFor="help-search">
              Search help articles
            </label>
            <div className="flex h-14 items-center gap-3 rounded-full border border-rule bg-surface px-6 shadow-sm focus-within:border-red focus-within:ring-2 focus-within:ring-red/20">
              <span className="text-base text-mute">⌕</span>
              <input
                id="help-search"
                name="q"
                type="search"
                placeholder="Search bookings, insurance, payment, mileage…"
                className="h-full flex-1 bg-transparent text-base text-ink placeholder:text-mute focus:outline-none"
              />
              <button
                type="submit"
                className="text-xs font-medium uppercase tracking-[0.18em] text-red hover:text-red-deep"
              >
                Search
              </button>
            </div>
            <p className="mt-3 text-xs text-mute">
              {totalArticles} help articles across {HELP.length} categories.
              Search also covers the rest of the site.
            </p>
          </form>
        </div>
      </section>

      {/* Quick-link tiles */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-wider text-mute">
            Top topics
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TOP_TOPICS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="rounded-full border border-rule bg-surface px-4 py-2 text-sm text-ink-soft hover:text-ink"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {HELP.map((cat) => (
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
                    <li key={a.slug} className="text-ink-soft">
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
            {/* This tile used to advertise "24/7 support for active
                members" behind a phone number. RYDA runs no support
                line — the number was never answered, and /help/
                insurance/roadside and /trust-and-safety both now say
                in writing that there is no RYDA roadside number and no
                24/7 line. An index tile promising the thing its own
                article denies is the contradiction, so the tile points
                at the article instead of at a phone. */}
            <Strip
              title="If you're mid-rental"
              detail="RYDA runs no 24/7 line and dispatches no roadside assistance. The operator who confirmed your booking owns the car and is the fastest route to a tow, a fix, or a swap."
              cta="What to do if the car stops →"
              href="/help/insurance/roadside"
            />
            {/* "within one business day" is deleted from both tiles
                below, and from the CTA underneath. Nothing in this
                codebase measures or enforces a reply time: a contact
                message writes a contact_messages row and emails the
                team, and a help-chat escalation writes a
                help_escalations row and does the same. Neither carries
                an SLA, so neither tile may advertise one.

                The third tile offered a bookable 30-minute consultation
                about "membership, shares, or anything else" — there is
                no membership, no share, no advisor and no calendar to
                book. /contact#consultation still exists and its own copy
                says to put the request in the message instead, so the
                tile now says what that section actually does. */}
            <Strip
              title="Send us a message"
              detail="For general questions, send a message and we'll route it to the right person."
              cta="Open contact form →"
              href="/contact#form"
            />
            <Strip
              title="Rather talk it through?"
              detail="There's no field on the contact form for a call. Put it in the message: what you're after, and when you're reachable."
              cta="Send a note →"
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
            If you're mid-rental, the operator who confirmed your booking
            will always be faster than we can be.
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
  // tel: links must stay as raw <a>; internal paths get <Link> for prefetch.
  const isExternal = href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("http");
  return (
    <div className="flex flex-col rounded-xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{detail}</p>
      {isExternal ? (
        <a
          href={href}
          className="mt-4 text-sm font-medium text-red hover:text-red-deep"
        >
          {cta}
        </a>
      ) : (
        <Link
          href={href}
          className="mt-4 text-sm font-medium text-red hover:text-red-deep"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
