import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

/**
 * Common step definitions used across multiple features
 */

// =============================================================================
// API Health Check Steps
// =============================================================================

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

// =============================================================================
// Public API Endpoint Steps
// =============================================================================

When('I call the hero content API', async function (this: CustomWorld) {
  const response = await this.apiHelper.get('/api/v1/hero-content');
  this.state.apiResponse = {
    status: response.status,
    body: await this.apiHelper.parseJson(response),
  };
});

When('I call the calendar API', async function (this: CustomWorld) {
  const response = await this.apiHelper.get('/api/v1/calendar');
  this.state.apiResponse = {
    status: response.status,
    body: await this.apiHelper.parseJson(response),
  };
});

Then(
  'the API response status should be {int}',
  async function (this: CustomWorld, expectedStatus: number) {
    const apiResponse = this.state.apiResponse as { status: number };
    expect(apiResponse.status).toBe(expectedStatus);
  }
);

// =============================================================================
// Authenticated API Endpoint Steps
// =============================================================================

When('I call the me API endpoint', async function (this: CustomWorld) {
  // Get the auth token from the browser context
  const token = await this.getAuthToken();
  const response = await this.apiHelper.get('/api/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  this.state.apiResponse = {
    status: response.status,
    body: await this.apiHelper.parseJson(response),
  };
});

When('I call the admin grades API', async function (this: CustomWorld) {
  const token = await this.getAuthToken();
  const response = await this.apiHelper.get('/api/v1/admin/grades', {
    headers: { Authorization: `Bearer ${token}` },
  });
  this.state.apiResponse = {
    status: response.status,
    body: await this.apiHelper.parseJson(response),
  };
});

When('I call the admin classes API', async function (this: CustomWorld) {
  const token = await this.getAuthToken();
  const response = await this.apiHelper.get('/api/v1/admin/classes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  this.state.apiResponse = {
    status: response.status,
    body: await this.apiHelper.parseJson(response),
  };
});

Then('the response should contain user email', async function (this: CustomWorld) {
  const apiResponse = this.state.apiResponse as { body: { email?: string } };
  expect(apiResponse.body).toBeDefined();
  expect(apiResponse.body.email).toBeDefined();
  expect(apiResponse.body.email).toContain('@');
});

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
  console.log('[STEP] Navigating to home page...');
  await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  console.log(`[STEP] DOM loaded, URL: ${this.page.url()}`);
  // Wait for page load state (not networkidle - third-party scripts may keep connections open)
  await this.page.waitForLoadState('load');
  console.log('[STEP] Home page loaded');
});

When('I navigate to the about page', async function (this: CustomWorld) {
  console.log('[STEP] Navigating to /about...');
  await this.page.goto('/about', { waitUntil: 'domcontentloaded' });
  console.log(`[STEP] Arrived at: ${this.page.url()}`);
});

When(
  'I navigate to the {string} page',
  async function (this: CustomWorld, pagePath: string) {
    console.log(`[STEP] Navigating to /${pagePath}...`);
    await this.page.goto(`/${pagePath}`, { waitUntil: 'domcontentloaded' });
    console.log(`[STEP] Arrived at: ${this.page.url()}`);
  }
);

Given(
  'I navigate to {string}',
  async function (this: CustomWorld, path: string) {
    console.log(`[STEP] Navigating to ${path}...`);
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    console.log(`[STEP] DOM loaded, URL: ${this.page.url()}`);
    await this.page.waitForLoadState('load');
    console.log('[STEP] Page fully loaded');
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

// Note: "I click the {string} button" is defined in navigation.steps.ts

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
