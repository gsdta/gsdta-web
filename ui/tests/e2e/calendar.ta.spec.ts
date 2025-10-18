import { test, expect } from '@playwright/test';

// Tamil language tests for Calendar page

test.describe('Calendar Page (Tamil)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("i18n:lang", "ta");
        window.sessionStorage.clear();
      } catch {}
    });
    await page.goto('/calendar', { timeout: 30000, waitUntil: 'domcontentloaded' });
  });

  test('should display the calendar page with correct title', async ({ page }) => {
    await expect(page.getByTestId('page-title')).toContainText('நாட்காட்டி 2025-26', { timeout: 15000 });
  });

  test('should have view mode toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'மாதம்' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'வாரம்' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'அஜெண்டா' })).toBeVisible();
  });

  test('should have navigation controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'இன்று' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'முன்' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'அடுத்து' })).toBeVisible();
  });

  test('should switch between month, week, and agenda views', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'மாதம்' })).toHaveClass(/bg-white/, { timeout: 15000 });

    await page.getByRole('button', { name: 'வாரம்' }).click();
    await expect(page.getByRole('button', { name: 'வாரம்' })).toHaveClass(/bg-white/);

    await page.getByRole('button', { name: 'அஜெண்டா' }).click();
    await expect(page.getByRole('button', { name: 'அஜெண்டா' })).toHaveClass(/bg-white/);

    await page.getByRole('button', { name: 'மாதம்' }).click();
    await expect(page.getByRole('button', { name: 'மாதம்' })).toHaveClass(/bg-white/);
  });

  test('should navigate to next and previous months', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'இன்று' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'அடுத்து' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'முன்' }).click();
    await page.waitForTimeout(500);
  });

  test('should return to today when clicking today button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'இன்று' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'அடுத்து' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'இன்று' }).click();
    await page.waitForTimeout(500);
  });

  test('should display download menu when clicking download button', async ({ page }) => {
    const downloadButton = page.getByRole('button', { name: /நாட்காட்டியை பதிவிறக்கவும்/ });
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
    await downloadButton.click();

    await expect(page.getByText('நாட்காட்டி கோப்பு (.ics)')).toBeVisible();
    await expect(page.getByText('எக்செல் கோப்பு (.xlsx)')).toBeVisible();
    await expect(page.getByText('Google Calendar, Apple Calendar, Outlook இற்கு இறக்குமதி செய்ய')).toBeVisible();
  });

  test('should close download menu when clicking outside', async ({ page }) => {
    const downloadButton = page.getByRole('button', { name: /நாட்காட்டியை பதிவிறக்கவும்/ });
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
    await downloadButton.click();
    await expect(page.getByText('நாட்காட்டி கோப்பு (.ics)')).toBeVisible();

    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(page.getByText('நாட்காட்டி கோப்பு (.ics)')).not.toBeVisible();
  });

  test('should display calendar in month view with day headers', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'மாதம்' })).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('Sun').first()).toBeVisible();
    await expect(page.getByText('Mon').first()).toBeVisible();
    await expect(page.getByText('Tue').first()).toBeVisible();
    await expect(page.getByText('Wed').first()).toBeVisible();
  });

  test('should display events in month view', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'மாதம்' })).toBeVisible({ timeout: 15000 });
    const events = page.locator('[data-event]');
    await expect(events.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display events in week view', async ({ page }) => {
    await page.getByRole('button', { name: 'வாரம்' }).click();
    await page.waitForTimeout(500);
    const events = page.locator('[data-event]');
    await expect(events.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display events in agenda view', async ({ page }) => {
    await page.getByRole('button', { name: 'அஜெண்டா' }).click();
    await page.waitForTimeout(500);
    const eventList = page.locator('[data-testid="agenda-events"]');
    await expect(eventList).toBeVisible({ timeout: 10000 });
  });

  test('should display legend', async ({ page }) => {
    await expect(page.getByText('விளக்கம்')).toBeVisible({ timeout: 15000 });
  });

  test('should display summary statistics', async ({ page }) => {
    await expect(page.getByText('தேர்வு வாரங்கள்')).toBeVisible({ timeout: 15000 });
  });
});
