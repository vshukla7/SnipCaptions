import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "remotion",
    "@remotion/player",
    "@remotion/web-renderer",
    "@remotion/media-utils",
  ],
};

export default nextConfig;
