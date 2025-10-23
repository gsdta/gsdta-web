import { test, expect } from "@playwright/test";

// English language tests for About page

test.describe("About Page (English)", () => {
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

  test("about page shows mission and core values", async ({ page }) => {
    await page.goto("/about/");
    await expect(page.getByTestId("page-title")).toHaveText("About Us");

    // Check for mission section
    await expect(page.getByText("Our Mission")).toBeVisible();
    await expect(page.getByRole("heading", { name: "The Greater San Diego Tamil Academy (GSDTA)" })).toBeVisible();
    await expect(page.getByText(/fostering a vibrant community/i)).toBeVisible();

    // Check for core values section
    await expect(page.getByText("Core Values")).toBeVisible();
    await expect(
      page.getByText(
        /Providing continuous and structured programs and courses in Tamil language and culture/i
      )
    ).toBeVisible();
  });
});
