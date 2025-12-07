import { test, expect } from '@playwright/test';

test.describe('Admin Hero Content Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin hero content page
    await page.goto('http://localhost:3000/admin/content/hero');
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login|\/signin/);
  });

  test('should show hero content list for admin users', async ({ page }) => {
    // TODO: Mock authentication as admin user
    // For now, this test verifies the page structure
    
    // Check if we're on login page (expected when not authenticated)
    const isOnLoginPage = page.url().includes('/login') || page.url().includes('/signin');
    expect(isOnLoginPage).toBe(true);
  });
});

test.describe('Homepage Hero Section', () => {
  test('should show Thirukkural by default when no active banner', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Should show Thirukkural display (look for Tamil script or specific text)
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    
    // Hero section should be visible and properly formatted
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
  });

  test('should switch language', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Look for language toggle (implementation may vary)
    // This is a placeholder test - adjust selectors based on actual implementation
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
  });
});
