import type { MetadataRoute } from "next";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";
import { POSTS as JOURNAL_POSTS } from "@/lib/journal-content";

// Sitemap of every crawlable, public RYDA route. Generated at build
// time. Three categories:
//   1. Static landing pages (hand-maintained list below).
//   2. Per-vehicle dynamic routes derived from /lib/market-data.
//   3. Per-boat + per-journal-post dynamic routes.
//
// Routes that are gated, member-only, or stub previews (e.g. /portfolio,
// /onboarding, /bookings/*, /admin/*) are intentionally NOT listed.

const PUBLIC_ROUTES = [
  "",
  // Verticals — splash for each line of business.
  "/cars",
  "/boats",
  "/planes",
  // Cars marketing surfaces.
  "/markets",
  "/rent",
  "/membership",
  "/how-it-works",
  "/about",
  "/insurance",
  "/storage",
  "/trust-and-safety",
  "/sustainability",
  "/host-your-car",
  "/help",
  "/faq",
  "/journal",
  "/press",
  "/investors",
  "/inside",
  "/member-protection",
  "/careers",
  "/contact",
  "/events",
  "/sample-documents",
  // Locations.
  "/locations/miami",
  "/locations/los-angeles",
  "/locations/new-york",
  // Boats marketing surfaces (parity with cars).
  // NOTE: /boats/journal does NOT exist as a route — boat-themed posts
  // live in the main /journal listing tagged accordingly.
  "/boats/about",
  "/boats/faq",
  "/boats/how-it-works",
  "/boats/membership",
  "/boats/portfolio",
  "/boats/rent",
  "/boats/sample-documents",
  // Search + auth.
  "/search",
  "/signin",
  "/signup",
  // Legal.
  "/legal/privacy",
  "/legal/terms",
  "/legal/disclaimer",
  "/legal/cookies",
  "/legal/accessibility",
];


export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ryda-web-teal.vercel.app";
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1.0 : path === "/cars" || path === "/boats" || path === "/planes" ? 0.9 : 0.7,
  }));

  const vehicleEntries: MetadataRoute.Sitemap = VEHICLES.flatMap((v) => [
    {
      url: `${siteUrl}/markets/${v.symbol.toLowerCase()}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/markets/${v.symbol.toLowerCase()}/cost-sheet`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
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

  const boatEntries: MetadataRoute.Sitemap = BOATS.flatMap((b) => [
    {
      url: `${siteUrl}/boats/portfolio/${b.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/boats/portfolio/${b.slug}/cost-sheet`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/boats/rent/${b.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ]);

  const journalEntries: MetadataRoute.Sitemap = JOURNAL_POSTS
    .filter((p) => p.status === "published")
    .map((p) => ({
      url: `${siteUrl}/journal/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [
    ...staticEntries,
    ...vehicleEntries,
    ...boatEntries,
    ...journalEntries,
  ];
}
