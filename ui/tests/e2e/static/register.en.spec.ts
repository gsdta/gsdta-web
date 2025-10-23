import { test, expect } from "@playwright/test";

// English language tests for Register page

test.describe("Register Page (English)", () => {
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

  test("register page shows form fields", async ({ page }) => {
    await page.goto("/register/");
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

    // The Next button should be disabled when required fields are empty
    const nextBtn = page.getByRole("button", { name: /next/i });
    await expect(nextBtn).toBeDisabled();

    // Fill and clear a required field to trigger validation
    const nameInput = page.getByLabel(/student name/i);
    await nameInput.fill("test");
    await nameInput.clear();
    // blur to mark as touched so error becomes visible
    await nameInput.blur();

    // Should show validation error for the field
    await expect(page.getByText(/enter student name/i)).toBeVisible();

    // The next button should remain disabled
    await expect(nextBtn).toBeDisabled();
  });
});
