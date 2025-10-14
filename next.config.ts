import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily disable static export for E2E testing
  // output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
