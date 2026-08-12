import type { MetadataRoute } from "next";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";
import { POSTS as JOURNAL_POSTS } from "@/lib/journal-content";
import { HELP as HELP_CATEGORIES } from "@/lib/help-content";
import { LEARN_ARTICLES } from "@/lib/learn-content";

// Sitemap of every crawlable, public RYDA route. Generated at build
// time. Three categories:
//   1. Static landing pages (hand-maintained list below).
//   2. Per-vehicle rental detail routes, partner fleet
//      (/lib/partner-fleet) — the only fleet there is.
//   3. Per-help-article, per-journal-post and per-learn-article routes.
//
// Routes that are gated, member-only, or stub previews (e.g. /account/*,
// /onboarding, /admin/*) are intentionally NOT listed.

const PUBLIC_ROUTES = [
  // "" is the rentals-first landing page; /rent is the canonical
  // browse grid users click through to. Both are listed — they are
  // distinct pages, not duplicates. /rent/[slug] detail pages are
  // emitted below.
  "",
  "/rent",
  // Rental-first surfaces.
  "/partners",
  "/how-it-works",
  // Content surfaces. Indexable, but not linked from the footer.
  //
  // /insurance and /storage used to sit here. Both were deleted: they
  // advertised a RYDA fleet policy and RYDA-operated climate-controlled
  // storage, and RYDA provides neither. Every car on the platform is
  // owned, insured, stored and serviced by an independent operator, and
  // Terms §2 now says so in writing. Do not re-add either route.
  "/events",
  "/learn",
  "/journal",
  // Company + support.
  "/about",
  "/trust-and-safety",
  "/sustainability",
  "/help",
  "/faq",
  "/press",
  "/investors",
  "/careers",
  "/contact",
  // Locations. The /locations index is a real page with its own
  // canonical tag, so it belongs here alongside the per-market pages.
  "/locations",
  "/locations/miami",
  "/locations/los-angeles",
  "/locations/new-york",
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
    // Priorities: the landing page leads, the browse grid sits just
    // under it (and above every secondary marketing page).
    priority: path === "" ? 1.0 : path === "/rent" ? 0.9 : 0.7,
  }));

  // Partner-fleet rental detail pages. These are the marketplace's
  // primary SEO surface: one indexable page per operator car at
  // /rent/[slug], and they are exactly what /rent/[symbol]'s
  // generateStaticParams prerenders, so no URL here can 404 a crawler.
  // Priority sits above the secondary marketing pages.
  const partnerEntries: MetadataRoute.Sitemap = PARTNER_VEHICLES.map(
    (p) => ({
      url: `${siteUrl}/rent/${p.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

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

  // Per-learn-article entries. The /learn hub is the educational
  // content surface; each article is a standalone SEO landing page.
  const learnEntries: MetadataRoute.Sitemap = LEARN_ARTICLES.map((a) => ({
    url: `${siteUrl}/learn/${a.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  return [
    ...staticEntries,
    ...partnerEntries,
    ...journalEntries,
    ...helpEntries,
    ...learnEntries,
  ];
}
