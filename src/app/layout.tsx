import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Display serif for headlines — Fraunces stands in well for the spec's "Canela"
// (Canela is paid; we can swap later when you license it).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

// Resolve absolute URLs in metadata (OG image, etc). Always uses the
// canonical public domain — NOT the per-deployment URL like
// `ryda-xxxxxx-moocow4844s-projects.vercel.app`, which is gated by
// Vercel deployment protection and unreachable to OG scrapers.
// Set NEXT_PUBLIC_SITE_URL on Vercel once a custom domain (ryda.com)
// is wired up.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ryda-web-teal.vercel.app";

export const metadata: Metadata = {
  title: "RYDA — Supercar co-ownership and rentals",
  description:
    "Co-own or rent a curated CPO Ferrari, Lamborghini, or McLaren in the US. Asset-backed Delaware LLC, concierge-operated. Launching in Miami.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "RYDA — Supercar co-ownership and rentals",
    description:
      "Co-own or rent a curated supercar with verified members. Asset-backed Delaware LLC, concierge-operated. Launching in Miami.",
    siteName: "RYDA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RYDA — Supercar co-ownership and rentals",
    description:
      "Co-own or rent a curated supercar with verified members. Asset-backed Delaware LLC, concierge-operated. Launching in Miami.",
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
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
