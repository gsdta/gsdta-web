import { test, expect } from "@playwright/test";

// E2E test for mobile header: hamburger toggle and navigation

test("mobile header toggles menu and closes on navigation (en)", async ({ page, context }) => {
  test.setTimeout(40_000);
  // Force English and clear session before load
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("i18n:lang", "en");
      window.sessionStorage.clear();
    } catch {}
  });

  // Emulate a small mobile viewport
  await page.setViewportSize({ width: 360, height: 780 });

  await page.goto("/");

  const toggle = page.getByRole("button", { name: /open menu/i });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  // Open menu
  await toggle.click();
  const mobileMenu = page.locator("#mobile-menu");
  await expect(mobileMenu).toBeVisible();
  await expect(page.getByRole("button", { name: /close menu/i })).toHaveAttribute(
    "aria-expanded",
    "true"
  );

  // Menu contains public links in English
  const aboutLink = mobileMenu.getByRole("link", { name: "About us", exact: true });
  await expect(aboutLink).toBeVisible();

  // Clicking a link navigates and closes the menu
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/about" || url.pathname === "/about/"),
    aboutLink.click(),
  ]);

  // Menu should be closed (not present)
  await expect(page.locator("#mobile-menu")).toHaveCount(0);
});

