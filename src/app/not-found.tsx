import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Not found — RYDA" };

const POPULAR = [
  { label: "See the fleet", href: "/markets", note: "Co-ownership shares" },
  { label: "Browse rentals", href: "/rent", note: "Daily rates from $1,200" },
  { label: "How it works", href: "/how-it-works", note: "The 5-step explainer" },
  { label: "Sample documents", href: "/sample-documents", note: "Operating Agreement, MSA, more" },
  { label: "Membership tiers", href: "/membership", note: "Core · Blue · Black" },
  { label: "Contact us", href: "/contact", note: "Real humans, fast replies" },
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
              key={p.href}
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
