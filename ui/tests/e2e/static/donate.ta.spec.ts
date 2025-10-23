import { test, expect } from "@playwright/test";

// Tamil language tests for Donate page

test.describe("Donate Page (Tamil)", () => {
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

  test("donate page shows coming soon message", async ({ page }) => {
    await page.goto("/donate/");
    await expect(page.getByTestId("page-title")).toHaveText("நன்கொடை");
    await expect(page.getByText("விரைவில் வருகிறது")).toBeVisible();
  });
});

