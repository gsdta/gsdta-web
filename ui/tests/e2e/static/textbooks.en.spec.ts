import { test, expect } from "@playwright/test";

// English language tests for Textbooks page

test.describe("Textbooks Page (English)", () => {
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

  test("user can load a textbook for a grade and semester", async ({ page }) => {
    await page.goto("/textbooks/");

    await expect(page.getByTestId("page-title")).toHaveText(
      "Academic Year 2025-26 – Text Books",
    );
    await expect(
      page.getByText(
        "Choose a grade to explore textbooks and homework for the 2025-26 school year.",
      ),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Grade-5" }).click();
    await expect(
      page.getByText("Select a textbook or homework to view it."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Unit 7: Text Book" }).click();

    await expect(page.getByTestId("textbook-viewer")).toHaveAttribute(
      "src",
      "https://drive.google.com/file/d/1AZHmKsCldUnG2gMaY9yk3yOg9IoPoSRg/preview",
    );
  });
});

