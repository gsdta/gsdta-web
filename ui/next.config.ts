import type {NextConfig} from "next";

// Output mode is controlled via NEXT_OUTPUT env var when needed (e.g., 'standalone' for Docker or 'export' for static CI artifact)
const resolvedOutput = process.env.NEXT_OUTPUT as NextConfig["output"] | undefined;

// Default to internal Go API in the single-image pattern; override via BACKEND_BASE_URL
const backendBaseEnv = process.env.BACKEND_BASE_URL || "http://localhost:8080/v1";

const nextConfig: NextConfig = {
    output: resolvedOutput,
    images: {unoptimized: true},
    trailingSlash: true,
    async rewrites() {
        // Normalize and derive a base without trailing slash and without trailing /v1
        const base = backendBaseEnv.replace(/\/+$/, "");
        const baseNoV1 = base.replace(/\/v1$/, "");
        return [
            // If caller includes /v1 (e.g., Swagger 'servers: /api' + path '/v1/...'), avoid double '/v1'
            {
                source: "/api/v1/:path*",
                destination: `${baseNoV1}/v1/:path*`,
            },
            // Default: map /api/* → <base>/* (where base typically ends with /v1)
            {
                source: "/api/:path*",
                destination: `${base}/:path*`,
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
