import type { MetadataRoute } from "next";
import { VEHICLES } from "@/lib/market-data";

const PUBLIC_ROUTES = [
  "",
  "/markets",
  "/rent",
  "/membership",
  "/founding-members",
  "/how-it-works",
  "/about",
  "/insurance",
  "/concierge",
  "/storage",
  "/track-day",
  "/trust-and-safety",
  "/sustainability",
  "/host-your-car",
  "/help",
  "/faq",
  "/journal",
  "/press",
  "/investors",
  "/investors/deck",
  "/careers",
  "/contact",
  "/events",
  "/locations/miami",
  "/locations/los-angeles",
  "/locations/new-york",
  "/legal/privacy",
  "/legal/terms",
  "/legal/disclaimer",
  "/legal/cookies",
  "/legal/accessibility",
  "/signin",
  "/signup",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ryda-web-teal.vercel.app";
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1.0 : 0.7,
  }));

  const vehicleEntries: MetadataRoute.Sitemap = VEHICLES.flatMap((v) => [
    {
      url: `${siteUrl}/markets/${v.symbol.toLowerCase()}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...(v.rentalAvailable
      ? [
          {
            url: `${siteUrl}/rent/${v.symbol.toLowerCase()}`,
            lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : []),
  ]);

  return [...staticEntries, ...vehicleEntries];
}
