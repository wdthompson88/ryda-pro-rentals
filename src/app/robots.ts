import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // SEO note: same as sitemap.ts — fallback is the canonical
  // production domain so preview deploys don't leak the Vercel
  // hostname into robots.txt sitemap reference.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ryda.pro";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Member-area + per-purchase tracker pages aren't real auth-gated
        // surfaces yet, keep them out of search until they ship behind auth.
        // /portfolio is the public catalog and stays indexable; only the
        // mid-funnel /buy paths need to stay out of search results.
        disallow: [
          "/account",
          "/portfolio/*/buy",
          "/boats/portfolio/*/buy",
          "/my-cars",
          "/my-boats",
          "/bookings",
          "/messages",
          "/share-purchase",
          "/onboarding",
          "/admin",
          "/auth",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
