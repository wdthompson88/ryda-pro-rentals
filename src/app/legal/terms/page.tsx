import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of Service — RYDA" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="April 27, 2026"
      intro="These Terms govern your use of the RYDA platform. They are separate from the Co-Owner Agreement and LLC Operating Agreement, which apply only after you claim a co-ownership share and which take precedence on the topics they cover."
      sections={[
        {
          heading: "1. Acceptance of these Terms",
          body: "By creating an account or using the RYDA platform, you agree to these Terms and our Privacy Policy. If you don't agree, don't use the service.",
        },
        {
          heading: "2. Eligibility",
          body: "You must be at least 28 years old, have a valid US driver's license, pass identity verification (KYC), and meet our underwriting standards. No accredited-investor status or financial qualification is required — RYDA is a luxury access platform, not an investment platform.",
        },
        {
          heading: "3. Your account",
          body: "You are responsible for keeping your login credentials secure and for all activity on your account. Do not share your account with anyone else.",
        },
        {
          heading: "4. Membership tiers and fees",
          body: "RYDA offers three membership tiers (Core, free; Blue, $500/yr; Black, $1,500/yr). Founding-100 members lock $350/$1,000 for life. Tier benefits are described on our Membership page and may change with notice.",
        },
        {
          heading: "5. Rentals",
          body: "Rentals are subject to a separate Rental Agreement presented at booking. Insurance, mileage caps, fuel policy, and damage responsibility are detailed there.",
        },
        {
          heading: "6. Co-ownership and legal interests",
          body: "Co-ownership stakes are membership interests in member-managed single-purpose Delaware LLCs, governed by the LLC Operating Agreement and the Management Services Agreement between each LLC and RYDA. RYDA is not a registered broker, dealer, exchange, or investment adviser. Co-ownership stakes are not registered securities and are not offered for investment purposes. See the Co-Ownership Disclaimer for more.",
        },
        {
          heading: "7. Prohibited conduct",
          body: "You may not: misuse the cars (track use without authorization, race driving, off-roading); allow unauthorized drivers; misrepresent your identity or financial status; reverse-engineer or scrape the platform; or use RYDA for any illegal purpose.",
        },
        {
          heading: "8. Intellectual property",
          body: "All content on the RYDA platform — code, design, brand, vehicle photography — belongs to RYDA or our licensors.",
        },
        {
          heading: "9. Disclaimers and limitation of liability",
          body: "The platform is provided &ldquo;as is.&rdquo; To the fullest extent permitted by law, RYDA is not liable for indirect, consequential, or incidental damages. Nothing in these Terms limits liability that cannot be limited under applicable law.",
        },
        {
          heading: "10. Indemnification",
          body: "You agree to indemnify RYDA from third-party claims arising out of your use of the platform or breach of these Terms, except to the extent caused by RYDA's gross negligence or willful misconduct.",
        },
        {
          heading: "11. Dispute resolution",
          body: "These Terms are governed by Delaware law. Disputes will be resolved by binding arbitration administered by JAMS, except for small-claims matters which may be brought in court. Class actions and class arbitrations are waived.",
        },
        {
          heading: "12. Changes to these Terms",
          body: "We may update these Terms with at least 30 days' notice. Your continued use after the effective date means you accept the updated Terms.",
        },
        {
          heading: "13. Contact",
          body: "RYDA LLC, Miami, FL. Email: legal@ryda.com.",
        },
      ]}
    />
  );
}
