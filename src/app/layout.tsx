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
  title: "RYDA — Supercar Co-Ownership",
  description:
    "Member-managed supercar co-ownership in the US. Co-own a Ferrari, Lamborghini, or McLaren together with verified members.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "RYDA — Supercar Co-Ownership",
    description:
      "Co-own a curated supercar with verified members. Member-managed Delaware LLC, concierge-operated. Launching in Miami.",
    siteName: "RYDA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RYDA — Supercar Co-Ownership",
    description:
      "Co-own a curated supercar with verified members. Member-managed Delaware LLC, concierge-operated. Launching in Miami.",
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
