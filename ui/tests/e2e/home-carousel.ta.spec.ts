import { test, expect } from "@playwright/test";

// Tamil language tests for home carousel

test.describe("Home Carousel (Tamil)", () => {
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

  test("home carousel CTA (slide 3) routes to register", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Go to slide 3" }).click();

    const enrollCta = page.getByRole("link", { name: /உடனே சேருங்கள்/i });
    await expect(enrollCta).toBeVisible();

    await Promise.all([
      page.waitForURL((url) => /\/register\/?$/.test(url.pathname)),
      enrollCta.click(),
    ]);

    // Note: Register page currently has hardcoded English title
    await expect(page.getByTestId("page-title")).toHaveText("Register");
  });
});

