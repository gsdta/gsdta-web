import { test, expect } from "@playwright/test";

// Tamil language tests for About page

test.describe("About Page (Tamil)", () => {
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

  test("about page shows mission and core values", async ({ page }) => {
    await page.goto("/about/");
    await expect(page.getByTestId("page-title")).toHaveText("எங்களைப் பற்றி");

    // Mission section
    await expect(page.getByText("எங்கள் நோக்கம்")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "கிரேட்டர் சான் டியாகோ தமிழ் அகாடமி (GSDTA)" })
    ).toBeVisible();
    await expect(page.getByText(/துடிப்பான சமூகத்தை வளர்ப்பதில்/i)).toBeVisible();

    // Core values section
    await expect(page.getByText("முக்கிய மதிப்புகள்")).toBeVisible();
  });
});
