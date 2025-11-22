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
    workers: process.env.CI ? 4 : undefined, // Use 4 workers in CI for faster execution
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
                FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || "localhost:8889",
                FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099",
                FIREBASE_PROJECT_ID: "demo-gsdta",
                GCLOUD_PROJECT: "demo-gsdta",
            },
        },
        {
            command: "npm run build && npx next start -p 3100",
            port: 3100,
            reuseExistingServer: false, // Force fresh server to avoid dev server reuse
            timeout: 180_000,
            env: {
                NEXT_PUBLIC_USE_MSW: "false",
                NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE || "mock",
                NEXT_PUBLIC_API_BASE_URL: "/api",
                NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
                NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
                NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
                NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "",
                NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "",
                FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || "",
                FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || "",
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
