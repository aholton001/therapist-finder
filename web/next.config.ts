import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.psychologytoday.com",
      },
      {
        protocol: "https",
        hostname: "cdn2.psychologytoday.com",
      },
    ],
  },
};

export default nextConfig;
