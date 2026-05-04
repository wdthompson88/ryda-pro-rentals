import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // SEO note: same as sitemap.ts — fallback is the canonical
  // production domain so preview deploys don't leak the Vercel
  // hostname into robots.txt sitemap reference.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ryda.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Member-area + per-purchase tracker pages aren't real auth-gated
        // surfaces yet, keep them out of search until they ship behind auth.
        disallow: [
          "/account",
          "/portfolio",
          "/my-cars",
          "/my-boats",
          "/bookings",
          "/messages",
          "/share-purchase",
          "/onboarding",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
