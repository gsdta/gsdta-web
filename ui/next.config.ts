import type {NextConfig} from "next";
import path from "path";

// Output mode is controlled via NEXT_OUTPUT env var when needed (e.g., 'standalone' for Docker or 'export' for static CI artifact)
const resolvedOutput = process.env.NEXT_OUTPUT as NextConfig["output"] | undefined;

const nextConfig: NextConfig = {
    output: resolvedOutput,
    // Use monorepo root for file tracing to include workspace packages (@gsdta/shared-*)
    outputFileTracingRoot: path.join(__dirname, '..'),
    images: {unoptimized: true},
    trailingSlash: true,
    async headers() {
        return [
            {
                // Immutable static assets (hashed filenames) - cache for 1 year
                // These have content hashes in filenames, safe to cache long-term
                source: '/_next/static/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
                ]
            },
            {
                // Public images - cache for 5 minutes with stale-while-revalidate
                source: '/images/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=600' }
                ]
            },
            {
                // Static documents - cache for 5 minutes
                source: '/docs/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=300' }
                ]
            },
            {
                // Templates - cache for 5 minutes
                source: '/templates/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=300' }
                ]
            },
            {
                // Root static files (favicon, robots.txt, etc.) - cache for 5 minutes
                source: '/:path(favicon.ico|robots.txt|sitemap.xml|pdf.worker.min.js)',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=300' }
                ]
            }
        ];
    },
    async rewrites() {
        // Use API_PROXY_URL env var for Docker, fallback to localhost for local dev
        const apiProxyUrl = process.env.API_PROXY_URL || 'http://localhost:8080';
        return [
            {
                source: '/api/:path*',
                destination: `${apiProxyUrl}/api/:path*`,
            },
        ];
    },
    webpack: (config) => {
        // pdf.js optionally requires 'canvas' when running in Node; we don't need it in the browser build.
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            canvas: false,
        } as typeof config.resolve.alias;
        config.resolve.fallback = {
            ...(config.resolve.fallback || {}),
            canvas: false,
        };
        return config;
    },
};

export default nextConfig;
