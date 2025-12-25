import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

/**
 * Navigation step definitions for admin, teacher, and parent sections
 */

// Admin navigation steps
When(
  'I navigate to the admin students page',
  async function (this: CustomWorld) {
    await this.page.goto('/admin/students', { waitUntil: 'domcontentloaded' });
  }
);

When(
  'I navigate to the admin teachers page',
  async function (this: CustomWorld) {
    await this.page.goto('/admin/teachers', { waitUntil: 'domcontentloaded' });
  }
);

When(
  'I navigate to the admin classes page',
  async function (this: CustomWorld) {
    await this.page.goto('/admin/classes', { waitUntil: 'domcontentloaded' });
  }
);

When(
  'I navigate to the admin grades page',
  async function (this: CustomWorld) {
    await this.page.goto('/admin/grades', { waitUntil: 'domcontentloaded' });
  }
);

When(
  'I navigate to the admin textbooks page',
  async function (this: CustomWorld) {
    await this.page.goto('/admin/textbooks', { waitUntil: 'domcontentloaded' });
  }
);

When(
  'I navigate to the admin volunteers page',
  async function (this: CustomWorld) {
    await this.page.goto('/admin/volunteers', { waitUntil: 'domcontentloaded' });
  }
);

// Teacher navigation steps
When(
  'I navigate to the teacher dashboard',
  async function (this: CustomWorld) {
    await this.page.goto('/teacher', { waitUntil: 'domcontentloaded' });
  }
);

When(
  'I navigate to the teacher classes page',
  async function (this: CustomWorld) {
    await this.page.goto('/teacher/classes', { waitUntil: 'domcontentloaded' });
  }
);

// Parent navigation steps
When(
  'I navigate to the parent dashboard',
  async function (this: CustomWorld) {
    await this.page.goto('/parent', { waitUntil: 'domcontentloaded' });
  }
);

When(
  'I navigate to the parent students page',
  async function (this: CustomWorld) {
    await this.page.goto('/parent/students', { waitUntil: 'domcontentloaded' });
  }
);

When(
  'I navigate to the parent profile page',
  async function (this: CustomWorld) {
    await this.page.goto('/parent/profile', { waitUntil: 'domcontentloaded' });
  }
);

// Public page navigation
When('I navigate to the calendar page', async function (this: CustomWorld) {
  await this.page.goto('/calendar', { waitUntil: 'domcontentloaded' });
});

When('I navigate to the documents page', async function (this: CustomWorld) {
  await this.page.goto('/documents', { waitUntil: 'domcontentloaded' });
});

When('I navigate to the team page', async function (this: CustomWorld) {
  await this.page.goto('/team', { waitUntil: 'domcontentloaded' });
});

When('I navigate to the donate page', async function (this: CustomWorld) {
  await this.page.goto('/donate', { waitUntil: 'domcontentloaded' });
});

// Table verification steps
Then('I should see the students table', async function (this: CustomWorld) {
  // Wait for page to load data
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000); // Allow time for data fetch

  const table = this.page.locator(
    'table, [role="table"], [data-testid="students-table"], [data-testid="students-list"]'
  );
  await expect(table.first()).toBeVisible({ timeout: 20000 });
});

Then('I should see the teachers table', async function (this: CustomWorld) {
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);

  const table = this.page.locator(
    'table, [role="table"], [data-testid="teachers-table"], [data-testid="teachers-list"]'
  );
  await expect(table.first()).toBeVisible({ timeout: 20000 });
});

Then('I should see the classes table', async function (this: CustomWorld) {
  const table = this.page.locator(
    'table, [role="table"], [data-testid="classes-table"]'
  );
  await expect(table.first()).toBeVisible({ timeout: 15000 });
});

Then('I should see the grades table', async function (this: CustomWorld) {
  const table = this.page.locator(
    'table, [role="table"], [data-testid="grades-table"]'
  );
  await expect(table.first()).toBeVisible({ timeout: 15000 });
});

