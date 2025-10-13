import { test, expect } from "@playwright/test";

test.describe("Auth & RBAC (mocked)", () => {
  test("unauthenticated user is redirected to /login from protected route", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /login/i })).toBeVisible();
  });

  test("login as parent shows Students nav; switching to teacher hides it", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.selectOption("#role", "parent");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    // Nav assertions for parent
    await expect(page.getByRole("link", { name: /students/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /enrollment/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /classes/i })).toBeVisible();

    // Switch role to teacher via header selector
    await page.selectOption("#role-select", "teacher");

    // Nav updates live without reload
    await expect(page.getByRole("link", { name: /classes/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /students/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /enrollment/i })).toHaveCount(0);
  });
});
