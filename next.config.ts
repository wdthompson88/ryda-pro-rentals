import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack to this project root (silences multi-lockfile warning).
  turbopack: {
    root: path.join(__dirname),
  },
  // 301 redirects from the legacy listing paths to /rent/*.
  // /markets was renamed to /portfolio in May 2026; /portfolio was then
  // removed with the co-ownership product, so both legacy paths now land
  // on the rental listings they were superseded by. 301s preserve any
  // existing inbound links + Google indexing.
  async redirects() {
    return [
      { source: "/markets", destination: "/rent", permanent: true },
      {
        source: "/markets/:path*",
        destination: "/rent/:path*",
        permanent: true,
      },
      { source: "/portfolio", destination: "/rent", permanent: true },
      {
        source: "/portfolio/:path*",
        destination: "/rent/:path*",
        permanent: true,
      },
      // /how-it-works was merged into the "#how-it-works" section of the
      // home page (Aug 2026, one-page revamp) so the whole story reads
      // in one scroll instead of two pages.
      {
        source: "/how-it-works",
        destination: "/#how-it-works",
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
