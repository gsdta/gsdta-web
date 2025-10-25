import { test, expect } from "@playwright/test";

// Tamil language tests for Textbooks page

test.describe("Textbooks Page (Tamil)", () => {
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

  test("user can view a Tamil interface for textbooks", async ({ page }) => {
    await page.goto("/textbooks/");

    await expect(page.getByTestId("page-title")).toHaveText(
      "2025-26 கல்வியாண்டு – பாடப்புத்தகங்கள்",
    );
    await expect(
      page.getByText(
        "2025-26 கல்வியாண்டிற்கான பாடப்புத்தகங்களையும் வீட்டுப்பாடங்களையும் பார்க்க தரத்தைத் தேர்ந்தெடுக்கவும்.",
      ),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Grade-5" }).click();
    await expect(
      page.getByText("ஒரு பாடப்புத்தகம் அல்லது வீட்டுப்பாடத்தைப் பார்க்கத் தேர்ந்தெடுக்கவும்."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Unit 7: Text Book" }).click();
    await expect(page.getByTestId("textbook-viewer")).toHaveAttribute(
      "src",
      "https://drive.google.com/file/d/1AZHmKsCldUnG2gMaY9yk3yOg9IoPoSRg/preview",
    );
  });
});
