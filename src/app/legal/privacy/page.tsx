import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy Policy — RYDA" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="April 27, 2026"
      intro="This page describes how RYDA LLC (&ldquo;RYDA&rdquo;, &ldquo;we&rdquo;) collects, uses, and protects your personal information. We treat your data the way we'd want our own treated, only what we need, only for as long as we need it, never sold."
      sections={[
        {
          heading: "1. Who we are",
          body: "RYDA is operated by RYDA LLC, a limited liability company headquartered in Miami, FL.",
        },
        {
          heading: "2. What we collect",
          body: "Account information you provide (name, email, phone, address, date of birth, driver's license).\n\nIdentity verification data (government ID, selfie liveness check) and driving record check collected via our KYC partner.\n\nPayment information (handled by our payment processor; we never see full card numbers).\n\nUsage data (pages viewed, features used, device type, IP address) to operate and improve the platform.\n\nVehicle telematics, where applicable, to verify trip starts/ends and detect abuse.",
        },
        {
          heading: "3. How we use your information",
          body: "To verify your identity and eligibility for membership.\n\nTo facilitate rentals and co-ownership share onboarding, including LLC documents, payments, and member records.\n\nTo communicate about your account, bookings, billing, and changes to our service.\n\nTo prevent fraud, enforce our Terms of Service, and comply with the law.",
        },
        {
          heading: "4. How we share your information",
          body: "We share information with: identity verification partners (KYC), payment processors, insurance carriers, our managed-storage and roadside partners, and legal/regulatory authorities when required by law.\n\nWe do not sell your personal information.",
        },
        {
          heading: "5. Your rights",
          body: "You can access, correct, or delete the personal information we hold about you. California residents have additional rights under the CCPA, including the right to opt out of any data sharing for cross-context behavioral advertising. Email privacy@ryda.com to exercise these rights.",
        },
        {
          heading: "6. Data retention",
          body: "We keep your information for as long as your account is active and for a reasonable period after, typically 7 years for transactional records, in line with US tax and securities recordkeeping requirements.",
        },
        {
          heading: "7. Security",
          body: "We use industry-standard administrative, technical, and physical safeguards. No system is perfectly secure, but we treat your data with the same care we treat the cars in our fleet.",
        },
        {
          heading: "8. Children's privacy",
          body: "RYDA is not directed to anyone under 28. We do not knowingly collect information from minors.",
        },
        {
          heading: "9. Changes to this policy",
          body: "We will post material changes here and notify members by email at least 14 days before they take effect.",
        },
        {
          heading: "10. Contact",
          body: "RYDA LLC, Miami, FL. Email: privacy@ryda.com.",
        },
      ]}
    />
  );
}
