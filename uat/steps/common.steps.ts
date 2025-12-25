import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

/**
 * Common step definitions used across multiple features
 */

// API Health Check Steps
When('I check the health endpoint', async function (this: CustomWorld) {
  const health = await this.apiHelper.checkHealth();
  this.state.healthCheck = health;
});

Then(
  'the response status should be {int}',
  async function (this: CustomWorld, expectedStatus: number) {
    const health = this.state.healthCheck as { status: number };
    expect(health.status).toBe(expectedStatus);
  }
);

// Page Load Steps
Then('the page should load without errors', async function (this: CustomWorld) {
  // Check for any error alerts or error messages
  const errorAlerts = await this.page.locator('[role="alert"]').count();
  const errorMessages = await this.page.locator('.error, .error-message').count();

  // Also check console for errors (optional, can be disabled)
  const consoleErrors: string[] = [];
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Wait a moment for any delayed errors
  await this.page.waitForTimeout(500);

  // We allow some alerts (like info messages) but fail on actual error content
  const alertTexts = await this.page.locator('[role="alert"]').allTextContents();
  const hasErrorAlert = alertTexts.some(
    (text) =>
      text.toLowerCase().includes('error') ||
      text.toLowerCase().includes('failed')
  );

  expect(hasErrorAlert).toBeFalsy();
  expect(errorMessages).toBe(0);
});

// Navigation Steps
Given('I am on the home page', async function (this: CustomWorld) {
  await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  await this.page.waitForLoadState('load');
});

When('I navigate to the about page', async function (this: CustomWorld) {
  await this.page.goto('/about', { waitUntil: 'domcontentloaded' });
});

When(
  'I navigate to the {string} page',
  async function (this: CustomWorld, pagePath: string) {
    await this.page.goto(`/${pagePath}`, { waitUntil: 'domcontentloaded' });
  }
);

// Content Verification Steps
Then('I should see the GSDTA logo', async function (this: CustomWorld) {
  // Look for logo by various selectors
  const logo = this.page.locator('img[alt*="GSDTA"], img[alt*="logo"], .logo');
  await expect(logo.first()).toBeVisible({ timeout: 10000 });
});

Then('I should see the about content', async function (this: CustomWorld) {
  // Check for about page specific content
  const aboutContent = this.page.locator('main, [role="main"], .about-content');
  await expect(aboutContent.first()).toBeVisible();
});

// Generic text content verification
Then(
  'I should see {string} on the page',
  async function (this: CustomWorld, text: string) {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: 10000 });
  }
);

Then(
  'I should not see {string} on the page',
  async function (this: CustomWorld, text: string) {
    await expect(this.page.getByText(text)).not.toBeVisible();
  }
);

// URL verification
Then(
  'the URL should contain {string}',
  async function (this: CustomWorld, urlPart: string) {
    expect(this.page.url()).toContain(urlPart);
  }
);

Then(
  'I should be on the {string} page',
  async function (this: CustomWorld, pageName: string) {
    const urlPatterns: Record<string, RegExp> = {
      home: /\/$/,
      about: /\/about/,
      calendar: /\/calendar/,
      documents: /\/documents/,
      signin: /\/signin/,
      signup: /\/signup/,
    };

    const pattern = urlPatterns[pageName.toLowerCase()];
    if (pattern) {
      expect(this.page.url()).toMatch(pattern);
    } else {
      expect(this.page.url()).toContain(pageName.toLowerCase());
    }
  }
);

// Wait steps
When(
  'I wait for {int} seconds',
  async function (this: CustomWorld, seconds: number) {
    await this.page.waitForTimeout(seconds * 1000);
  }
);

// Click steps
When(
  'I click on {string}',
  async function (this: CustomWorld, text: string) {
    await this.page.getByText(text).click();
  }
);

When(
  'I click the {string} button',
  async function (this: CustomWorld, buttonText: string) {
    await this.page.getByRole('button', { name: buttonText }).click();
  }
);

// Form steps
When(
  'I fill in {string} with {string}',
  async function (this: CustomWorld, fieldName: string, value: string) {
    const field = this.page.getByLabel(fieldName);
    await field.fill(value);
  }
);

// Table verification
Then(
  'I should see a table with at least {int} row(s)',
  async function (this: CustomWorld, minRows: number) {
    const rows = this.page.locator('table tbody tr, [role="table"] [role="row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(minRows);
  }
);
