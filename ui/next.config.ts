import type {NextConfig} from "next";

// Output mode is controlled via NEXT_OUTPUT env var when needed (e.g., 'standalone' for Docker or 'export' for static CI artifact)
const resolvedOutput = process.env.NEXT_OUTPUT as NextConfig["output"] | undefined;

const nextConfig: NextConfig = {
    output: resolvedOutput,
    images: {unoptimized: true},
    trailingSlash: true,
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
