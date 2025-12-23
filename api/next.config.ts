import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Only use standalone output in production, not during test/dev
  ...(process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_INVITES !== '1' ? { output: 'standalone' } : {}),
  basePath: '/api',
  // Skip generating error pages in static export
  skipTrailingSlashRedirect: true,
  generateBuildId: async () => {
    return 'api-build'
  },
  // Ensure firebase-admin and its dependencies are included in standalone output
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
