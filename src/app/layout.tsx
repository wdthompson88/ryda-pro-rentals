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

// Resolve absolute URLs in metadata (OG image, etc). Uses NEXT_PUBLIC_SITE_URL
// when set (e.g. once a custom domain like ryda.com is wired up); otherwise
// falls back to the current Vercel deployment URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://ryda-web-teal.vercel.app");

export const metadata: Metadata = {
  title: "RYDA — Supercar Co-Ownership",
  description:
    "The first US asset-backed supercar co-ownership platform. Own a Ferrari, Lamborghini, or McLaren for a fraction of the cost.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "RYDA — Supercar Co-Ownership",
    description:
      "Own a curated supercar at a fraction of the cost. Asset-backed, legally structured, concierge-operated. Launching in Miami.",
    siteName: "RYDA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RYDA — Supercar Co-Ownership",
    description:
      "Own a curated supercar at a fraction of the cost. Asset-backed, legally structured, concierge-operated. Launching in Miami.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
