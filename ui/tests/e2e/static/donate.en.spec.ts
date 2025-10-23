import { test, expect } from "@playwright/test";

// English language tests for Donate page

test.describe("Donate Page (English)", () => {
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

  test("donate page shows coming soon message", async ({ page }) => {
    await page.goto("/donate/");
    await expect(page.getByTestId("page-title")).toHaveText("Donate");
    await expect(page.getByText("Coming Soon")).toBeVisible();
  });
});

