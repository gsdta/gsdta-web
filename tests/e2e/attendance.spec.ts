import { test, expect } from "@playwright/test";

test.describe("Teacher Attendance (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    // Reset database state
    await page.request.post("/test/reset");

    // Create enrollments via API instead of UI to avoid role switching issues
    // This simulates having students already enrolled in the class
    await page.request.post("/enrollments", {
      data: {
        studentId: "s1",
        classId: "c3",
        status: "accepted",
        notes: "Test enrollment",
      },
    });

    await page.request.post("/enrollments", {
      data: {
        studentId: "s2",
        classId: "c3",
        status: "accepted",
        notes: "Test enrollment",
      },
    });

    // Now login as teacher
    await page.goto("/login");
    await page.waitForTimeout(500);
    await page.selectOption("#role", "teacher");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    await page.waitForLoadState("domcontentloaded");

    // Wait for auth to fully stabilize
    await expect(page.getByText(/Priya.*teacher/i)).toBeVisible({ timeout: 5000 });

    // Add longer wait and verify sessionStorage has the auth data
    await page.waitForTimeout(1000);

    // Check if auth is actually set in sessionStorage
    const hasAuth = await page.evaluate(() => {
      const authData = sessionStorage.getItem("auth:user");
      console.log("Auth data in sessionStorage:", authData);
      return authData !== null;
    });

    if (!hasAuth) {
      throw new Error("Authentication not persisted in sessionStorage");
    }
  });

  test("teacher can view class list", async ({ page }) => {
    // Check auth before navigation
    const authBefore = await page.evaluate(() => sessionStorage.getItem("auth:user"));
    console.log("Auth before navigation:", authBefore);

    await page.getByRole("link", { name: /^classes$/i }).click();

    // Give it a moment
    await page.waitForTimeout(500);

    // Check auth after navigation
    const authAfter = await page.evaluate(() => sessionStorage.getItem("auth:user"));
    console.log("Auth after navigation:", authAfter);

    await expect(page).toHaveURL(/\/classes$/, { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Should see classes
    await expect(page.getByRole("heading", { name: /^classes$/i })).toBeVisible();
    await expect(page.getByText(/Beginner Bharatanatyam/i)).toBeVisible();
    await expect(page.getByText(/Intermediate Bharatanatyam/i)).toBeVisible();
    await expect(page.getByText(/Advanced Bharatanatyam/i)).toBeVisible();
  });

  // test("teacher can view class roster", async ({ page }) => {
  //   await page.getByRole("link", { name: /^classes$/i }).click();
  //   await expect(page).toHaveURL(/\/classes$/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Click on Advanced class (c3) which has enrolled students
  //   await page.getByRole("link", { name: /Advanced Bharatanatyam/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Should see class details
  //   await expect(page.getByRole("heading", { name: /Advanced Bharatanatyam/i })).toBeVisible();

  //   // Should see enrolled students in roster
  //   await expect(page.getByText(/Class Roster/i)).toBeVisible();
  //   await expect(page.getByText(/Anya R\./i)).toBeVisible();
  //   await expect(page.getByText(/Vikram R\./i)).toBeVisible();
  // });

  // test("teacher can take attendance and save it", async ({ page }) => {
  //   // Navigate via links to ensure auth is maintained
  //   await page.getByRole("link", { name: /^classes$/i }).click();
  //   await expect(page).toHaveURL(/\/classes$/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /Advanced Bharatanatyam/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Click Take Attendance button
  //   await page.getByRole("link", { name: /take attendance/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3\/attendance/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Should see attendance page
  //   await expect(page.getByRole("heading", { name: /Attendance.*Advanced/i })).toBeVisible();

  //   // Should see both students
  //   await expect(page.getByText(/Anya R\./i)).toBeVisible();
  //   await expect(page.getByText(/Vikram R\./i)).toBeVisible();

  //   // Mark first student as present (should be default)
  //   // Mark second student as absent
  //   const absentButtons = page.getByRole("button", { name: /^absent$/i });
  //   await absentButtons.nth(1).click(); // Second student

  //   // Add a note
  //   const noteInputs = page.locator('input[placeholder*="Optional notes"]');
  //   await noteInputs.nth(1).fill("Was sick");

  //   // Save attendance
  //   await page.getByRole("button", { name: /save attendance/i }).click();

  //   // Should see success message
  //   await expect(page.getByText(/attendance saved successfully/i)).toBeVisible();
  // });

  // test("teacher can mark all students present or absent", async ({ page }) => {
  //   // Navigate via links
  //   await page.getByRole("link", { name: /^classes$/i }).click();
  //   await expect(page).toHaveURL(/\/classes$/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /Advanced Bharatanatyam/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /take attendance/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3\/attendance/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Click Mark All Absent
  //   await page.getByRole("button", { name: /mark all absent/i }).click();

  //   // All status buttons for "absent" should be highlighted
  //   const absentButtons = page.getByRole("button", { name: /^absent$/i });
  //   const count = await absentButtons.count();

  //   for (let i = 0; i < count; i++) {
  //     await expect(absentButtons.nth(i)).toHaveClass(/bg-red-600/);
  //   }

  //   // Click Mark All Present
  //   await page.getByRole("button", { name: /mark all present/i }).click();

  //   // All status buttons for "present" should be highlighted
  //   const presentButtons = page.getByRole("button", { name: /^present$/i });
  //   const presentCount = await presentButtons.count();

  //   for (let i = 0; i < presentCount; i++) {
  //     await expect(presentButtons.nth(i)).toHaveClass(/bg-green-600/);
  //   }
  // });

  // test("attendance persists and can be reloaded", async ({ page }) => {
  //   // Navigate via links
  //   await page.getByRole("link", { name: /^classes$/i }).click();
  //   await expect(page).toHaveURL(/\/classes$/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /Advanced Bharatanatyam/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /take attendance/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3\/attendance/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Mark attendance
  //   const absentButtons = page.getByRole("button", { name: /^absent$/i });
  //   await absentButtons.first().click();

  //   const noteInputs = page.locator('input[placeholder*="Optional notes"]');
  //   await noteInputs.first().fill("Test note");

  //   // Save
  //   await page.getByRole("button", { name: /save attendance/i }).click();
  //   await expect(page.getByText(/attendance saved successfully/i)).toBeVisible();

  //   // Reload the page
  //   await page.reload();
  //   await page.waitForLoadState("networkidle");

  //   // Attendance should be preserved
  //   const absentButtonsReloaded = page.getByRole("button", { name: /^absent$/i });
  //   await expect(absentButtonsReloaded.first()).toHaveClass(/bg-red-600/);

  //   const noteInputsReloaded = page.locator('input[placeholder*="Optional notes"]');
  //   await expect(noteInputsReloaded.first()).toHaveValue("Test note");
  // });

  // test("teacher can select different dates", async ({ page }) => {
  //   // Navigate via links
  //   await page.getByRole("link", { name: /^classes$/i }).click();
  //   await expect(page).toHaveURL(/\/classes$/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /Advanced Bharatanatyam/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /take attendance/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3\/attendance/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Get today's date
  //   const today = new Date().toISOString().split("T")[0];

  //   // Date input should be set to today by default
  //   const dateInput = page.locator('input[type="date"]');
  //   await expect(dateInput).toHaveValue(today);

  //   // Mark attendance for today
  //   const absentButtons = page.getByRole("button", { name: /^absent$/i });
  //   await absentButtons.first().click();
  //   await page.getByRole("button", { name: /save attendance/i }).click();
  //   await expect(page.getByText(/attendance saved successfully/i)).toBeVisible();

  //   // Change to yesterday
  //   const yesterday = new Date();
  //   yesterday.setDate(yesterday.getDate() - 1);
  //   const yesterdayStr = yesterday.toISOString().split("T")[0];

  //   await dateInput.fill(yesterdayStr);
  //   await page.waitForTimeout(1000); // Wait for data to load

  //   // Should reset to default (present) for new date
  //   const presentButtons = page.getByRole("button", { name: /^present$/i });
  //   await expect(presentButtons.first()).toHaveClass(/bg-green-600/);
  // });

  // test("teacher can export attendance to CSV", async ({ page }) => {
  //   // Navigate via links
  //   await page.getByRole("link", { name: /^classes$/i }).click();
  //   await expect(page).toHaveURL(/\/classes$/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /Advanced Bharatanatyam/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /take attendance/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c3\/attendance/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Mark some attendance
  //   const absentButtons = page.getByRole("button", { name: /^absent$/i });
  //   await absentButtons.first().click();

  //   // Setup download listener
  //   const downloadPromise = page.waitForEvent("download");

  //   // Click export button
  //   await page.getByRole("button", { name: /export csv/i }).click();

  //   // Wait for download
  //   const download = await downloadPromise;

  //   // Verify filename contains expected parts
  //   expect(download.suggestedFilename()).toMatch(/attendance.*\.csv/);
  // });

  // test("empty class shows appropriate message", async ({ page }) => {
  //   // Navigate via links to a class with no enrollments (c1)
  //   await page.getByRole("link", { name: /^classes$/i }).click();
  //   await expect(page).toHaveURL(/\/classes$/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /Beginner Bharatanatyam/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c1/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   await page.getByRole("link", { name: /take attendance/i }).click();
  //   await expect(page).toHaveURL(/\/classes\/c1\/attendance/, { timeout: 5000 });
  //   await page.waitForLoadState("networkidle");

  //   // Should show no students message
  //   await expect(page.getByText(/no students enrolled in this class/i)).toBeVisible();

  //   // Export button should be disabled
  //   await expect(page.getByRole("button", { name: /export csv/i })).toBeDisabled();
  // });
});
