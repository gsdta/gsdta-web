import type {NextConfig} from "next";

// Output mode is controlled via NEXT_OUTPUT env var when needed (e.g., 'standalone' for Docker or 'export' for static CI artifact)
const resolvedOutput = process.env.NEXT_OUTPUT as NextConfig["output"] | undefined;

// Default to internal Go API in the single-image pattern; override via BACKEND_BASE_URL
const backendBase = process.env.BACKEND_BASE_URL || "http://localhost:8080/v1";

const nextConfig: NextConfig = {
    output: resolvedOutput,
    images: {unoptimized: true},
    trailingSlash: true,
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${backendBase}/:path*`,
            },
        ];
    },
};

export default nextConfig;
