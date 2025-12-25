import {
  Before,
  After,
  BeforeAll,
  AfterAll,
  Status,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { CustomWorld } from './world';
import * as fs from 'fs';
import * as path from 'path';

// Set default timeout for all steps (60 seconds)
setDefaultTimeout(60 * 1000);

/**
 * Global setup - runs once before all scenarios
 */
BeforeAll(async function () {
  // Ensure reports directory exists
  const reportsDir = path.join(__dirname, '..', 'reports');
  const screenshotsDir = path.join(reportsDir, 'screenshots');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('UAT Tests Starting...');
  console.log(`Target URL: ${process.env.UAT_BASE_URL || 'https://app.qa.gsdta.com'}`);
});

/**
 * Scenario setup - runs before each scenario
 */
Before(async function (this: CustomWorld, scenario) {
  const scenarioName = scenario.pickle.name;
  const featureFile = scenario.pickle.uri.split('/').pop();
  console.log(`\n▶️  STARTING: ${scenarioName} (${featureFile})`);

  // Initialize browser and page
  await this.init();

  // Clear state from previous scenario
  this.state = {};
});

/**
 * Tagged hook for authentication scenarios
 * Ensures clean auth state before login tests
 */
Before({ tags: '@auth' }, async function (this: CustomWorld) {
  // Clear cookies for clean auth state
  await this.context.clearCookies();
});

/**
 * Tagged hook for admin scenarios
 * Pre-login as admin before the scenario runs
 */
Before({ tags: '@admin and not @auth' }, async function (this: CustomWorld) {
  console.log('[HOOK] Admin login hook triggered');

  // Clear any existing session first
  await this.context.clearCookies();
  console.log('[HOOK] Cookies cleared for admin');

  // Small delay to ensure clean state
  await this.page.waitForTimeout(500);

  try {
    console.log('[HOOK] Attempting admin login...');
    await this.authHelper.loginAsAdmin();
    console.log('[HOOK] Admin login successful');
  } catch (error) {
    console.error('[HOOK] Failed to login as admin:', error);
    throw error;
  }
});

/**
 * Tagged hook for teacher scenarios
 */
Before({ tags: '@teacher and not @auth' }, async function (this: CustomWorld) {
  console.log('[HOOK] Teacher login hook triggered');

  await this.context.clearCookies();
  console.log('[HOOK] Cookies cleared for teacher');

  await this.page.waitForTimeout(500);

  try {
    console.log('[HOOK] Attempting teacher login...');
    await this.authHelper.loginAsTeacher();
    console.log('[HOOK] Teacher login successful');
  } catch (error) {
    console.error('[HOOK] Failed to login as teacher:', error);
    throw error;
  }
});

/**
 * Tagged hook for parent scenarios
 */
Before({ tags: '@parent and not @auth' }, async function (this: CustomWorld) {
  console.log('[HOOK] Parent login hook triggered');

  await this.context.clearCookies();
  console.log('[HOOK] Cookies cleared for parent');

  await this.page.waitForTimeout(500);

  try {
    console.log('[HOOK] Attempting parent login...');
    await this.authHelper.loginAsParent();
    console.log('[HOOK] Parent login successful');
  } catch (error) {
    console.error('[HOOK] Failed to login as parent:', error);
    throw error;
  }
});

/**
 * Scenario teardown - runs after each scenario
 */
After(async function (this: CustomWorld, scenario) {
  const scenarioName = scenario.pickle.name;
  const status = scenario.result?.status;
  const duration = scenario.result?.duration;
  const durationMs = duration ? Math.round(Number(duration.nanos) / 1_000_000 + (duration.seconds || 0) * 1000) : 0;

  if (status === Status.PASSED) {
    console.log(`✅ PASSED: ${scenarioName} (${durationMs}ms)`);
  } else if (status === Status.FAILED) {
    console.log(`❌ FAILED: ${scenarioName} (${durationMs}ms)`);
  } else {
    console.log(`⏭️  ${status}: ${scenarioName}`);
  }

  // Take screenshot on failure
  if (scenario.result?.status === Status.FAILED) {
    try {
      const screenshotName = scenario.pickle.name
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase();
      const timestamp = Date.now();
      const screenshotPath = path.join(
        __dirname,
        '..',
        'reports',
        'screenshots',
        `${screenshotName}-${timestamp}.png`
      );

      const screenshot = await this.page.screenshot({
        fullPage: true,
        type: 'png',
      });

      fs.writeFileSync(screenshotPath, screenshot);

      // Attach screenshot to report
      this.attach(screenshot, 'image/png');

      // Also attach the current URL and any console errors
      this.attach(`URL: ${this.page.url()}`, 'text/plain');
    } catch (screenshotError) {
      console.error('Failed to take screenshot:', screenshotError);
    }
  }

  // Cleanup browser resources
  await this.cleanup();
});

/**
 * Global teardown - runs once after all scenarios
 */
AfterAll(async function () {
  console.log('UAT Tests Completed');
});
