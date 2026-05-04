import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { CookieBanner } from "@/components/cookie-banner";
import { AnalyticsBootstrap } from "@/components/analytics-bootstrap";

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

export const metadata: Metadata = {
  title: "RYDA — Supercar co-ownership and rentals",
  description:
    "Co-own or rent a curated certified pre owned Ferrari, Lamborghini, or McLaren in the US. Asset-backed LLC, professionally operated. Launching in Miami.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "RYDA — Supercar co-ownership and rentals",
    description:
      "Co-own or rent a curated supercar with verified members. Asset-backed LLC, professionally operated. Launching in Miami.",
    siteName: "RYDA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RYDA — Supercar co-ownership and rentals",
    description:
      "Co-own or rent a curated supercar with verified members. Asset-backed LLC, professionally operated. Launching in Miami.",
  },
};

// No-flash theme bootstrap. Reads localStorage before React hydrates
// so the page renders in the saved theme on first paint. Default is
// dark (matches the original site palette).
const themeBootstrap = `
(function(){
  try {
    var t = localStorage.getItem('ryda-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
    // Add a class after the first frame so the smooth transition
    // doesn't fire on initial load (only on user toggles).
    requestAnimationFrame(function(){
      document.documentElement.classList.add('theme-ready');
    });
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <AnalyticsBootstrap />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  );
}
