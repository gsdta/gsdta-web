import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/api',
  // API-only server, no pages
  experimental: {},
  // Skip generating error pages in static export
  skipTrailingSlashRedirect: true,
  generateBuildId: async () => {
    return 'api-build'
  },
};

export default nextConfig;
