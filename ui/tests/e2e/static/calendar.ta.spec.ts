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
    await expect(page.getByTestId("page-title")).toContainText("நாட்காட்டி");

    // Check for view mode buttons
    const monthBtn = page.getByRole("button", { name: "மாதம்", exact: true });
    const weekBtn = page.getByRole("button", { name: "வாரம்", exact: true });
    const agendaBtn = page.getByRole("button", { name: "அஜெண்டா", exact: true });

    await expect(monthBtn).toBeVisible();
    await expect(weekBtn).toBeVisible();
    await expect(agendaBtn).toBeVisible();

    // Check for grade group selection
    await expect(page.getByText(/KG|வகுப்பு/).first()).toBeVisible();

    // Check for calendar navigation buttons exist
    await expect(page.getByRole("button", { name: /previous|prev|முன்/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /next|அடுத்த/i })).toBeVisible();

    // Test switching views - just verify they're clickable
    await weekBtn.click();
    await agendaBtn.click();
  });
});

