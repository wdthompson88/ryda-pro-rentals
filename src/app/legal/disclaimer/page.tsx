import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Co-Ownership Disclaimer — RYDA" };

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Co-Ownership Disclaimer"
      lastUpdated="April 28, 2026"
      intro="RYDA is a luxury access platform. Co-ownership stakes are LLC membership interests in member-managed LLCs that hold specific vehicles. They are NOT shares of RYDA LLC, NOT registered securities, and NOT offered for investment purposes. This page explains the legal framework for what co-owners are buying, how the LLCs are governed, and what RYDA's role is."
      sections={[
        {
          heading: "1. What you are buying",
          body: "Each co-ownership share on the RYDA platform is a membership interest in a single-purpose LLC formed to hold and operate a specific vehicle. The LLC's only assets are the vehicle, its insurance and operating reserves, and a Management Services Agreement with RYDA for operational services. The LLC is treated as a partnership for US federal income tax purposes.",
        },
        {
          heading: "2. The LLC is member-managed",
          body: "Each LLC is member-managed. The members (the co-owners) hold authority over material decisions including sale of the vehicle, replacement, modifications, and renewal of the Management Services Agreement with RYDA. RYDA does not manage the LLC. RYDA is hired by the LLC's members to perform specific operational services.",
        },
        {
          heading: "3. Co-ownership is not an investment",
          body: "Co-ownership stakes are not registered securities and are not offered for investment purposes. RYDA is not a registered broker-dealer, investment adviser, or fund manager. The cars are depreciating consumption goods — like a country-club membership or a jet card. Members buy for use, not for financial return. Members should not expect appreciation, yield, or any guaranteed economic benefit.",
        },
        {
          heading: "4. Member-to-member transfer",
          body: "After a 12-month minimum holding period, members may transfer their share to another verified RYDA member. RYDA facilitates the LLC paperwork. Settlement is typically 1–3 business days. RYDA charges a 3% transfer fee on completed transfers. There is no public marketplace, no order book, and no broker-dealer or alternative trading system.",
        },
        {
          heading: "5. Indicative reference numbers",
          body: "Any reference numbers displayed on the RYDA platform — including the LLC's annual insurance agreed value and a current condition/comparable-cost summary — are indicative context, not bids, offers, or quoted prices on any exchange. RYDA does not publish a transfer price for any share. Members negotiating a transfer set their own price.",
        },
        {
          heading: "6. Risk factors (non-exhaustive)",
          body: "Vehicles depreciate. Co-ownership stakes can be worth less when you exit than when you entered. Membership interests are illiquid by design — you may not be able to transfer when you wish or at the price you wish. Operating expenses are real and ongoing. Insurance and storage partners may change. RYDA's management services are subject to fees disclosed in the Operating Agreement and Management Services Agreement.",
        },
        {
          heading: "7. Tax",
          body: "RYDA does not provide tax advice. Co-ownership of a luxury vehicle for personal access is generally a non-deductible personal-use expense (IRS Pub. 946 / IRC §280F). Members should consult their own advisors regarding the tax consequences of purchasing, holding, and transferring a co-ownership share.",
        },
        {
          heading: "8. Forward-looking statements",
          body: "Any projections, estimates, or forward-looking statements on the RYDA platform are based on assumptions that may not prove correct. RYDA does not guarantee any operational, valuation, or experiential outcome.",
        },
        {
          heading: "9. Contact",
          body: "Questions about this disclaimer should be addressed via the RYDA contact form at /contact.",
        },
      ]}
    />
  );
}
