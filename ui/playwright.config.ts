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
            command: "cd ../api && npm run start",
            port: 8080,
            reuseExistingServer: !isCI, // Allow reusing in local dev for speed
            timeout: 60_000, // Reduced since no build needed
            env: {
                USE_TEST_AUTH: "true",
                ALLOW_TEST_INVITES: "1",
                NODE_ENV: "test",
                FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || "localhost:8889",
                FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099",
                FIREBASE_PROJECT_ID: "demo-gsdta",
                GCLOUD_PROJECT: "demo-gsdta",
            },
        },
        {
            command: "npx next start -p 3100",
            port: 3100,
            reuseExistingServer: !isCI, // Allow reusing in local dev for speed
            timeout: 60_000, // Reduced since no build needed
            env: {
                NEXT_PUBLIC_USE_MSW: "false",
                NEXT_PUBLIC_AUTH_MODE: "firebase", // Use Firebase emulator auth for E2E tests
                NEXT_PUBLIC_API_BASE_URL: "/api",
                NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key-for-emulator",
                NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-gsdta.firebaseapp.com",
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-gsdta",
                NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:abcdef123456",
                NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
                NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: "localhost:8889",
                FIRESTORE_EMULATOR_HOST: "localhost:8889",
                FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
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
