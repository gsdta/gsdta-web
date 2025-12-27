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
