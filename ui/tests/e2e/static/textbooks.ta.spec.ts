import { test, expect } from "@playwright/test";

// Tamil language tests for Textbooks page

test.describe("Textbooks Page (Tamil)", () => {
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

  test("textbooks page shows coming soon message", async ({ page }) => {
    await page.goto("/textbooks/");
    await expect(page.getByTestId("page-title")).toHaveText("பாடங்கள்");
    await expect(page.getByText("விரைவில் வருகிறது")).toBeVisible();
  });
});
