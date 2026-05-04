import type { MetadataRoute } from "next";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";
import { POSTS as JOURNAL_POSTS } from "@/lib/journal-content";
import { HELP as HELP_CATEGORIES } from "@/lib/help-content";

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
  // Verticals, splash for each line of business.
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
  // NOTE: /boats/journal does NOT exist as a route, boat-themed posts
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


// SEO: when NEXT_PUBLIC_SITE_URL is unset (e.g. preview branches), we
// fall back to "https://ryda.pro" so search engines indexing a
// preview deploy don't pollute the canonical URL with a Vercel
// preview hostname. The ryda-web-teal.vercel.app fallback was a
// pre-domain placeholder; once ryda.pro is registered + DNS'd, the
// env var on production should match the same default and this
// fallback only ever applies to preview / local dev.
const SITE_URL_DEFAULT = "https://ryda.pro";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL_DEFAULT;
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

  // Per-help-category landing pages and per-article pages. The help
  // center has dozens of articles across multiple categories; surface
  // each one to crawlers so support content is discoverable from search.
  const helpEntries: MetadataRoute.Sitemap = HELP_CATEGORIES.flatMap(
    (c) => [
      {
        url: `${siteUrl}/help/${c.slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
      ...c.articles.map((a) => ({
        url: `${siteUrl}/help/${c.slug}/${a.slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
    ],
  );

  return [
    ...staticEntries,
    ...vehicleEntries,
    ...boatEntries,
    ...journalEntries,
    ...helpEntries,
  ];
}
