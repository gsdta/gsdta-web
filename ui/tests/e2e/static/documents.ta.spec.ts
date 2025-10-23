import { test, expect } from "@playwright/test";

// Tamil language tests for Documents page

test.describe("Documents Page (Tamil)", () => {
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

  test("documents page shows options and renders PDFs", async ({ page }) => {
    await page.goto("/documents/");
    await expect(page.getByTestId("page-title")).toHaveText("ஆவணங்கள்");

    const bylaws = page.getByRole("button", { name: "நியம விதிகள்", exact: true });
    const tax = page.getByRole("button", { name: "501(c)(3) வரிவிலக்கு", exact: true });
    const financials = page.getByRole("button", { name: "நிதி அறிக்கைகள்", exact: true });

    await expect(bylaws).toBeVisible();
    await expect(tax).toBeVisible();
    await expect(financials).toBeVisible();

    await expect(page.getByTestId("pdf-viewer")).toBeVisible();
    await expect(page.getByRole("link", { name: "புதிய தாவலில் திறக்க" })).toHaveAttribute("href", "/docs/bylaws.pdf");
    await expect(page.getByRole("link", { name: "PDF ஐ பதிவிறக்கவும்" })).toHaveAttribute("href", "/docs/bylaws.pdf");

    await tax.click();
    await expect(page.getByTestId("pdf-viewer")).toBeVisible();
    await expect(page.getByRole("link", { name: "புதிய தாவலில் திறக்க" })).toHaveAttribute("href", "/docs/determination-letter.pdf");
    await expect(page.getByRole("link", { name: "PDF ஐ பதிவிறக்கவும்" })).toHaveAttribute("href", "/docs/determination-letter.pdf");

    await financials.click();
    await expect(page.getByText("நிதி அறிக்கைகள் இன்னும் கிடைக்கவில்லை.")).toBeVisible();
  });
});

