import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Platform Disclaimer" };

// DRAFT — rewritten for the rental product on 2026-08-12 and NOT yet
// reviewed by counsel. This page was previously the Co-Ownership
// Disclaimer: nine sections on LLC membership interests, member-to-
// member transfer, and securities framing, none of which apply to a
// rental-only platform. It is linked from the footer legal strip on
// every page, so it could not simply be left stale.
//
// "luxury" deleted from the intro: the browse grid runs from everyday
// SUVs and a Toyota through exotics, and every other surface says
// "everyday to exotic". A disclaimer should not describe a narrower
// platform than the one it disclaims.
export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Platform Disclaimer"
      lastUpdated="August 12, 2026"
      counselNote="This version has been rewritten for RYDA's rental product and is pending review by counsel."
      intro="RYDA is a referral platform for vehicle rentals. The vehicles listed here are owned and operated by independent rental operators. RYDA is not the lessor, does not take custody of any vehicle, and is not a party to your rental agreement. This page explains what that means in practice."
      sections={[
        {
          heading: "1. What RYDA is",
          body: "RYDA lists vehicles that independent operators own and operate, and passes booking requests to them. When a booking completes, the operator pays RYDA a referral commission. That commission is how the platform makes money, and it is collected from the operator, not added to your price.",
        },
        {
          heading: "2. What RYDA is not",
          body: "RYDA does not own, lease, store, insure, maintain, register, or operate any vehicle on this platform. RYDA does not employ or supervise the operators or their drivers. RYDA is not a rental car company, a broker of insurance, or a party to the rental agreement you sign with an operator.",
        },
        {
          heading: "3. Your contract is with the operator",
          body: "Every rental closes on the operator's own agreement, insurance, and terms. Deposits, cancellation and refund rights, mileage limits, fuel policy, additional-driver rules, and responsibility for damage are all set by that agreement. Read it: it governs the rental, and it may differ between operators and between vehicles.",
        },
        {
          heading: "4. Prices and availability are indicative until confirmed",
          body: "Prices and availability shown on the platform are supplied by operators and are indicative. They are not offers, and they are not quoted prices. A vehicle is not reserved when you send a request. The operator confirms the final price and availability directly with you, and either can change before that confirmation.",
        },
        {
          // "Vetting" is the word this heading used to open with.
          // It is defined in exactly one place, /trust-and-safety#vetting,
          // and a LegalPage section is a plain string that cannot link
          // there — so the word is dropped. "Review" is what the body of
          // this very section already calls it, so nothing new is
          // asserted by the retitle.
          heading: "5. Review is not a warranty",
          body: "RYDA reviews the operators it lists, including their business and bank details through Stripe's onboarding checks. That review is not a guarantee of an operator's conduct, the condition or safety of a vehicle, the validity of any insurance, or compliance with any law. RYDA makes no warranty on those subjects.",
        },
        {
          heading: "6. How payment works",
          body: "No card is taken when you send a request. If a booking is agreed, RYDA emails a Stripe Checkout link. The charge is created on the operator's own connected Stripe account: the rental price is paid to the operator, and RYDA's commission is collected as a platform fee on the same charge. Refunds are handled by the operator under their agreement.",
        },
        {
          heading: "7. Nothing here is an offer of an ownership interest",
          body: "Nothing on this platform is an offer to sell, or a solicitation of an offer to buy, any ownership stake, membership interest, security, or investment product. RYDA is not a registered broker, dealer, exchange, or investment adviser. Renting a vehicle through RYDA conveys no ownership interest of any kind and no expectation of financial return.",
        },
        {
          heading: "8. Contact",
          body: "Questions about this disclaimer should be addressed via the RYDA contact form at /contact.",
        },
      ]}
    />
  );
}
