import path from "node:path";
import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
    testDir: path.join(__dirname, "tests", "e2e"),
    testMatch: ["**/*.spec.ts"],
    timeout: 30_000, // Increase default timeout for stability
    expect: {timeout: 10_000},
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 4, // Slightly reduced for stability
    reporter: [["list"], ["html", {outputFolder: "playwright-report", open: "never"}]],
    use: {
        baseURL: "http://localhost:3100",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
    },
    webServer: {
        command: "npm run build && npx next start -p 3100",
        port: 3100,
        reuseExistingServer: false, // Force fresh server to avoid dev server reuse
        timeout: 180_000,
        env: {
            NEXT_PUBLIC_USE_MSW: "false",
        },
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
});
