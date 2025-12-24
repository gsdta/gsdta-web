import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable standalone output - firebase-admin not properly traced
  // output: 'standalone',
  basePath: '/api',
  // Skip generating error pages in static export
  skipTrailingSlashRedirect: true,
  generateBuildId: async () => {
    return 'api-build'
  },
};

export default nextConfig;
