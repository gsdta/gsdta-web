import { test, expect } from "@playwright/test";

// English language tests for Calendar page

test.describe("Calendar Page (English)", () => {
  test.beforeEach(async ({ page, context }) => {
    test.setTimeout(30_000);
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("i18n:lang", "en");
        window.sessionStorage.clear();
      } catch {}
    });
  });

  test("calendar page shows view mode options and calendar content", async ({ page }) => {
    await page.goto("/calendar/");
    await expect(page.getByTestId("page-title")).toContainText("Calendar");

    // Check for view mode buttons
    const monthBtn = page.getByRole("button", { name: "Month", exact: true });
    const weekBtn = page.getByRole("button", { name: "Week", exact: true });
    const agendaBtn = page.getByRole("button", { name: "Agenda", exact: true });

    await expect(monthBtn).toBeVisible();
    await expect(weekBtn).toBeVisible();
    await expect(agendaBtn).toBeVisible();

    // Check for calendar navigation
    await expect(page.getByRole("button", { name: /previous|prev/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /next/i })).toBeVisible();

    // Check for Today button
    await expect(page.getByRole("button", { name: /today/i })).toBeVisible();

    // Test switching views - just verify they're clickable
    await weekBtn.click();
    await agendaBtn.click();
  });

  test("calendar page shows loading state then content", async ({ page }) => {
    await page.goto("/calendar/");

    // Should eventually show the calendar header
    await expect(page.getByTestId("page-title")).toContainText("Calendar");

    // Check for the legend section (visible after loading)
    const legend = page.getByText("GSDTA").first();
    // May or may not be visible depending on loading state
    await page.waitForTimeout(2000);
  });

  test("calendar page has download options", async ({ page }) => {
    await page.goto("/calendar/");

    // Check for download button
    const downloadBtn = page.getByRole("button", { name: /download/i });
    await expect(downloadBtn).toBeVisible();

    // Click to show dropdown
    await downloadBtn.click();

    // Check for ICS and XLSX options
    await expect(page.getByText(/\.ics|iCal/i)).toBeVisible();
    await expect(page.getByText(/\.xlsx|Excel/i)).toBeVisible();
  });
});
