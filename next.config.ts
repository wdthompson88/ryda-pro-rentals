import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack to this project root (silences multi-lockfile warning).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
