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

    // Check for grade group selection
    await expect(page.getByText(/KG|Grade/).first()).toBeVisible();

    // Check for calendar navigation
    await expect(page.getByRole("button", { name: /previous|prev/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /next/i })).toBeVisible();

    // Test switching views - just verify they're clickable
    await weekBtn.click();
    await agendaBtn.click();
  });
});

