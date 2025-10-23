import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // API-only server, no pages
  experimental: {},
};

export default nextConfig;

