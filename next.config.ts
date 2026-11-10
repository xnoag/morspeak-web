import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['postgres'],
  outputFileTracingIncludes: { '/share/skhappiness/**': ['./share-report/**/*'], '/tracking/internal/**': ['./internal-report/**/*', './share-report/**/*'] },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "framerusercontent.com" },
      { protocol: "https", hostname: "www.apple.com" },
    ],
  },
};

export default nextConfig;
