// filepath: c:\projects\gsdta\gsdta-web\ui\tests\e2e\dynamic\auth.mock.spec.ts
import { test, expect, Page } from "@playwright/test";

async function clearStorage(page: Page) {
  // Navigate to app origin so localStorage/sessionStorage are accessible
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    try { localStorage.removeItem("auth:debug-user"); } catch {}
  });
}

test.describe("Mock auth flow + role-based routing", () => {
  // Skip these tests if using Firebase auth (they require mock auth mode)
  test.skip(
    process.env.NEXT_PUBLIC_AUTH_MODE === "firebase",
    "Mock auth tests require NEXT_PUBLIC_AUTH_MODE=mock"
  );

  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test("unauthenticated visit to /admin redirects to /login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login\/?$/);
    await expect(page).toHaveURL(/\/login\/?$/);
  });

  test("login as parent routes to /parent", async ({ page }) => {
    await page.goto("/login");
    await page.selectOption("#role", "parent");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/parent\/?$/);
    await expect(page).toHaveURL(/\/parent\/?$/);
  });

  test("login as teacher routes to /teacher", async ({ page }) => {
    await page.goto("/login");
    await page.selectOption("#role", "teacher");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/teacher\/?$/);
    await expect(page).toHaveURL(/\/teacher\/?$/);
  });

  test("role mismatch: parent visiting /admin redirects to /parent", async ({ page }) => {
    // Login as parent first
    await page.goto("/login");
    await page.selectOption("#role", "parent");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/parent\/?$/);

    // Now try to access /admin (should bounce back to /parent)
    await page.goto("/admin");
    await page.waitForURL(/\/parent\/?$/);
    await expect(page).toHaveURL(/\/parent\/?$/);
  });
});
