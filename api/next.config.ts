import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/api',
  // API-only server, no pages
  experimental: {},
};

export default nextConfig;
