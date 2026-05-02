import { SiteHeader } from "@/components/site-header";
import { InvestorInquiryForm } from "@/components/investor-inquiry-form";

// /investors — public-facing investor contact surface only.
// Detailed numbers, projections, and the pitch deck are intentionally
// confidential — the team emails the deck (PDF) directly to qualified
// inquirers. The deck is no longer accessible from the public web.

export const metadata = {
  title: "RYDA — Investor inquiry",
  description:
    "Investor inquiry for RYDA — US member-managed supercar co-ownership. Qualified investors receive a confidential deck via email.",
};

export default function InvestorsPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-rule bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:px-10 sm:py-36">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cream/70">
            For qualified investors
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl">
            RYDA is raising{" "}
            <span className="italic">a seed round.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-cream/85">
            RYDA is a US member-managed supercar co-ownership platform —
            structured around real LLC ownership of real vehicles, with
            concierge operations under a separate Management Services
            Agreement. We&apos;re raising a $2.5M seed to launch Miami in
            Q3 2026 and reach 20 vehicles + 120 co-owners + $1.2M ARR by
            Year 3.
          </p>
          <p className="mt-5 max-w-2xl text-sm text-cream/70">
            The full deck, model, and structural diligence pack are
            confidential. Tell us a little about who you are and we&apos;ll
            email the deck within one business day.
          </p>
        </div>
      </section>

      {/* Inquiry form */}
      <section id="request-deck" className="border-b border-rule">
        <div className="mx-auto max-w-2xl px-6 py-20 sm:px-10 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-mute">
            Request the deck
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Send a quick inquiry.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            Name, email, optional firm, anticipated check size. The team
            replies with the deck (PDF) and structural diligence pack
            attached. We respond to every qualified investor inquiry
            within one business day.
          </p>
          <InvestorInquiryForm />
          <p className="mt-8 text-xs text-mute">
            By submitting, you agree the deck and any materials we send
            are confidential and not for distribution.
          </p>
        </div>
      </section>

      {/* Disclaimer footer */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-12 text-center text-xs text-mute sm:px-10">
          <p>
            This page is provided for informational purposes for
            qualified, accredited investors evaluating RYDA. It is not
            an offer or solicitation to sell securities. Co-ownership
            stakes themselves are not registered securities and not
            offered for investment purposes.
          </p>
        </div>
      </section>
    </>
  );
}
