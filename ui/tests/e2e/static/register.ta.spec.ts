import { test, expect } from "@playwright/test";

// Tamil language tests for Register page

test.describe("Register Page (Tamil)", () => {
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

  test("register page shows form fields", async ({ page }) => {
    await page.goto("/register/");
    // Note: Register page currently has hardcoded English title
    await expect(page.getByTestId("page-title")).toHaveText("Register");

    // Check for step indicator
    await expect(page.getByText("Step 1 of 4")).toBeVisible();

    // Check for student form fields (first step)
    await expect(page.getByText("Student Information")).toBeVisible();
    await expect(page.getByLabel(/student name/i)).toBeVisible();
    await expect(page.getByLabel(/student dob/i)).toBeVisible();
    await expect(page.getByText("Student Gender")).toBeVisible();
    await expect(page.getByLabel("Girl")).toBeVisible();
    await expect(page.getByLabel("Boy")).toBeVisible();

    // Check for next button
    await expect(page.getByRole("button", { name: /next/i })).toBeVisible();
  });

  test("register form validates required fields", async ({ page }) => {
    await page.goto("/register/");

    const nextBtn = page.getByRole("button", { name: /next/i });
    await expect(nextBtn).toBeDisabled();

    // Trigger validation on a required field by touching and clearing, then blurring
    const nameInput = page.getByLabel(/student name/i);
    await nameInput.fill("test");
    await nameInput.clear();
    await nameInput.blur();

    // Should show validation error for the field
    await expect(page.getByText(/enter student name/i)).toBeVisible();

    // Next should remain disabled
    await expect(nextBtn).toBeDisabled();
  });
});
