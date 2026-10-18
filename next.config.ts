import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_TEST_DIST_DIR ? { distDir: process.env.NEXT_TEST_DIST_DIR } : {}),
  serverExternalPackages: ['postgres'],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "framerusercontent.com" },
      { protocol: "https", hostname: "www.apple.com" },
    ],
  },
};

export default nextConfig;
