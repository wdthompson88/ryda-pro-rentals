import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack to this project root (silences multi-lockfile warning).
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingIncludes: {
    "/api/sample-documents/[slug]": ["./docs/sample-documents/**/*"],
    "/api/admin/sample-documents/[slug]": ["./docs/sample-documents/**/*"],
  },
  // 301 redirects from the legacy /markets/* paths to /portfolio/*.
  // Per user feedback May 2026: "still labeled as 'markets' in the
  // URL." We renamed the listing index + detail pages to /portfolio
  // and shifted the original member dashboard to /account/portfolio.
  // 301s preserve any existing inbound links + Google indexing.
  async redirects() {
    return [
      { source: "/markets", destination: "/portfolio", permanent: true },
      {
        source: "/markets/:path*",
        destination: "/portfolio/:path*",
        permanent: true,
      },
    ];
  },
  // Allow next/image to optimize the Unsplash hero placeholders we ship
  // with the demo fleet. Replace with our own CDN once licensed assets land.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      // GM LUXE partner fleet images (hosted on Wix CDN).
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
