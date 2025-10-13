import { test, expect } from "@playwright/test";

// Students UI test: verify parent can access student management interface

test("parent can access and use student management interface", async ({ page }) => {
  await page.goto("/login");
  await page.selectOption("#role", "parent");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Go to students list
  await page.getByRole("link", { name: /students/i }).click();
  await expect(page).toHaveURL(/\/students/);

  // Verify the students list interface loads
  await expect(page.getByRole("heading", { name: /students/i })).toBeVisible();
  await expect(page.getByTestId("add-student-link")).toBeVisible();

  // Verify the table structure is present
  await expect(page.locator("table")).toBeVisible();
  await expect(page.locator('th:has-text("Name")')).toBeVisible();
  await expect(page.locator('th:has-text("Prior level")')).toBeVisible();
  await expect(page.locator('th:has-text("Actions")')).toBeVisible();

  // Test navigation to create student form
  await page.getByTestId("add-student-link").click();
  await expect(page).toHaveURL(/\/students\/new/);

  // Verify the create form loads correctly
  await expect(page.getByRole("heading", { name: /new student/i })).toBeVisible();
  await expect(page.getByLabel("First name")).toBeVisible();
  await expect(page.getByLabel("Last name")).toBeVisible();
  await expect(page.getByLabel("Prior level")).toBeVisible();
  await expect(page.getByLabel("Photo consent")).toBeVisible();
  await expect(page.getByRole("button", { name: /create/i })).toBeVisible();

  // Test form validation - try to submit empty form
  await page.getByRole("button", { name: /create/i }).click();

  // Verify form validation messages appear
  await expect(page.getByText(/first name is required/i)).toBeVisible();
  await expect(page.getByText(/last name is required/i)).toBeVisible();

  // Fill out the form to test field interactions
  await page.getByLabel("First name").fill("Test Student");
  await page.getByLabel("Last name").fill("Lastname");
  await page.getByLabel("Prior level").selectOption("Intermediate");
  await page.getByLabel("Photo consent").check();

  // Verify form fields are populated correctly
  await expect(page.getByLabel("First name")).toHaveValue("Test Student");
  await expect(page.getByLabel("Last name")).toHaveValue("Lastname");
  await expect(page.getByLabel("Prior level")).toHaveValue("Intermediate");
  await expect(page.getByLabel("Photo consent")).toBeChecked();
});
