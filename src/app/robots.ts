import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ryda-web-teal.vercel.app";

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
