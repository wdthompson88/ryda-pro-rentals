import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { InlineEmailCapture } from "@/components/inline-email-capture";

// Co-ownership parking page (Aug 2026 rental-first pivot). The program
// is parked, not deleted — the original co-own routes (/cars,
// /portfolio, /membership, the old doctrine pages) still exist for
// anyone holding a deep link; they simply left the top nav. This page
// is the one canonical "where did co-ownership go" answer: a single
// quiet section and a waitlist capture. No hard sell.

export const metadata: Metadata = {
  title: "Co-ownership",
  description:
    "RYDA co-ownership is parked while rentals take the road. The founding member cohort opens in 2027 — join the waitlist and you'll hear first.",
  alternates: { canonical: "/co-ownership" },
};

export default function CoOwnershipPage() {
  return (
    <>
      <SiteHeader />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-24 sm:px-10 sm:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Founding member waitlist — 2027
          </p>
          <h1 className="mt-4 font-display text-4xl font-light leading-[1.1] text-ink sm:text-5xl">
            Co-ownership returns in 2027.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            RYDA began as asset-backed co-ownership — one titled car, one
            single-purpose LLC, ten shares. That program is parked while
            rentals take the road, not because the math changed but
            because the order of operations did: the rental marketplace
            comes first, and the founding member cohort forms behind it.
            Leave an email and you&apos;ll hear before anyone else when
            the 2027 cohort opens.
          </p>
          <div className="mt-8 max-w-md">
            <InlineEmailCapture
              source="co-ownership-waitlist"
              buttonLabel="Join the waitlist →"
            />
          </div>
          <p className="mt-4 text-xs text-mute">
            One email when the cohort opens. No drip campaign.
          </p>
        </div>
      </section>
    </>
  );
}
