import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";

export const metadata = { title: "Not found" };

// A 404 is the one page guaranteed to be reached by a stale link, so
// every destination here has to resolve. Three of these used to point
// at /portfolio, /sample-documents and /membership.
//
// "Where we operate" pointed at /locations, a market index for a
// single-market marketplace: it listed two cities with no cars in them
// alongside the one that has them. Index and both empty city pages are
// deleted, so this card points at the browse grid instead — where the
// question "where do you operate" is answered by the listings
// themselves. Every car in PARTNER_VEHICLES has market: "Miami", and
// the field's type is the literal "Miami", so that is the whole answer.
// Two cards share the /rent href, hence the label-keyed map below.
//
// Two notes on these cards were invented and are gone (Aug 2026):
//   · "Daily rates from $1,200" — a floor 14x the real one. Replacing
//     it with a derived minimum was the wrong fix and that has now gone
//     too: a "from $X" is a fleet-wide rate claim whichever way it is
//     computed, and partner-fleet.ts is the operator's rate table, not
//     RYDA's headline. The card states the count and nothing else.
//   · "Real humans, fast replies" — nothing in this repo measures or
//     queues against a reply time. /api/contact writes a row and emails
//     the team inbox; /faq explicitly refuses to put a number on it.

const POPULAR = [
  {
    label: "Browse the fleet",
    href: "/rent",
    note: `${PARTNER_VEHICLES.length} cars`,
  },
  { label: "How it works", href: "/how-it-works", note: "Browse, request, the operator confirms" },
  { label: "Where we operate", href: "/rent", note: "Every listing is in Miami" },
  { label: "For partners", href: "/partners", note: "List your fleet with RYDA" },
  { label: "Help center", href: "/help", note: "Answers to the common ones" },
  { label: "Contact us", href: "/contact", note: "Send the team a note" },
];

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-display text-8xl text-red sm:text-9xl">404</p>
          <h1 className="mt-6 font-display text-3xl text-ink sm:text-4xl">
            That page took the long way home.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-soft">
            We can't find what you were looking for. Could be moved, could be
            renamed, could be a typo. Here are some popular destinations:
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className="group block rounded-2xl border border-rule bg-surface p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-display text-base text-ink">{p.label}</p>
              <p className="mt-1 text-xs text-mute">{p.note}</p>
              <p className="mt-3 text-xs font-medium text-red group-hover:text-red-deep">
                Go →
              </p>
            </Link>
          ))}
        </div>

        <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
          >
            Back to home →
          </Link>
          <Link
            href="/help"
            className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
          >
            Search help center
          </Link>
        </div>
      </section>
    </>
  );
}
