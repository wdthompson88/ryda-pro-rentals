import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { FAQ_ITEMS } from "@/lib/boat-content";

export const metadata = {
  title: "FAQ — RYDA Boats",
  description:
    "Answers to the most common questions about RYDA Boats: co-ownership, captain protocol, slip rotation, hurricane prep, charter opt-in, exit doctrine.",
};

// Boats FAQ leverages the same FAQ_ITEMS used in /boats/how-it-works,
// plus a few co-ownership questions shared with the cars side that
// apply equally to boats.
const SHARED_CO_OWNERSHIP: { q: string; a: string }[] = [
  {
    q: "What am I actually buying?",
    a: "A membership interest in a single-purpose LLC that owns a specific yacht. The LLC's only assets are the vessel, its insurance/operating reserves, and a management contract with RYDA. You hold a registered legal interest, not a club point.",
  },
  {
    q: "How many co-ownership shares per hull?",
    a: "10 shares per hull by default. Each share entitles you to ~30 days and up to ~1,600 nautical miles of usage per year (50 nm/day allowance). A single member can hold one share or several — usage scales linearly.",
  },
  {
    q: "Are RYDA Boats co-ownership stakes securities?",
    a: "No. RYDA is a luxury access platform, not an investment platform. Each boat is held in a member-managed LLC where you and up to 4 other co-owners hold authority over material decisions; RYDA is hired as a service provider via a separate Management Services Agreement. Co-ownership stakes are not registered securities and are not offered for investment purposes. No accredited-investor verification required.",
  },
  {
    q: "Can I transfer my share whenever I want?",
    a: "After a 12-month minimum hold, yes — directly to another verified RYDA member. RYDA facilitates the LLC paperwork and Coast Guard documentation transfer. There is no public marketplace and no order book. Settlement takes 3–5 business days. RYDA charges a 3% transfer fee on the agreed price.",
  },
  {
    q: "What if a co-owner stops paying?",
    a: "The LLC's Operating Agreement has remedies, including forced transfer of the delinquent share. RYDA also keeps a maintenance reserve at the LLC level so slip, captain, and insurance continue uninterrupted while it's resolved.",
  },
];

export default function BoatsFaqPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">
            RYDA Boats · FAQ
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            The boat-side questions{" "}
            <span className="italic">members ask first.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Co-ownership structure, slip rotation, captain protocol,
            hurricane prep, charter opt-in, and the 3-year exit. Shorter
            and direct.
          </p>
        </div>
      </section>

      {/* Co-ownership shared section — expandable details, matches
          /faq accordion pattern. */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Co-ownership
          </h2>
          <div className="mt-10 space-y-4">
            {SHARED_CO_OWNERSHIP.map((qa) => (
              <details
                key={qa.q}
                className="group rounded-xl border border-rule bg-surface p-5"
              >
                <summary className="cursor-pointer list-none font-display text-lg text-ink marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    <span>{qa.q}</span>
                    <span className="text-2xl text-marine transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  {qa.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Boat-specific operations — same expandable pattern */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Operations
          </h2>
          <div className="mt-10 space-y-4">
            {FAQ_ITEMS.map((qa) => (
              <details
                key={qa.q}
                className="group rounded-xl border border-rule bg-surface p-5"
              >
                <summary className="cursor-pointer list-none font-display text-lg text-ink marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    <span>{qa.q}</span>
                    <span className="text-2xl text-marine transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  {qa.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Still have a question?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            We answer every email. The team is small and the inboxes are
            real.
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
              Email us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
