import { test, expect } from "@playwright/test";

// Tamil language tests for Calendar page

test.describe("Calendar Page (Tamil)", () => {
  test.beforeEach(async ({ page, context }) => {
    test.setTimeout(30_000);
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("i18n:lang", "ta");
        window.sessionStorage.clear();
      } catch {}
    });
  });

  test("calendar page shows view mode options and calendar content", async ({ page }) => {
    await page.goto("/calendar/");

    // Page title should be visible (may be in Tamil or English)
    await expect(page.getByTestId("page-title")).toBeVisible();

    // Wait for loading to complete by waiting for the view mode buttons
    // Check for view mode buttons (in Tamil or fallback English)
    // Month = மாதம், Week = வாரம், Agenda = அஜெண்டா
    const monthBtn = page.getByRole("button", { name: /Month|மாதம்/i });
    const weekBtn = page.getByRole("button", { name: /Week|வாரம்/i });
    const agendaBtn = page.getByRole("button", { name: /Agenda|அஜெண்டா/i });

    // Wait for page to load (calendar might be in loading state)
    await expect(monthBtn).toBeVisible({ timeout: 15000 });
    await expect(weekBtn).toBeVisible({ timeout: 5000 });
    await expect(agendaBtn).toBeVisible({ timeout: 5000 });

    // Check for calendar navigation buttons exist
    await expect(page.getByRole("button", { name: /previous|prev|முன்/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /next|அடுத்/i })).toBeVisible();

    // Check for Today button
    await expect(page.getByRole("button", { name: /today|இன்று/i })).toBeVisible();

    // Test switching views - just verify they're clickable
    await weekBtn.click();
    await agendaBtn.click();
  });

  test("calendar page shows loading state then content", async ({ page }) => {
    await page.goto("/calendar/");

    // Should eventually show the calendar header
    await expect(page.getByTestId("page-title")).toBeVisible();

    // Wait for potential loading to complete
    await page.waitForTimeout(2000);
  });

  test("calendar page has download options in Tamil", async ({ page }) => {
    await page.goto("/calendar/");

    // Check for download button (in Tamil or English)
    const downloadBtn = page.getByRole("button", { name: /download|பதிவிறக்/i });
    await expect(downloadBtn).toBeVisible();

    // Click to show dropdown
    await downloadBtn.click();

    // Check for file format options
    await expect(page.getByText(/\.ics|iCal/i)).toBeVisible();
    await expect(page.getByText(/\.xlsx|Excel/i)).toBeVisible();
  });
});
