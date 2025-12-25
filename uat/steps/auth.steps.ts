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
  await this.page.goto('/signin', { waitUntil: 'networkidle' });
  await this.page.waitForSelector('input[type="email"]', {
    state: 'visible',
    timeout: 10000,
  });
});

// Credential entry steps
When('I enter admin credentials', async function (this: CustomWorld) {
  await this.page.fill('input[type="email"]', config.adminEmail);
  await this.page.fill('input[type="password"]', config.adminPassword);
});

When('I enter teacher credentials', async function (this: CustomWorld) {
  await this.page.fill('input[type="email"]', config.teacherEmail);
  await this.page.fill('input[type="password"]', config.teacherPassword);
});

When('I enter parent credentials', async function (this: CustomWorld) {
  await this.page.fill('input[type="email"]', config.parentEmail);
  await this.page.fill('input[type="password"]', config.parentPassword);
});

When(
  'I enter email {string} and password {string}',
  async function (this: CustomWorld, email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
  }
);

// Submit steps
When('I click the sign in button', async function (this: CustomWorld) {
  await this.page.click('button[type="submit"]');
});

// Login state steps (using hooks for pre-login)
Given('I am logged in as admin', async function (this: CustomWorld) {
  // Check if already logged in as admin
  if (this.page.url().includes('/admin')) {
    return;
  }
  await this.authHelper.loginAsAdmin();
});

Given('I am logged in as teacher', async function (this: CustomWorld) {
  if (this.page.url().includes('/teacher')) {
    return;
  }
  await this.authHelper.loginAsTeacher();
});

Given('I am logged in as parent', async function (this: CustomWorld) {
  if (this.page.url().includes('/parent')) {
    return;
  }
  await this.authHelper.loginAsParent();
});

// Redirect verification steps
Then(
  'I should be redirected to the admin dashboard',
  async function (this: CustomWorld) {
    await this.page.waitForURL(/\/admin/, { timeout: 30000 });
    expect(this.page.url()).toContain('/admin');
  }
);

Then(
  'I should be redirected to the teacher dashboard',
  async function (this: CustomWorld) {
    await this.page.waitForURL(/\/teacher/, { timeout: 30000 });
    expect(this.page.url()).toContain('/teacher');
  }
);

Then(
  'I should be redirected to the parent dashboard',
  async function (this: CustomWorld) {
    await this.page.waitForURL(/\/parent/, { timeout: 30000 });
    expect(this.page.url()).toContain('/parent');
  }
);

Then('I should be on the parent dashboard', async function (this: CustomWorld) {
  expect(this.page.url()).toContain('/parent');
});

// Navigation menu verification
Then(
  'I should see the admin navigation menu',
  async function (this: CustomWorld) {
    // Look for admin-specific navigation items
    const navItems = this.page.locator('nav, [role="navigation"]');
    await expect(navItems.first()).toBeVisible();

    // Check for at least one admin menu item
    const adminLinks = this.page.locator(
      'a[href*="/admin"], [role="menuitem"]'
    );
    const count = await adminLinks.count();
    expect(count).toBeGreaterThan(0);
  }
);

// Logout steps
When('I log out', async function (this: CustomWorld) {
  await this.authHelper.logout();
});

Then(
  'I should be redirected to the sign in page',
  async function (this: CustomWorld) {
    await this.page.waitForURL(/\/signin/, { timeout: 10000 });
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