Then('I should see the textbooks table', async function (this: CustomWorld) {
  const table = this.page.locator(
    'table, [role="table"], [data-testid="textbooks-table"]'
  );
  await expect(table.first()).toBeVisible({ timeout: 15000 });
});

Then('I should see the volunteers table', async function (this: CustomWorld) {
  const table = this.page.locator(
    'table, [role="table"], [data-testid="volunteers-table"]'
  );
  await expect(table.first()).toBeVisible({ timeout: 15000 });
});

// Dashboard content verification
Then('I should see my students section', async function (this: CustomWorld) {
  // Look for student-related content on parent dashboard
  const studentsSection = this.page.locator(
    '[data-testid="students-section"], .students-section, h2:has-text("Student"), h3:has-text("Student")'
  );
  await expect(studentsSection.first()).toBeVisible({ timeout: 15000 });
});

Then('I should see my classes section', async function (this: CustomWorld) {
  const classesSection = this.page.locator(
    '[data-testid="classes-section"], .classes-section, h2:has-text("Class"), h3:has-text("Class")'
  );
  await expect(classesSection.first()).toBeVisible({ timeout: 15000 });
});

// Header/Navigation verification
Then(
  'I should see the {string} link in the navigation',
  async function (this: CustomWorld, linkText: string) {
    const navLink = this.page.locator(`nav a:has-text("${linkText}")`);
    await expect(navLink.first()).toBeVisible();
  }
);

// Breadcrumb verification
Then(
  'the breadcrumb should show {string}',
  async function (this: CustomWorld, breadcrumbText: string) {
    const breadcrumb = this.page.locator(
      '[aria-label="breadcrumb"], .breadcrumb'
    );
    await expect(breadcrumb).toContainText(breadcrumbText);
  }
);

// Column header verification
Then(
  'I should see the {string} column header',
  async function (this: CustomWorld, columnName: string) {
    const header = this.page.getByRole('columnheader', { name: columnName });
    await expect(header).toBeVisible({ timeout: 15000 });
  }
);

// Table link click steps
When(
  'I click the first Edit link in the table',
  async function (this: CustomWorld) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    const editLink = this.page.getByRole('link', { name: 'Edit' }).first();
    await expect(editLink).toBeVisible({ timeout: 15000 });
    await editLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
);

When(
  'I click the first View link in the table',
  async function (this: CustomWorld) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    const viewLink = this.page.getByRole('link', { name: 'View' }).first();
    await expect(viewLink).toBeVisible({ timeout: 15000 });
    await viewLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
);

// Heading verification
Then(
  'I should see the {string} heading',
  async function (this: CustomWorld, headingText: string) {
    const heading = this.page.getByRole('heading', { name: headingText });
    await expect(heading).toBeVisible({ timeout: 15000 });
  }
);

// Section verification
Then(
  'I should see {string} section',
  async function (this: CustomWorld, sectionText: string) {
    const section = this.page.getByText(sectionText);
    await expect(section.first()).toBeVisible({ timeout: 15000 });
  }
);

// Button visibility
Then(
  'I should see a {string} button',
  async function (this: CustomWorld, buttonText: string) {
    // Check for both button and link styled as button
    const button = this.page.getByRole('button', { name: buttonText });
    const link = this.page.getByRole('link', { name: buttonText });
    const either = button.or(link);
    await expect(either.first()).toBeVisible({ timeout: 15000 });
  }
);

Then(
  'I should see an {string} button',
  async function (this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole('button', { name: buttonText });
    const link = this.page.getByRole('link', { name: buttonText });
    const either = button.or(link);
    await expect(either.first()).toBeVisible({ timeout: 15000 });
  }
);

// Click button (button or link)
When(
  'I click the {string} button',
  async function (this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole('button', { name: buttonText });
    const link = this.page.getByRole('link', { name: buttonText });
    const either = button.or(link);
    await either.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }
);

// URL not contain
Then(
  'the URL should not contain {string}',
  async function (this: CustomWorld, urlPart: string) {
    expect(this.page.url()).not.toContain(urlPart);
  }
);
