import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HOW_IT_WORKS_STEPS, FAQ_ITEMS } from "@/lib/boat-content";
import { BOATS_HOLDING_YEARS, BOATS_TARGET_DEPRECIATION_PCT } from "@/lib/boat-data";

export const metadata: Metadata = {
  title: "How RYDA Boats works",
  description:
    "Five steps to a co-ownership share in a RYDA Boat. Same Delaware LLC + Management Services Agreement structure as the cars side, adapted for marine ops.",
};

export default function BoatsHowItWorks() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            How it works · Boat co-ownership
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-tight text-ink sm:text-6xl">
            Member-managed Delaware LLC.{" "}
            <span className="italic text-red">Same doctrine as cars.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft">
            Each boat is held in a single-purpose Delaware LLC. Up to 10
            verified members co-own every hull. RYDA runs operations
            under a separate Management Services Agreement. Boats hold
            for {BOATS_HOLDING_YEARS} years (vs cars at 2) — different
            depreciation curve, same structure.
          </p>
        </div>
      </section>

      {/* 5 steps */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Lifecycle
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            From application to your first run.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div key={s.n}>
                <p className="font-display text-sm text-red">{s.n}</p>
                <p className="mt-3 font-display text-xl text-ink">{s.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The numbers */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            The numbers, exactly
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Every share, in six numbers.
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Co-owners per hull" value="10" />
            <Stat label="Days / share / yr" value="30" />
            <Stat label="Nautical miles / share / yr" value="1,500" />
            <Stat label="Planned exit" value={`${BOATS_HOLDING_YEARS} yrs`} />
            <Stat label="Modeled depreciation" value={`${BOATS_TARGET_DEPRECIATION_PCT}%`} />
            <Stat label="Transfer min hold" value="12 mo" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            The boat-side questions members ask first.
          </h2>
          <ul className="mt-12 space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <li
                key={i}
                className="rounded-2xl border border-rule bg-surface p-6"
              >
                <p className="font-display text-lg text-ink">{item.q}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            See if a RYDA Boat share fits.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Schedule a 30-minute call. Real conversation, real numbers,
            no commitment.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/boats/portfolio"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-cream-2/40 p-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink tabular-nums">{value}</p>
    </div>
  );
}
