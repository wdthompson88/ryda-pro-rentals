import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { CookieBanner } from "@/components/cookie-banner";
import { AnalyticsBootstrap } from "@/components/analytics-bootstrap";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Display serif for headlines, Fraunces stands in well for the spec's "Canela"
// (Canela is paid; we can swap later when you license it).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

// Resolve absolute URLs in metadata (OG image, etc). Always uses the
// canonical public domain, NOT the per-deployment URL like
// `ryda-xxxxxx-moocow4844s-projects.vercel.app`, which is gated by
// Vercel deployment protection and unreachable to OG scrapers.
// Set NEXT_PUBLIC_SITE_URL on Vercel once a custom domain (ryda.pro)
// is wired up.
// Default to the canonical production domain — once ryda.pro is
// registered + DNS'd, NEXT_PUBLIC_SITE_URL on production should
// match this same value, so this fallback only applies to preview /
// local dev. Pre-launch, set NEXT_PUBLIC_SITE_URL to the actual
// preview URL to avoid OG scrapers fetching a non-existent domain.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ryda.pro";

// Viewport meta — REQUIRED for mobile responsive layout to work.
// Without this, Mobile Safari falls back to a 980-CSS-px desktop
// viewport and scales the entire site down — every Tailwind sm:/md:
// rule is silently bypassed on iPhone, body text becomes ~10px,
// touch targets become ~17px. Caught by mobile-developer agent
// (B1, May 2026) — was site-breaking on iPhone before this commit.
// Next.js 16 App Router does NOT auto-emit viewport; must be
// explicitly exported from the root layout.
//
// viewportFit=cover lets us use safe-area-inset-* CSS for the
// iPhone home indicator + notch (cookie banner + sticky CTAs).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4F1EC", // bg-cream literal (viewport meta can't read CSS vars)
};

export const metadata: Metadata = {
  title: {
    default: "RYDA — Supercar co-ownership and rentals",
    template: "%s · RYDA",
  },
  description:
    "Co-own or rent a curated certified pre owned Ferrari, Lamborghini, or McLaren in the US. Asset-backed LLC, professionally operated. Launching in Miami Q3 2026.",
  metadataBase: new URL(siteUrl),
  // Canonical anchor for the home page. Per-page metadata can override
  // alternates.canonical for routes that should self-canonicalize
  // (which is most of them — Next 16 auto-includes a canonical link).
  alternates: {
    canonical: "/",
  },
  // Search-engine directives. Default is "index, follow" but spelling
  // it out helps the rare crawler that defaults to "noindex".
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Verification meta tags — populated post-launch when Search Console
  // / Bing Webmaster Tools assign per-domain verification codes.
  // Submitting via DNS TXT (which we already control) is preferred,
  // but the meta-tag fallback is ready when you want it.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  openGraph: {
    title: "RYDA — Supercar co-ownership and rentals",
    description:
      "Co-own or rent a curated supercar with verified members. Asset-backed LLC, professionally operated. Launching in Miami Q3 2026.",
    siteName: "RYDA",
    type: "website",
    locale: "en_US",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "RYDA — Supercar co-ownership and rentals",
    description:
      "Co-own or rent a curated supercar with verified members. Asset-backed LLC, professionally operated. Launching in Miami Q3 2026.",
  },
  // Categorization helps some crawlers and embeds.
  category: "Luxury vehicle co-ownership",
  applicationName: "RYDA",
};

// Schema.org Organization + WebSite + Service JSON-LD for the home
// document. This populates the Google knowledge panel + sitelinks
// when the brand starts to rank, AND gives crawlers a structured
// description of what RYDA is. The site-wide WebSite block is the
// most important — it's what tells Google "this domain is RYDA",
// not "this is some text about supercars."
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "RYDA",
      legalName: "RYDA LLC",
      url: siteUrl,
      logo: `${siteUrl}/opengraph-image`,
      description:
        "Asset-backed co-ownership of certified pre-owned Ferraris, Lamborghinis, McLarens, and curated boats. Member-managed single-purpose LLCs. Professional operations. Launching Q3 2026 in Miami; LA + NY 2027.",
      foundingDate: "2026",
      areaServed: [
        { "@type": "City", name: "Miami" },
        { "@type": "City", name: "Los Angeles" },
        { "@type": "City", name: "New York" },
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Miami",
        addressRegion: "FL",
        addressCountry: "US",
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "support@ryda.pro",
          availableLanguage: ["en"],
        },
      ],
      sameAs: [
        // Populate as social profiles ship. These help search engines
        // build the brand-entity graph (knowledge panel etc).
        // "https://twitter.com/rydaclub",
        // "https://www.linkedin.com/company/ryda",
        // "https://www.instagram.com/ryda",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      url: siteUrl,
      name: "RYDA",
      description:
        "Co-own or rent a Ferrari, Lamborghini, McLaren, or boat in the US. Asset-backed LLC, professionally operated.",
      publisher: { "@id": `${siteUrl}#organization` },
      inLanguage: "en-US",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Service",
      "@id": `${siteUrl}#service`,
      serviceType: "Luxury vehicle co-ownership",
      provider: { "@id": `${siteUrl}#organization` },
      areaServed: [
        { "@type": "City", name: "Miami" },
        { "@type": "City", name: "Los Angeles" },
        { "@type": "City", name: "New York" },
      ],
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        availability: "https://schema.org/PreOrder",
        url: `${siteUrl}/cars`,
        category: "Co-ownership share",
      },
      audience: {
        "@type": "PeopleAudience",
        suggestedMinAge: 28,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        {/* Site-wide Organization + WebSite + Service Schema.org graph.
            This is what Google reads to populate the brand knowledge
            panel + sitelinks search box. Without this, the search
            snippet defaults to whatever Google extracts from the
            <meta description> alone. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {/* a11y audit C-1 (WCAG 2.4.1): keyboard + screen-reader users
            need a way to bypass the SiteHeader's nav/search/CTA stack
            on every page. The link is sr-only until focused, then it
            jumps to the top-left corner with a focus ring. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-cream focus:outline-2 focus:outline-offset-2 focus:outline-cream"
        >
          Skip to main content
        </a>
        <AnalyticsBootstrap />
        {/* a11y audit C-2 (WCAG 1.3.1, 4.1.2): every page now has a
            single <main> landmark. Pages with their own <main> (e.g.
            the splitter at app/page.tsx) replaced theirs with a div
            in the same commit so we don't end up with nested mains. */}
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter />
        <CookieBanner />
        {/* Vercel Analytics — cookie-free, GDPR-compliant pageviews +
            top pages + referrer + geo. Complements PostHog (which is
            our product-event store, gated by cookie consent). Vercel
            Analytics doesn't use cookies, so no consent gate needed. */}
        <Analytics />
      </body>
    </html>
  );
}
