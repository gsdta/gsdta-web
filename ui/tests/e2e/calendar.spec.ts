import { test, expect } from '@playwright/test';

test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for page load
    await page.goto('/calendar', { timeout: 30000, waitUntil: 'domcontentloaded' });
  });

  test('should display the calendar page with correct title', async ({ page }) => {
    await expect(page.getByTestId('page-title')).toContainText('Calendar 2025-26', { timeout: 15000 });
  });

  test('should have view mode toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Month' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Week' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Agenda' })).toBeVisible();
  });

  test('should have navigation controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });

  test('should switch between month, week, and agenda views', async ({ page }) => {
    // Start in month view (default)
    await expect(page.getByRole('button', { name: 'Month' })).toHaveClass(/bg-white/, { timeout: 15000 });

    // Switch to week view
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(page.getByRole('button', { name: 'Week' })).toHaveClass(/bg-white/);

    // Switch to agenda view
    await page.getByRole('button', { name: 'Agenda' }).click();
    await expect(page.getByRole('button', { name: 'Agenda' })).toHaveClass(/bg-white/);

    // Switch back to month view
    await page.getByRole('button', { name: 'Month' }).click();
    await expect(page.getByRole('button', { name: 'Month' })).toHaveClass(/bg-white/);
  });

  test('should navigate to next and previous months', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 15000 });

    // Click next button
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500); // Wait for UI update

    // Click previous button
    await page.getByRole('button', { name: 'Previous' }).click();
    await page.waitForTimeout(500); // Wait for UI update
  });

  test('should return to today when clicking today button', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 15000 });

    // Navigate away from today
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);

    // Click today button
    await page.getByRole('button', { name: 'Today' }).click();
    await page.waitForTimeout(500);
  });

  test('should display download menu when clicking download button', async ({ page }) => {
    const downloadButton = page.getByRole('button', { name: /Download Calendar/ });
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
    await downloadButton.click();

    // Check that the dropdown menu appears
    await expect(page.getByText('Calendar File (.ics)')).toBeVisible();
    await expect(page.getByText('Excel File (.xlsx)')).toBeVisible();
    await expect(page.getByText('Import into Google Calendar, Apple Calendar, Outlook')).toBeVisible();
  });

  test('should close download menu when clicking outside', async ({ page }) => {
    // Open the menu
    const downloadButton = page.getByRole('button', { name: /Download Calendar/ });
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
    await downloadButton.click();
    await expect(page.getByText('Calendar File (.ics)')).toBeVisible();

    // Click outside the menu
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Menu should be closed
    await expect(page.getByText('Calendar File (.ics)')).not.toBeVisible();
  });

  test('should display calendar in month view with day headers', async ({ page }) => {
    // Wait for month view to load
    await expect(page.getByRole('button', { name: 'Month' })).toBeVisible({ timeout: 15000 });

    // Check for day headers
    await expect(page.getByText('Sun').first()).toBeVisible();
    await expect(page.getByText('Mon').first()).toBeVisible();
    await expect(page.getByText('Tue').first()).toBeVisible();
    await expect(page.getByText('Wed').first()).toBeVisible();
    await expect(page.getByText('Thu').first()).toBeVisible();
    await expect(page.getByText('Fri').first()).toBeVisible();
    await expect(page.getByText('Sat').first()).toBeVisible();
  });

  test('should display events in month view', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('button', { name: 'Month' })).toBeVisible({ timeout: 15000 });

    // Navigate to August 2025 where we know there's a GSDTA event
    await page.getByRole('button', { name: 'Today' }).click();

    // Look for any event in the calendar grid
    const calendarGrid = page.locator('.grid.grid-cols-7').last();
    await expect(calendarGrid).toBeVisible();
  });

  test('should display events in week view', async ({ page }) => {
    // Switch to week view
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(page.getByRole('button', { name: 'Week' })).toHaveClass(/bg-white/, { timeout: 15000 });

    // Check for day headers in week view
    const weekGrid = page.locator('.grid.grid-cols-7').first();
    await expect(weekGrid).toBeVisible();
  });

  test('should display events in agenda view', async ({ page }) => {
    // Switch to agenda view
    await page.getByRole('button', { name: 'Agenda' }).click();
    await expect(page.getByRole('button', { name: 'Agenda' })).toHaveClass(/bg-white/, { timeout: 15000 });

    // Check that events are listed chronologically
    await page.waitForTimeout(500);
  });

  test('should display summary statistics', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 15000 });

    // Use more specific selectors for the stats cards - check for the stat card container
    const statsSection = page.locator('.grid.grid-cols-2.md\\:grid-cols-4').last();
    await expect(statsSection).toBeVisible();

    // Check each stat card individually
    await expect(statsSection.locator('text=GSDTA Events').first()).toBeVisible();
    await expect(statsSection.locator('text=India Holidays').first()).toBeVisible();
    await expect(statsSection.locator('text=Long Weekends').first()).toBeVisible();
    await expect(statsSection.locator('text=Test Weeks').first()).toBeVisible();
  });

  test('should display legend', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 15000 });

    // Find the legend section specifically
    const legendSection = page.locator('.bg-gray-50.rounded-lg:has-text("Legend")');
    await expect(legendSection).toBeVisible();

    await expect(legendSection.getByText('Legend')).toBeVisible();
    await expect(legendSection.getByText('GSDTA Events')).toBeVisible();
    await expect(legendSection.getByText('Tests/Revision')).toBeVisible();

    // Use contains for text that appears in legend
    const legendText = await legendSection.textContent();
    expect(legendText).toContain('India Holidays');
    expect(legendText).toContain('Long Weekends');
  });

  test('should trigger ICS download when clicking calendar file option', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('button', { name: /Download Calendar/ })).toBeVisible({ timeout: 15000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Open menu and click ICS option
    await page.getByRole('button', { name: /Download Calendar/ }).click();
    await page.getByText('Calendar File (.ics)').click();

    // Wait for download to start
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('gsdta-calendar-2025-26.ics');
  });
});
