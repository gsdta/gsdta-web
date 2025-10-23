import { test, expect } from "@playwright/test";

// English language tests for mobile header

test.describe("Mobile Header (English)", () => {
  test.beforeEach(async ({ page, context }) => {
    test.setTimeout(40_000);
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("i18n:lang", "en");
        window.sessionStorage.clear();
      } catch {}
    });
    await page.setViewportSize({ width: 360, height: 780 });
  });

  test("mobile header toggles menu and closes on navigation", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByRole("button", { name: /open menu/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    const mobileMenu = page.locator("#mobile-menu");
    await expect(mobileMenu).toBeVisible();
    await expect(page.getByRole("button", { name: /close menu/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    const aboutLink = mobileMenu.getByRole("link", { name: "About us", exact: true });
    await expect(aboutLink).toBeVisible();

    await Promise.all([
      page.waitForURL((url) => url.pathname === "/about" || url.pathname === "/about/"),
      aboutLink.click(),
    ]);

    await expect(page.locator("#mobile-menu")).toHaveCount(0);
  });
});

