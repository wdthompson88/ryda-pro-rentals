import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "RYDA — Supercar Co-Ownership",
  description:
    "The first US asset-backed supercar co-ownership platform. Own a Ferrari, Lamborghini, or McLaren for a fraction of the cost.",
  metadataBase: new URL("https://ryda.com"),
  openGraph: {
    title: "RYDA — Supercar Co-Ownership",
    description:
      "Own a curated supercar at a fraction of the cost. Asset-backed, legally structured, concierge-operated. Launching in Miami.",
    siteName: "RYDA",
    type: "website",
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
        {children}
      </body>
    </html>
  );
}
