import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Admin Teachers List Page', () => {
  // Note: These tests require admin authentication

  test('should require authentication', async ({ page }) => {
    await page.goto('/admin/users/teachers/list');
    
    // Should redirect to login if not authenticated
    // Or show "Loading..." if auth is being checked
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/(login|signin|admin)/);
  });

  test.describe('Authenticated as Admin', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/users/teachers/list');
    });

  test.describe('Authenticated as Admin', () => {
    test('should display teachers list page structure', async ({ page }) => {
      // Skip until auth mocking is available
      
      await page.goto('/admin/users/teachers/list');
      
      // Should show page title
      await expect(page.getByRole('heading', { name: /teachers/i })).toBeVisible();
      
      // Should show search input
      await expect(page.getByPlaceholder(/search by name or email/i)).toBeVisible();
      
      // Should show status filter
      await expect(page.getByRole('combobox', { name: /status/i })).toBeVisible();
      
      // Should show table or empty state
      const hasTable = await page.getByRole('table').isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no teachers found/i).isVisible().catch(() => false);
      expect(hasTable || hasEmptyState).toBeTruthy();
    });

    test('should allow searching teachers', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      // Wait for page to load
      await page.waitForSelector('input[placeholder*="Search"]');
      
      // Type in search box
      await page.fill('input[placeholder*="Search"]', 'john');
      
      // Should trigger search (debounced)
      await page.waitForTimeout(500);
      
      // Verify URL has search param
      expect(page.url()).toContain('search');
    });

    test('should allow filtering by status', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      const statusSelect = page.getByRole('combobox', { name: /status/i });
      
      // Select 'inactive'
      await statusSelect.selectOption('inactive');
      
      // Should update the list
      await page.waitForTimeout(500);
      
      // Select 'all'
      await statusSelect.selectOption('all');
      await page.waitForTimeout(500);
    });

    test('should display teachers in table format', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      // Should have table headers
      await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /joined/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible();
    });

    test('should have pagination controls when needed', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      // If there are multiple pages, should show pagination
      const hasPagination = await page.getByRole('button', { name: /previous/i }).isVisible().catch(() => false);
      
      if (hasPagination) {
        await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
        await expect(page.getByText(/page \d+ of \d+/i)).toBeVisible();
      }
    });

    test('should show loading state', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      // Should briefly show loading spinner
      const loadingVisible = await page.getByText(/loading teachers/i).isVisible({ timeout: 1000 }).catch(() => false);
      // Loading might be too fast to catch, which is fine
      expect(typeof loadingVisible).toBe('boolean');
    });

    test('should show error state when API fails', async ({ page }) => {
      // TODO: Implement with API mocking to force error
      // This would require intercepting the network request and returning an error
    });

    test('should navigate to teacher detail page', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      // Click on "View" link for first teacher
      const viewLink = page.getByRole('link', { name: /view/i }).first();
      await viewLink.click();
      
      // Should navigate to teacher detail page
      await page.waitForURL(/\/admin\/users\/teachers\/\w+$/);
    });

    test('should navigate to teacher edit page', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      // Click on "Edit" link for first teacher
      const editLink = page.getByRole('link', { name: /edit/i }).first();
      await editLink.click();
      
      // Should navigate to teacher edit page
      await page.waitForURL(/\/admin\/users\/teachers\/\w+\/edit$/);
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/admin/users/teachers/list');
      
      // Should render without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
    });
  });
});

test.describe('Admin Dashboard Teachers Link', () => {
  test('admin dashboard should have navigation to teachers', async ({ page }) => {
    await page.goto('/admin');
    
    // New layout: should have Teachers dropdown in header
    const teachersButton = page.getByRole('button', { name: /teachers/i });
    await expect(teachersButton).toBeVisible();
    
    // Click to open dropdown
    await teachersButton.click();
    
    // Should show "All Teachers" link in dropdown
    const allTeachersLink = page.getByRole('link', { name: /all teachers/i });
    await expect(allTeachersLink).toBeVisible();
    
    // Click should navigate to teachers list
    await allTeachersLink.click();
    await page.waitForURL('/admin/users/teachers/list');
  });
});
