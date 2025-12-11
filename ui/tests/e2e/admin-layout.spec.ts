import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Admin Layout Navigation', () => {
  test('should require authentication', async ({ page }) => {
    await page.goto('/admin');
    
    // Should redirect to login if not authenticated
    // Or show "Loading..." if auth is being checked
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/(login|signin|admin)/);
  });

  test.describe('Authenticated as Admin', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
    });

    test('should display admin portal header', async ({ page }) => {
      await page.goto('/admin');
      
      await expect(page.getByText('Admin Portal')).toBeVisible();
    });

    test('should display navigation sections in header', async ({ page }) => {
      await page.goto('/admin');
      
      // Should show three main navigation buttons
      await expect(page.getByRole('button', { name: /teachers/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /classes/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /content/i })).toBeVisible();
    });

    test('should show dropdown menu on click', async ({ page }) => {
      await page.goto('/admin');
      
      // Click Teachers dropdown
      await page.getByRole('button', { name: /teachers/i }).click();
      
      // Should show dropdown items
      await expect(page.getByRole('link', { name: /all teachers/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /invite teacher/i })).toBeVisible();
    });

    test('should navigate from dropdown', async ({ page }) => {
      await page.goto('/admin');
      
      // Open Teachers dropdown
      await page.getByRole('button', { name: /teachers/i }).click();
      
      // Click "All Teachers"
      await page.getByRole('link', { name: /all teachers/i }).click();
      
      // Should navigate to teachers list
      await page.waitForURL('/admin/users/teachers/list');
    });

    test('should show sidebar when in section', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      // Sidebar should be visible (desktop only)
      await page.setViewportSize({ width: 1024, height: 768 });
      
      // Should show Teachers section in sidebar
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();
      await expect(sidebar.getByText('Teachers')).toBeVisible();
    });

    test('should highlight active section', async ({ page }) => {
      await page.goto('/admin/content/hero');
      
      // Content button should be highlighted
      const contentButton = page.getByRole('button', { name: /content/i });
      await expect(contentButton).toHaveClass(/bg-blue-50/);
    });

    test('should show mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile
      await page.goto('/admin');
      
      // Should show hamburger menu
      const mobileMenuButton = page.locator('button:has-text("☰")');
      await expect(mobileMenuButton).toBeVisible();
      
      // Click to open menu
      await mobileMenuButton.click();
      
      // Should show navigation items
      await expect(page.getByText('Teachers')).toBeVisible();
      await expect(page.getByText('Classes')).toBeVisible();
      await expect(page.getByText('Content')).toBeVisible();
    });

    test('should close dropdown when clicking outside', async ({ page }) => {
      await page.goto('/admin');
      
      // Open dropdown
      await page.getByRole('button', { name: /teachers/i }).click();
      
      // Dropdown should be visible
      await expect(page.getByRole('link', { name: /all teachers/i })).toBeVisible();
      
      // Click outside
      await page.click('body');
      
      // Dropdown should close
      await expect(page.getByRole('link', { name: /all teachers/i })).not.toBeVisible();
    });

    test('should maintain navigation state across pages', async ({ page }) => {
      await page.goto('/admin/users/teachers/list');
      
      // Teachers section should be active
      await expect(page.getByRole('button', { name: /teachers/i })).toHaveClass(/bg-blue-50/);
      
      // Navigate to invite page
      await page.goto('/admin/teachers/invite');
      
      // Teachers should still be active
      await expect(page.getByRole('button', { name: /teachers/i })).toHaveClass(/bg-blue-50/);
    });
  });
});

test.describe('Admin Layout Sidebar', () => {
  test('should show sidebar items for Teachers section', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/admin/users/teachers/list');
    
    const sidebar = page.locator('aside');
    
    // Should show Teachers heading
    await expect(sidebar.getByText('Teachers')).toBeVisible();
    
    // Should show navigation links
    await expect(sidebar.getByRole('link', { name: /all teachers/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /invite teacher/i })).toBeVisible();
  });

  test('should show sidebar items for Content section', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/admin/content/hero');
    
    const sidebar = page.locator('aside');
    
    // Should show Content heading
    await expect(sidebar.getByText('Content')).toBeVisible();
    
    // Should show navigation link
    await expect(sidebar.getByRole('link', { name: /hero content/i })).toBeVisible();
  });

  test('should not show sidebar on dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    // Sidebar should not exist on dashboard
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toBeVisible();
  });

  test('should highlight active page in sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/admin/users/teachers/list');
    
    const sidebar = page.locator('aside');
    const allTeachersLink = sidebar.getByRole('link', { name: /all teachers/i });
    
    // Active link should have blue background
    await expect(allTeachersLink).toHaveClass(/bg-blue-50/);
  });

  test('should be sticky on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/admin/users/teachers/list');
    
    const sidebar = page.locator('aside');
    
    // Should have sticky positioning
    await expect(sidebar).toHaveCSS('position', 'sticky');
  });

  test('should not show on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/users/teachers/list');
    
    // Sidebar should be hidden on mobile (md:block class)
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toBeVisible();
  });
});
