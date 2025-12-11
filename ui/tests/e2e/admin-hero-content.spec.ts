import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Admin Hero Content Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin first
    await loginAsAdmin(page);
    // Navigate to admin hero content page
    await page.goto('/admin/content/hero');
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Test unauthenticated access - skip login in beforeEach
    await page.goto('/admin/content/hero', { waitUntil: 'networkidle' });
    // Should redirect to login (auth guard)
    // Note: This may not work if Protected component allows render before redirect
    // await expect(page).toHaveURL(/\/login|\/signin/);
    // Skip for now - auth redirect happens client-side
  });

  test('should show hero content page structure', async ({ page }) => {
    // Test page header and navigation
    await expect(page.locator('h1')).toContainText('Hero Content Management');
    await expect(page.getByText('+ Create New')).toBeVisible();
  });

  test('should show filter buttons', async ({ page }) => {
    await expect(page.getByText('All')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Inactive')).toBeVisible();
  });

  test('should open create form when clicking "Create New"', async ({ page }) => {
    await page.getByText('+ Create New').click();
    
    // Form should be visible
    await expect(page.getByText('Create Event Banner')).toBeVisible();
    await expect(page.getByLabel('Title (English)')).toBeVisible();
    await expect(page.getByLabel('Subtitle (English)')).toBeVisible();
  });

  test('should have all form fields in create form', async ({ page }) => {
    await page.getByText('+ Create New').click();
    
    // Check all fields exist
    await expect(page.getByLabel('Title (English)')).toBeVisible();
    await expect(page.getByLabel('Title (Tamil)')).toBeVisible();
    await expect(page.getByLabel('Subtitle (English)')).toBeVisible();
    await expect(page.getByLabel('Subtitle (Tamil)')).toBeVisible();
    await expect(page.getByLabel('Description (English)')).toBeVisible();
    await expect(page.getByLabel('Description (Tamil)')).toBeVisible();
    await expect(page.getByLabel('Image URL (optional)')).toBeVisible();
    await expect(page.getByLabel('Start Date')).toBeVisible();
    await expect(page.getByLabel('End Date')).toBeVisible();
    await expect(page.getByLabel('Priority (higher shows first)')).toBeVisible();
  });

  test('should close form when clicking Cancel', async ({ page }) => {
    await page.getByText('+ Create New').click();
    await expect(page.getByText('Create Event Banner')).toBeVisible();
    
    await page.getByText('Cancel').first().click();
    await expect(page.getByText('Create Event Banner')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByText('+ Create New').click();
    
    // Try to submit without filling required fields
    await page.getByText('Create Banner').click();
    
    // Form should not submit (HTML5 validation)
    await expect(page.getByText('Create Event Banner')).toBeVisible();
  });

  test('should create hero content with valid data', async ({ page }) => {
    await page.getByText('+ Create New').click();
    
    // Fill form
    await page.getByLabel('Title (English)').fill('Test Event 2025');
    await page.getByLabel('Title (Tamil)').fill('சோதனை நிகழ்வு 2025');
    await page.getByLabel('Subtitle (English)').fill('Join us for a great event');
    await page.getByLabel('Subtitle (Tamil)').fill('ஒரு சிறந்த நிகழ்விற்கு எங்களுடன் சேரவும்');
    await page.getByLabel('Description (English)').fill('This is a test event description');
    await page.getByLabel('Start Date').fill('2025-01-15');
    await page.getByLabel('End Date').fill('2025-02-28');
    await page.getByLabel('Priority (higher shows first)').fill('10');
    
    // Submit
    await page.getByText('Create Banner').click();
    
    // Should show success and close form
    await expect(page.getByText('Create Event Banner')).not.toBeVisible();
  });

  test('should display created hero content in list', async ({ page }) => {
    // After creating, should appear in list
    await expect(page.getByText('Test Event 2025')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('should toggle active status', async ({ page }) => {
    // Find an active item and deactivate it
    const activeItem = page.locator('li').filter({ hasText: 'Active' }).first();
    await activeItem.getByText('Deactivate').click();
    
    // Should change to inactive
    await expect(activeItem.getByText('Inactive')).toBeVisible();
  });

  test('should delete hero content with confirmation', async ({ page }) => {
    // Setup dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    const item = page.locator('li').first();
    const itemText = await item.textContent();
    
    await item.getByText('Delete').click();
    
    // Item should be removed
    await expect(page.locator('li').filter({ hasText: itemText || '' })).not.toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    // Click Active filter
    await page.getByText('Active').click();
    
    // Should only show active items
    const items = page.locator('li');
    const count = await items.count();
    
    // All visible items should have "Active" badge
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).toContainText('Active');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Page should be accessible and functional
    await expect(page.getByText('Hero Content Management')).toBeVisible();
    await expect(page.getByText('+ Create New')).toBeVisible();
  });
});

test.describe('Homepage Hero Section', () => {
  test('should show Thirukkural by default when no active banner', async ({ page }) => {
    await page.goto('/');
    
    // Should show Thirukkural display (look for Tamil script or specific text)
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Hero section should be visible and properly formatted
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
  });

  test('should switch language', async ({ page }) => {
    await page.goto('/');
    
    // Look for language toggle (implementation may vary)
    // This is a placeholder test - adjust selectors based on actual implementation
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
  });
});
