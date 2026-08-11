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
        // Everything public is indexable — /rent and its detail pages
        // are the whole SEO surface. What stays out is the signed-in
        // member area, the identity-verification wizard, the admin
        // console, the auth callback routes and the API.
        disallow: [
          "/account",
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
