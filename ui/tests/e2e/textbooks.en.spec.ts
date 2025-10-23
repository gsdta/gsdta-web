import { test, expect } from "@playwright/test";

// English language tests for Textbooks page

test.describe("Textbooks Page (English)", () => {
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

  test("textbooks page shows coming soon message", async ({ page }) => {
    await page.goto("/textbooks/");
    await expect(page.getByTestId("page-title")).toHaveText("Text books");
    await expect(page.getByText("Coming Soon")).toBeVisible();
  });
});

