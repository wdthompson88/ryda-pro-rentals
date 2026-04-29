import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack to this project root (silences multi-lockfile warning).
  turbopack: {
    root: path.join(__dirname),
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
