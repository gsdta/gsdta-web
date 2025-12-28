import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin, loginAsAdmin } from '../helpers/auth';

test.describe('Super Admin Navigation', () => {
  test('SA-001: Super admin sees Super Admin section in sidebar', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin');

    // Super Admin section should be visible
    await expect(page.getByRole('heading', { name: 'Super Admin' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Admin Users/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Audit Log/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Security/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Settings/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Recovery/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Data Export/i })).toBeVisible();
  });

  test('SA-002: Regular admin does NOT see Super Admin section', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    // Super Admin section should NOT be visible for regular admin
    await expect(page.getByRole('heading', { name: 'Super Admin' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Admin Users/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Audit Log/i })).not.toBeVisible();
  });
});

test.describe('Super Admin - Admin Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('SA-003: Can navigate to Admin Users page', async ({ page }) => {
    await page.goto('/admin/super-admin/admins');

    await expect(page.locator('h1', { hasText: 'Admin Users' })).toBeVisible();
    await expect(page.getByText('Manage administrators and super administrators')).toBeVisible();
  });

  test('SA-004: Admin Users page shows user table or empty state', async ({ page }) => {
    await page.goto('/admin/super-admin/admins');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Either we see the table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText('No admin users found');

    await expect(table.or(emptyState).first()).toBeVisible();
  });

  test('SA-005: Search input is visible on Admin Users page', async ({ page }) => {
    await page.goto('/admin/super-admin/admins');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });
});

test.describe('Super Admin - Audit Log Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('SA-006: Can navigate to Audit Log page', async ({ page }) => {
    await page.goto('/admin/super-admin/audit-log');

    await expect(page.locator('h1', { hasText: 'Audit Log' })).toBeVisible();
  });

  test('SA-007: Audit Log page shows entries or empty state', async ({ page }) => {
    await page.goto('/admin/super-admin/audit-log');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Either we see the table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText(/No audit log entries|No entries found/i);

    await expect(table.or(emptyState).first()).toBeVisible();
  });

  test('SA-008: Audit Log has filter controls', async ({ page }) => {
    await page.goto('/admin/super-admin/audit-log');

    // Wait for page to load
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check for filter dropdown or inputs
    const filterSection = page.locator('select, input[type="date"]');
    await expect(filterSection.first()).toBeVisible();
  });

  test('SA-009: Audit Log has export button', async ({ page }) => {
    await page.goto('/admin/super-admin/audit-log');

    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });
});

test.describe('Super Admin - Security Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('SA-010: Can navigate to Security page', async ({ page }) => {
    await page.goto('/admin/super-admin/security');

    await expect(page.locator('h1', { hasText: 'Security Monitoring' })).toBeVisible();
  });

  test('SA-011: Security page shows tabs', async ({ page }) => {
    await page.goto('/admin/super-admin/security');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check for tabs or sections
    await expect(page.getByRole('button', { name: /Failed Logins/i }).or(page.getByText(/Failed Logins/i))).toBeVisible();
    await expect(page.getByRole('button', { name: /Security Events/i }).or(page.getByText(/Security Events/i))).toBeVisible();
  });

  test('SA-012: Security page shows events or empty state', async ({ page }) => {
    await page.goto('/admin/super-admin/security');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Either we see a table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText(/No.*found|No events|No failed logins/i);

    await expect(table.or(emptyState).first()).toBeVisible();
  });
});

test.describe('Super Admin - Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('SA-013: Can navigate to Settings page', async ({ page }) => {
    await page.goto('/admin/super-admin/settings');

    await expect(page.locator('h1', { hasText: 'System Settings' })).toBeVisible();
  });

  test('SA-014: Settings page shows Maintenance Mode section', async ({ page }) => {
    await page.goto('/admin/super-admin/settings');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await expect(page.getByText(/Maintenance Mode/i)).toBeVisible();
  });

  test('SA-015: Settings page shows Rate Limits section', async ({ page }) => {
    await page.goto('/admin/super-admin/settings');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await expect(page.getByText(/Rate Limits/i)).toBeVisible();
  });

  test('SA-016: Settings page shows Backup section', async ({ page }) => {
    await page.goto('/admin/super-admin/settings');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await expect(page.getByText(/Backup/i)).toBeVisible();
  });

  test('SA-017: Settings page has save button', async ({ page }) => {
    await page.goto('/admin/super-admin/settings');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
  });
});

