/**
 * Playwright configuration for UAT tests
 * Note: This is used by Cucumber steps for browser automation,
 * not for standalone Playwright tests
 */

export const playwrightConfig = {
  timeout: 30000,
  use: {
    baseURL: process.env.UAT_BASE_URL || 'https://app.qa.gsdta.com',
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure' as const,
    video: 'retain-on-failure' as const,
    trace: 'retain-on-failure' as const,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  browser: {
    name: 'chromium' as const,
    channel: process.env.CI ? undefined : 'chrome',
  },
};

export default playwrightConfig;
