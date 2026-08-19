import { LegalPage } from "@/components/legal-page";

// Accessibility Statement. Every claim here has to be checkable against
// this repo, because this is the page a regulator or a complainant
// reads first.
//
// Deleted in the truth pass, not reworded:
//   - Section 3 described work on "the order-panel state", "the price
//     chart so screen readers can read history values" and "aria-pressed
//     states on toggle buttons (timeframe selector, buy/sell tabs)".
//     That is a share-trading interface. It does not exist in this repo
//     and RYDA sells no ownership stake, so the page was the clearest
//     written statement on the site that it does.
//   - "automated tooling (axe-core in CI)" — .github/workflows/verify.yml
//     runs typecheck, test and build; axe is not a dependency.
//   - "a third-party audit is scheduled before public launch" (twice) —
//     no audit is referenced anywhere, and the site is live.
//   - Browser/screen-reader test matrix — playwright.config.ts enables
//     the chromium project only; Firefox, WebKit, Edge and the mobile
//     projects are commented out, and nothing in the repo runs VoiceOver
//     or NVDA.
//   - "aim to acknowledge within 2 business days" — nothing measures,
//     queues or escalates against a response time.
//   - accessibility@ryda.pro — an address that appears nowhere else in
//     the codebase. Feedback now points at /contact, a route that exists
//     and writes a contact_messages row.

export const metadata = { title: "Accessibility Statement" };

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility Statement"
      lastUpdated="August 13, 2026"
      intro="RYDA aims to make ryda.pro usable by as many people as possible, including people with disabilities. We build towards the WCAG 2.1 Level AA standard."
      sections={[
        {
          heading: "1. Conformance status",
          body: "We target WCAG 2.1 Level AA. RYDA has not been audited against that standard by a third party, and we do not claim conformance — this statement describes what we do, not a certification.\n\nKnown areas of work: consistent ARIA labelling across form inputs, contrast verification on accent colours, and keyboard-only navigation through the rental request flow.",
        },
        {
          heading: "2. What the site does today",
          body: "Semantic HTML throughout — headings, landmarks and lists used for what they are.\n\nInteractive elements are reachable by keyboard and keep a visible focus ring.\n\nForm errors are announced to screen readers rather than shown by colour alone.\n\nToggle controls expose their state (aria-pressed) instead of relying on styling.\n\nLayout is responsive and reflows rather than requiring horizontal scrolling.",
        },
        {
          heading: "3. What we're working on",
          body: "Alternative text on vehicle photography — short, descriptive, never decorative-only.\n\nChecking the rental request flow end to end with the keyboard alone.\n\nContrast verification on accent colours where they sit on dark panels.",
        },
        {
          heading: "4. Assessment approach",
          body: "Self-evaluation and manual testing during development. RYDA does not currently run an automated accessibility checker in CI, and no third-party audit has been carried out. If either changes, this page will say so and name the tool or the firm.",
        },
        {
          heading: "5. Feedback",
          body: "If you hit an accessibility barrier, please tell us through the contact form at ryda.pro/contact. Include the page address, what you were trying to do, and the device and browser you were using — that is usually enough for us to reproduce it. We treat accessibility problems as bugs rather than requests.",
        },
      ]}
    />
  );
}
