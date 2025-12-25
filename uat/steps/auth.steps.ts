import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { getConfig } from '../support/config';

const config = getConfig();

/**
 * Authentication step definitions
 */

// Sign in page steps
Given('I am on the sign in page', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] Navigating to /signin...');
  await this.page.goto('/signin', { waitUntil: 'networkidle' });
  console.log(`[AUTH-STEP] Current URL: ${this.page.url()}`);
  console.log('[AUTH-STEP] Waiting for email input...');
  await this.page.waitForSelector('input[type="email"]', {
    state: 'visible',
    timeout: 10000,
  });
  console.log('[AUTH-STEP] Sign in page ready');
});

// Credential entry steps
When('I enter admin credentials', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] Entering admin credentials...');
  await this.page.fill('input[type="email"]', config.adminEmail);
  await this.page.fill('input[type="password"]', config.adminPassword);
  console.log('[AUTH-STEP] Admin credentials entered');
});

When('I enter teacher credentials', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] Entering teacher credentials...');
  await this.page.fill('input[type="email"]', config.teacherEmail);
  await this.page.fill('input[type="password"]', config.teacherPassword);
  console.log('[AUTH-STEP] Teacher credentials entered');
});

When('I enter parent credentials', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] Entering parent credentials...');
  await this.page.fill('input[type="email"]', config.parentEmail);
  await this.page.fill('input[type="password"]', config.parentPassword);
  console.log('[AUTH-STEP] Parent credentials entered');
});

When(
  'I enter email {string} and password {string}',
  async function (this: CustomWorld, email: string, password: string) {
    console.log(`[AUTH-STEP] Entering email: ${email.substring(0, 3)}...`);
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    console.log('[AUTH-STEP] Credentials entered');
  }
);

// Submit steps
When('I click the sign in button', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] Clicking sign in button...');
  await this.page.click('button[type="submit"]');
  console.log('[AUTH-STEP] Sign in button clicked');
});

// Login state steps (using hooks for pre-login)
Given('I am logged in as admin', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] "I am logged in as admin" step started');
  console.log(`[AUTH-STEP] Current URL: ${this.page.url()}`);
  // Check if already logged in as admin
  if (this.page.url().includes('/admin')) {
    console.log('[AUTH-STEP] Already logged in as admin, skipping login');
    return;
  }
  console.log('[AUTH-STEP] Not logged in, calling loginAsAdmin()...');
  await this.authHelper.loginAsAdmin();
  console.log('[AUTH-STEP] loginAsAdmin() completed');
});

Given('I am logged in as teacher', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] "I am logged in as teacher" step started');
  console.log(`[AUTH-STEP] Current URL: ${this.page.url()}`);
  if (this.page.url().includes('/teacher')) {
    console.log('[AUTH-STEP] Already logged in as teacher, skipping login');
    return;
  }
  console.log('[AUTH-STEP] Not logged in, calling loginAsTeacher()...');
  await this.authHelper.loginAsTeacher();
  console.log('[AUTH-STEP] loginAsTeacher() completed');
});

Given('I am logged in as parent', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] "I am logged in as parent" step started');
  console.log(`[AUTH-STEP] Current URL: ${this.page.url()}`);
  if (this.page.url().includes('/parent')) {
    console.log('[AUTH-STEP] Already logged in as parent, skipping login');
    return;
  }
  console.log('[AUTH-STEP] Not logged in, calling loginAsParent()...');
  await this.authHelper.loginAsParent();
  console.log('[AUTH-STEP] loginAsParent() completed');
});

// Redirect verification steps
Then(
  'I should be redirected to the admin dashboard',
  async function (this: CustomWorld) {
    console.log('[AUTH-STEP] Waiting for redirect to admin dashboard...');
    await this.page.waitForURL(/\/admin/, { timeout: 30000 });
    console.log(`[AUTH-STEP] Redirected to: ${this.page.url()}`);
    expect(this.page.url()).toContain('/admin');
  }
);

Then(
  'I should be redirected to the teacher dashboard',
  async function (this: CustomWorld) {
    console.log('[AUTH-STEP] Waiting for redirect to teacher dashboard...');
    await this.page.waitForURL(/\/teacher/, { timeout: 30000 });
    console.log(`[AUTH-STEP] Redirected to: ${this.page.url()}`);
    expect(this.page.url()).toContain('/teacher');
  }
);

Then(
  'I should be redirected to the parent dashboard',
  async function (this: CustomWorld) {
    console.log('[AUTH-STEP] Waiting for redirect to parent dashboard...');
    await this.page.waitForURL(/\/parent/, { timeout: 30000 });
    console.log(`[AUTH-STEP] Redirected to: ${this.page.url()}`);
    expect(this.page.url()).toContain('/parent');
  }
);

Then('I should be on the parent dashboard', async function (this: CustomWorld) {
  console.log(`[AUTH-STEP] Checking URL contains /parent: ${this.page.url()}`);
  expect(this.page.url()).toContain('/parent');
});

// Navigation menu verification
Then(
  'I should see the admin navigation menu',
  async function (this: CustomWorld) {
    console.log('[AUTH-STEP] Checking for admin navigation menu...');
    // Look for admin-specific navigation items
    const navItems = this.page.locator('nav, [role="navigation"]');
    await expect(navItems.first()).toBeVisible();

    // Check for at least one admin menu item
    const adminLinks = this.page.locator(
      'a[href*="/admin"], [role="menuitem"]'
    );
    const count = await adminLinks.count();
    console.log(`[AUTH-STEP] Found ${count} admin links`);
    expect(count).toBeGreaterThan(0);
  }
);

// Logout steps
When('I log out', async function (this: CustomWorld) {
  console.log('[AUTH-STEP] "I log out" step started');
  await this.authHelper.logout();
  console.log('[AUTH-STEP] Logout completed');
});

Then(
  'I should be redirected to the sign in page',
  async function (this: CustomWorld) {
    console.log('[AUTH-STEP] Waiting for redirect to sign in page...');
    await this.page.waitForURL(/\/signin/, { timeout: 10000 });
    console.log(`[AUTH-STEP] Redirected to: ${this.page.url()}`);
    expect(this.page.url()).toContain('/signin');
  }
);

// Error handling steps
Then(
  'I should see an authentication error',
  async function (this: CustomWorld) {
    const errorAlert = this.page.locator('[role="alert"]');
    await expect(errorAlert.first()).toBeVisible({ timeout: 10000 });
  }
);

Then(
  'I should see error message {string}',
  async function (this: CustomWorld, errorMessage: string) {
    await expect(this.page.getByText(errorMessage)).toBeVisible();
  }
);
