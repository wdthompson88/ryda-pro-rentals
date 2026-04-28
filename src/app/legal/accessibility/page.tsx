import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Accessibility Statement — RYDA" };

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility Statement"
      lastUpdated="April 27, 2026"
      intro="RYDA is committed to making our website usable by as many people as possible, including people with disabilities. We design and build to the WCAG 2.1 Level AA standard."
      sections={[
        {
          heading: "1. Conformance status",
          body: "We target WCAG 2.1 Level AA. The site is in active development and a third-party audit is scheduled before public launch. Known areas of work-in-progress: ARIA labels on form inputs and form controls, color-contrast verification on accent colors, and keyboard-only navigation for the co-ownership claim flow.",
        },
        {
          heading: "2. What we've done",
          body: "Semantic HTML throughout (proper headings, landmarks, lists).\n\nKeyboard-navigable interactive elements with visible focus states.\n\nColor palette tested for AA contrast on all body text.\n\nResponsive layout that adapts to text-only zoom up to 200%.\n\nForms that announce errors to screen readers.",
        },
        {
          heading: "3. What we're working on",
          body: "Live-region announcements when the order-panel state changes.\n\nAccessible data-table fallback for the price chart so screen readers can read history values.\n\naria-pressed states on toggle buttons (timeframe selector, buy/sell tabs).\n\nBetter alternative-text discipline on vehicle photography — short, descriptive, never decorative-only.",
        },
        {
          heading: "4. Compatibility",
          body: "We test on the latest two versions of Chrome, Safari, Firefox, and Edge on desktop, plus iOS Safari and Android Chrome on mobile. Screen reader testing is performed with VoiceOver (macOS/iOS) and NVDA (Windows).",
        },
        {
          heading: "5. Feedback",
          body: "If you experience an accessibility barrier, please tell us. Email accessibility@ryda.com with a description of the problem, the URL, and what device/browser you were using. We treat accessibility issues as priority bugs and aim to acknowledge within 2 business days.",
        },
        {
          heading: "6. Assessment approach",
          body: "RYDA uses a combination of self-evaluation, automated tooling (axe-core in CI), manual testing, and a third-party audit prior to public launch. The audit firm and date will be added to this page when scheduled.",
        },
      ]}
    />
  );
}
