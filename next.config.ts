import type { NextConfig } from "next";

// Output mode is controlled via NEXT_OUTPUT env var when needed (e.g., 'standalone' for Docker or 'export' for static CI artifact)
const resolvedOutput = process.env.NEXT_OUTPUT as NextConfig["output"] | undefined;

const nextConfig: NextConfig = {
  output: resolvedOutput,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
