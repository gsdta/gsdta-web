import { test, expect } from "@playwright/test";

// E2E checks for Documents page options and PDF rendering

test("documents page shows options and renders PDFs", async ({ page, context }) => {
  test.setTimeout(30_000);
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("i18n:lang", "en");
      window.sessionStorage.clear();
    } catch {}
  });

  await page.goto("/documents/");

  await expect(page.getByTestId("page-title")).toHaveText("Documents");

  // Left nav buttons
  const bylaws = page.getByRole("button", { name: "By Laws", exact: true });
  const tax = page.getByRole("button", { name: "501(c)(3) Tax Exempt", exact: true });
  const financials = page.getByRole("button", { name: "Financial Reports", exact: true });

  await expect(bylaws).toBeVisible();
  await expect(tax).toBeVisible();
  await expect(financials).toBeVisible();

  // Default is By Laws
  await expect(page.getByTestId("pdf-viewer")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in new tab" })).toHaveAttribute("href", "/docs/bylaws.pdf");
  await expect(page.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", "/docs/bylaws.pdf");

  // Switch to 501(c)(3) Tax Exempt and verify PDF links update
  await tax.click();
  await expect(page.getByTestId("pdf-viewer")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in new tab" })).toHaveAttribute("href", "/docs/determination-letter.pdf");
  await expect(page.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", "/docs/determination-letter.pdf");

  // Switch to Financial Reports shows placeholder (no viewer)
  await financials.click();
  await expect(page.getByText("Financial Reports are not available yet.")).toBeVisible();
});
