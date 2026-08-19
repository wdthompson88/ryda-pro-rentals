import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of Service" };

// DRAFT — rewritten for the rental product on 2026-08-12 and NOT yet
// reviewed by counsel. The previous version bound every user to a
// Co-Owner Agreement and an LLC Operating Agreement, and charged for
// three membership tiers, none of which exist in this product. That
// was worse than a draft, so this replaces it. The counselNote on the
// page says so to the reader. Remove that note only when a lawyer has
// actually signed off.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="August 12, 2026"
      counselNote="This version has been rewritten for RYDA's rental product and is pending review by counsel."
      intro="These Terms govern your use of the RYDA platform. RYDA lists vehicles owned and operated by independent rental operators and passes your booking request to them. The rental itself is a contract between you and the operator, on the operator's own rental agreement, which takes precedence on the subjects it covers."
      sections={[
        {
          heading: "1. Acceptance of these Terms",
          body: "By creating an account or using the RYDA platform, you agree to these Terms and our Privacy Policy. If you don't agree, don't use the service.",
        },
        {
          heading: "2. What RYDA does",
          body: "RYDA is a referral platform. We list vehicles that independent operators own and operate, we pass your request to the operator, and we earn a commission from the operator when a booking completes. RYDA does not own, store, insure, maintain, or operate any vehicle listed on the platform, and RYDA is not a party to your rental agreement.",
        },
        {
          heading: "3. Eligibility",
          body: "You must be at least 18 years old to hold a RYDA account. Eligibility to rent a specific vehicle is set by the operator, not by RYDA, and typically includes a minimum age, a valid driver's licence, proof of insurance, and a security deposit. Those requirements are the operator's and may differ between operators and between vehicles.",
        },
        {
          heading: "4. Your account",
          body: "You are responsible for keeping your login credentials secure and for all activity on your account. Do not share your account with anyone else. You agree that the information you give us, including the details we pass to an operator, is accurate.",
        },
        {
          heading: "5. Requests and confirmation",
          body: "Sending a request through RYDA does not create a booking and does not reserve a vehicle. No card is taken at request. The operator confirms availability and the final price directly with you. Prices shown on the platform are indicative until the operator confirms them, and availability can change before confirmation.",
        },
        {
          heading: "6. Payment",
          body: "If you and the operator agree on a booking, RYDA sends you a Stripe Checkout link. That charge is created on the operator's own connected Stripe account: the rental price is paid to the operator, and RYDA's commission is collected as a platform fee on the same charge. Deposits, cancellation terms, refunds, mileage limits, fuel policy, and damage responsibility are governed by the operator's rental agreement, not by these Terms.",
        },
        {
          heading: "7. Cancellations and disputes with an operator",
          body: "Cancellation and refund rights are set by the operator's rental agreement. Disputes about a rental, a vehicle, a deposit, or damage are between you and the operator. RYDA will provide the booking records we hold and will help where we reasonably can, but RYDA is not the counterparty to those disputes and cannot adjudicate them.",
        },
        {
          heading: "8. Prohibited conduct",
          body: "You may not: misrepresent your identity; use the platform to arrange a rental you intend to complete off-platform in order to avoid operator or RYDA terms; scrape, reverse-engineer, or overload the platform; or use RYDA for any illegal purpose. Restrictions on how a vehicle may be used, including track use, racing, off-roading, and unauthorised additional drivers, are set by the operator's rental agreement.",
        },
        {
          heading: "9. Intellectual property",
          body: "All content on the RYDA platform, including code, design, brand, and photography, belongs to RYDA or our licensors. Vehicle images supplied by an operator remain that operator's property or their licensors'.",
        },
        {
          heading: "10. Disclaimers and limitation of liability",
          body: "The platform is provided “as is.” RYDA makes no warranty about the condition, safety, legality, insurance, or availability of any vehicle listed, or about the conduct of any operator. To the fullest extent permitted by law, RYDA is not liable for indirect, consequential, or incidental damages. Nothing in these Terms limits liability that cannot be limited under applicable law.",
        },
        {
          heading: "11. Indemnification",
          body: "You agree to indemnify RYDA from third-party claims arising out of your use of the platform, your rental of a vehicle, or your breach of these Terms, except to the extent caused by RYDA's gross negligence or wilful misconduct.",
        },
        {
          heading: "12. Dispute resolution",
          body: "These Terms are governed by the laws of the State of Florida. Disputes between you and RYDA will be resolved by binding arbitration administered by JAMS, except for small-claims matters, which may be brought in court. Class actions and class arbitrations are waived. This clause governs disputes with RYDA only; disputes with an operator are covered by that operator's rental agreement.",
        },
        {
          heading: "13. Changes to these Terms",
          body: "We may update these Terms with at least 30 days' notice. Your continued use after the effective date means you accept the updated Terms.",
        },
        {
          heading: "14. Contact",
          body: "RYDA LLC, Miami, FL. Email: legal@ryda.pro.",
        },
      ]}
    />
  );
}
