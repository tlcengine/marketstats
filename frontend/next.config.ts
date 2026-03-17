import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["https://marketstats.certihomes.com"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "marketstats.certihomes.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