test.describe('Super Admin - Recovery Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('SA-018: Can navigate to Recovery page', async ({ page }) => {
    await page.goto('/admin/super-admin/recovery');

    await expect(page.locator('h1', { hasText: 'Data Recovery' })).toBeVisible();
  });

  test('SA-019: Recovery page shows tabs for Deleted Data and Suspensions', async ({ page }) => {
    await page.goto('/admin/super-admin/recovery');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check for tabs
    await expect(page.getByRole('button', { name: /Deleted Data/i }).or(page.getByText(/Deleted Data/i))).toBeVisible();
    await expect(page.getByRole('button', { name: /Suspensions/i }).or(page.getByText(/Suspensions/i))).toBeVisible();
  });

  test('SA-020: Recovery page shows data or empty state', async ({ page }) => {
    await page.goto('/admin/super-admin/recovery');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Either we see a table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText(/No deleted data|No suspended users|No data found/i);

    await expect(table.or(emptyState).first()).toBeVisible();
  });
});

test.describe('Super Admin - Export Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('SA-021: Can navigate to Export page', async ({ page }) => {
    await page.goto('/admin/super-admin/export');

    await expect(page.locator('h1', { hasText: 'Data Export' })).toBeVisible();
  });

  test('SA-022: Export page shows export type options', async ({ page }) => {
    await page.goto('/admin/super-admin/export');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    // Check for export type buttons
    await expect(page.getByText('Full Export')).toBeVisible();
    await expect(page.getByText('Users Only')).toBeVisible();
    await expect(page.getByText('Students Only')).toBeVisible();
    await expect(page.getByText('Audit Trail')).toBeVisible();
    await expect(page.getByText('Classes & Grades')).toBeVisible();
  });

  test('SA-023: Export page has Start Export button', async ({ page }) => {
    await page.goto('/admin/super-admin/export');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Start Export/i })).toBeVisible();
  });

  test('SA-024: Export page shows Export History section', async ({ page }) => {
    await page.goto('/admin/super-admin/export');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await expect(page.getByText('Export History')).toBeVisible();
  });

  test('SA-025: Export page has Refresh button for history', async ({ page }) => {
    await page.goto('/admin/super-admin/export');

    // Wait for loading
    await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
  });
});

test.describe('Super Admin - Access Control', () => {
  test('SA-026: Regular admin cannot access Admin Users page directly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/super-admin/admins');

    // Should show access denied or redirect
    const accessDenied = page.getByText(/Access Denied|must be a Super Administrator/i);
    const redirected = page.getByRole('heading', { name: 'Admin Portal' });

    await expect(accessDenied.or(redirected).first()).toBeVisible();
  });

  test('SA-027: Regular admin cannot access Audit Log page directly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/super-admin/audit-log');

    // Should show access denied or redirect
    const accessDenied = page.getByText(/Access Denied|must be a Super Administrator/i);
    const redirected = page.getByRole('heading', { name: 'Admin Portal' });

    await expect(accessDenied.or(redirected).first()).toBeVisible();
  });

  test('SA-028: Regular admin cannot access Security page directly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/super-admin/security');

    // Should show access denied or redirect
    const accessDenied = page.getByText(/Access Denied|must be a Super Administrator/i);
    const redirected = page.getByRole('heading', { name: 'Admin Portal' });

    await expect(accessDenied.or(redirected).first()).toBeVisible();
  });

  test('SA-029: Regular admin cannot access Settings page directly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/super-admin/settings');

    // Should show access denied or redirect
    const accessDenied = page.getByText(/Access Denied|must be a Super Administrator/i);
    const redirected = page.getByRole('heading', { name: 'Admin Portal' });

    await expect(accessDenied.or(redirected).first()).toBeVisible();
  });

  test('SA-030: Regular admin cannot access Recovery page directly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/super-admin/recovery');

    // Should show access denied or redirect
    const accessDenied = page.getByText(/Access Denied|must be a Super Administrator/i);
    const redirected = page.getByRole('heading', { name: 'Admin Portal' });

    await expect(accessDenied.or(redirected).first()).toBeVisible();
  });

  test('SA-031: Regular admin cannot access Export page directly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/super-admin/export');

    // Should show access denied or redirect
    const accessDenied = page.getByText(/Access Denied|must be a Super Administrator/i);
    const redirected = page.getByRole('heading', { name: 'Admin Portal' });

    await expect(accessDenied.or(redirected).first()).toBeVisible();
  });
});
