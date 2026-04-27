import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Securities Disclaimer — RYDA" };

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Securities Disclaimer"
      lastUpdated="April 27, 2026"
      intro="RYDA shares are LLC membership interests in single-purpose Delaware limited liability companies that own specific vehicles. They are NOT shares of RYDA LLC, NOT registered securities, and NOT cleared by any government agency. This page sets out the legal framework for the share-purchase and member-to-member secondary market."
      counselNote="This page must be reviewed and approved by securities counsel before any share-purchase flow goes live. The text below is a placeholder approximation; the canonical version will be issued by counsel and may differ materially."
      sections={[
        {
          heading: "1. What you are buying",
          body: "Each &ldquo;share&rdquo; on the RYDA platform represents a fractional membership interest in a Delaware single-purpose LLC formed to acquire and operate a specific vehicle. The LLC's only assets are the vehicle, its insurance and operating reserves, and contracts with RYDA for management services. The LLC is taxed as a partnership for US federal income tax purposes.",
        },
        {
          heading: "2. The shares are not registered securities",
          body: "The membership interests are offered in reliance on Rule 506(c) of Regulation D under the Securities Act of 1933. Sales are limited to verified accredited investors. The interests have not been registered under the Securities Act or any state securities laws.",
        },
        {
          heading: "3. Member-to-member secondary market",
          body: "After a 12-month minimum holding period, members may list their share for sale on RYDA's member-only secondary market. Trades match against other verified, accredited members under the LLC Operating Agreement. Settlement is typically 1–3 business days. RYDA is not a registered broker-dealer, exchange, or alternative trading system. RYDA charges a 3% transfer commission on completed sales.",
        },
        {
          heading: "4. Indicative pricing",
          body: "Prices displayed on the RYDA Markets page reflect (a) the current ask listed by members, (b) the most recent member-to-member transactions, and (c) RYDA's indicative valuation of the underlying vehicle. They are not bids on a registered exchange.",
        },
        {
          heading: "5. Risk factors (non-exhaustive)",
          body: "Vehicle values can rise or fall. Membership interests are illiquid by nature; you may not be able to sell when you wish or at the price you wish. Operating expenses are real and ongoing. Insurance and storage partners may change. RYDA's management services are subject to fees disclosed in the Co-Owner Agreement. There is no guarantee of return, and you can lose part or all of your investment.",
        },
        {
          heading: "6. Forward-looking statements",
          body: "Any projections, estimates, or forward-looking statements on the RYDA platform are based on assumptions that may not prove correct. Past performance is not indicative of future results.",
        },
        {
          heading: "7. Tax",
          body: "RYDA does not provide tax advice. Members should consult their own advisors regarding the tax consequences of purchasing, holding, and disposing of a share.",
        },
        {
          heading: "8. Contact",
          body: "Questions about this disclaimer should be addressed to legal@ryda.com.",
        },
      ]}
    />
  );
}
