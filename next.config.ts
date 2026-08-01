import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['postgres'],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "framerusercontent.com" },
      { protocol: "https", hostname: "www.apple.com" },
    ],
  },
  async rewrites() {
    return [
      { source: "/%EA%B5%90%EC%9C%A1", destination: "/training" },
    ];
  },
};

export default nextConfig;
