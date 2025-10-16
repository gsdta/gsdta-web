import path from "node:path";
import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
    testDir: path.join(__dirname, "tests", "e2e"),
    testMatch: ["**/*.spec.ts"],
    timeout: 5_000, // Reduced from 60s to 5s
    expect: {timeout: 10_000},
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 5, // Already set to 1 (runs one at a time)
    reporter: [["list"], ["html", {outputFolder: "playwright-report", open: "never"}]],
    use: {
        baseURL: "http://localhost:3000",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off", // Disabled to avoid ffmpeg dependency
    },
    webServer: {
        command: "npm run start:e2e",
        port: 3000,
        reuseExistingServer: !process.env.CI,
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
                channel: "chrome", // Use system Chrome instead of downloading Chromium
            },
        },
    ],
});
