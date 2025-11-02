// filepath: c:\projects\gsdta\gsdta-web\ui\tests\e2e\dynamic\signup.spec.ts
import { test, expect, Page } from "@playwright/test";

async function clearStorage(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    try { localStorage.removeItem("auth:debug-user"); } catch {}
    try { sessionStorage.removeItem("auth:user"); } catch {}
  });
}

test.describe("Parent Signup Flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test("signup page should render with all required elements", async ({ page }) => {
    await page.goto("/signup");

    // Check page title and description
    await expect(page.locator("h1")).toContainText("Create Parent Account");
    await expect(page.getByText("Sign up to access GSDTA services")).toBeVisible();

    // Check Google signup button
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

    // Check email/password form fields
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();

    // Check submit button
    await expect(page.getByRole("button", { name: /sign up with email/i })).toBeVisible();

    // Check link to signin page
    await expect(page.getByRole("link", { name: /sign in here/i })).toBeVisible();
  });

  test("should show validation error for password mismatch", async ({ page }) => {
    await page.goto("/signup");

    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "different456");

    await page.click('button[type="submit"]');

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("should show validation error for short password", async ({ page }) => {
    await page.goto("/signup");

    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "12345");
    await page.fill("#confirmPassword", "12345");

    await page.click('button[type="submit"]');

    // Built-in HTML validation prevents submit; assert validity state
    const tooShort = await page.locator('#password').evaluate((el) => (el as HTMLInputElement).validity.tooShort);
    expect(tooShort).toBeTruthy();
  });

  test("should have link to signin page", async ({ page }) => {
    await page.goto("/signup");

    const signinLink = page.getByRole("link", { name: /sign in here/i });
    await expect(signinLink).toHaveAttribute("href", "/signin/");
  });

  test("email verification notice should be displayed", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByText(/verify your email address/i)).toBeVisible();
  });

  test("authenticated user should be redirected from signup page", async ({ page }) => {
    // First, login
    await page.goto("/login");
    await page.selectOption("#role", "parent");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/parent\/?$/);

    // Try to access signup page
    await page.goto("/signup");

    // Should redirect back to parent dashboard
    await page.waitForURL(/\/parent\/?$/);
    await expect(page).toHaveURL(/\/parent\/?$/);
  });
});

test.describe("Signup Page Accessibility", () => {
  test("form fields should have proper labels", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.locator('label[for="name"]')).toContainText("Full Name");
    await expect(page.locator('label[for="email"]')).toContainText("Email");
    await expect(page.locator('label[for="password"]')).toContainText("Password");
    await expect(page.locator('label[for="confirmPassword"]')).toContainText("Confirm Password");
  });

  test("form fields should be required", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.locator("#name")).toHaveAttribute("required", "");
    await expect(page.locator("#email")).toHaveAttribute("required", "");
    await expect(page.locator("#password")).toHaveAttribute("required", "");
    await expect(page.locator("#confirmPassword")).toHaveAttribute("required", "");
  });

  test("password fields should have minimum length attribute", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.locator("#password")).toHaveAttribute("minlength", "6");
    await expect(page.locator("#confirmPassword")).toHaveAttribute("minlength", "6");
  });
});
