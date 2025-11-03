import path from "node:path";
import {defineConfig, devices} from "@playwright/test";
import type { ReporterDescription } from "@playwright/test";

const isCI = !!process.env.CI;
// Use the proper type for reporters
const reporters: ReporterDescription[] = [
    ["list"],
];
if (isCI) {
    reporters.push(["github"]);
    reporters.push(["junit", { outputFile: "playwright-results.xml" }]);
}
reporters.push(["html", { outputFolder: "playwright-report", open: "never" }]);

export default defineConfig({
    testDir: path.join(__dirname, "tests", "e2e"),
    testMatch: ["**/*.spec.ts"],
    timeout: 30_000, // Increase default timeout for stability
    expect: {timeout: 10_000},
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? "50%" : undefined, // Dial workers on CI to reduce contention
    // Remove any-cast and pass typed reporters
    reporter: reporters,
    use: {
        baseURL: "http://localhost:3100",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
    },
    // Start API (test mode) and UI servers for the test run
    webServer: [
        {
            command: "npm ci --prefix ../api && npm run --prefix ../api build && npm run --prefix ../api start",
            port: 8080,
            reuseExistingServer: false,
            timeout: 180_000,
            env: {
                ALLOW_TEST_INVITES: "1",
                NODE_ENV: "test",
            },
        },
        {
            command: "npm run build && npx next start -p 3100",
            port: 3100,
            reuseExistingServer: false, // Force fresh server to avoid dev server reuse
            timeout: 180_000,
            env: {
                NEXT_PUBLIC_USE_MSW: "false",
                NEXT_PUBLIC_AUTH_MODE: "mock",
                // Ensure UI targets the proxy path consistently
                NEXT_PUBLIC_API_BASE_URL: "/api",
            },
        },
    ],
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
});
