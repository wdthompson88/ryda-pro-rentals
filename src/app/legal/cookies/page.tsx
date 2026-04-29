import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Cookie Policy — RYDA" };

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated="April 27, 2026"
      intro="We use a small number of cookies — only what's needed to run the site and to understand how it's used. We don't sell your data. We don't run ad-tracker cookies."
      sections={[
        {
          heading: "1. What cookies are",
          body: "Cookies are small text files stored by your browser. They help websites remember your session and preferences, and let us measure usage anonymously.",
        },
        {
          heading: "2. Cookies we use",
          body: "Strictly necessary — Session cookies that keep you logged in and let you fill out forms (provided by Supabase Auth and Vercel).\n\nAnalytics — Vercel Analytics + PostHog product analytics. These collect anonymized usage data — page views, click paths, errors. They do not identify you personally and they don't follow you off RYDA.\n\nPreferences — Remember your selected market filter and tier choice. Stored locally in your browser.",
        },
        {
          heading: "3. Cookies we DO NOT use",
          body: "Cross-site advertising trackers. Facebook Pixel. Google Ads cookies. LinkedIn Insight tag. We are intentionally not in any ad-retargeting network.",
        },
        {
          heading: "4. How to control cookies",
          body: "You can block or delete cookies via your browser settings. Note that blocking strictly-necessary cookies may break login. The site shows a one-time cookie consent banner; your choice is remembered for 12 months.",
        },
        {
          heading: "5. Updates",
          body: "We update this list whenever we add or remove a tracking provider. The effective date at the top reflects the most recent change.",
        },
        {
          heading: "6. Contact",
          body: "Email privacy@ryda.com with any cookie-related questions.",
        },
      ]}
    />
  );
}
