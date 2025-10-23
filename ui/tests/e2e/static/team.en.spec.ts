import { test, expect } from "@playwright/test";

// English language tests for Team page

test.describe("Team Page (English)", () => {
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

  test("team page shows navigation and content for all sections", async ({ page }) => {
    await page.goto("/team/");
    await expect(page.getByTestId("page-title")).toHaveText("Team");

    const boardBtn = page.getByRole("button", { name: "Board", exact: true });
    const executivesBtn = page.getByRole("button", { name: "Executives", exact: true });
    const teachersBtn = page.getByRole("button", { name: "Teachers", exact: true });
    const volunteersBtn = page.getByRole("button", { name: "Volunteers", exact: true });
    const faqBtn = page.getByRole("button", { name: "FAQ", exact: true });

    await expect(boardBtn).toBeVisible();
    await expect(executivesBtn).toBeVisible();
    await expect(teachersBtn).toBeVisible();
    await expect(volunteersBtn).toBeVisible();
    await expect(faqBtn).toBeVisible();

    await expect(page.getByText("Bala Jayaseelan").first()).toBeVisible();
    await expect(page.getByText("Karthikeyan N.K").first()).toBeVisible();
    await expect(page.getByText("Padma Swaminathan").first()).toBeVisible();
    await expect(page.getByText("Devi Kumaradev").first()).toBeVisible();
    await expect(page.getByText("Rajaraman Krishnan").first()).toBeVisible();

    await expect(page.getByText("Board Member").first()).toBeVisible();
    await expect(page.getByText("Poway, CA")).toBeVisible();

    await executivesBtn.click();
    await expect(page.getByText("Technology Committee")).toBeVisible();
    await expect(page.getByText("Administration Committee")).toBeVisible();
    await expect(page.getByText("Facilities Committee")).toBeVisible();
    await expect(page.getByText("Marketing & Fund-raising Committee")).toBeVisible();
    await expect(page.getByText("High School Students Award Committee")).toBeVisible();
    await expect(page.getByText("Events & Cultural Committee")).toBeVisible();

    await expect(page.getByText("Ashok Annamalai")).toBeVisible();
    await expect(page.getByText("Nachiappan Panchanathan")).toBeVisible();

    await teachersBtn.click();
    await expect(page.getByText("Our Teachers")).toBeVisible();
    await expect(page.getByText("Assistant Teachers")).toBeVisible();

    await expect(page.getByText("Rajini J")).toBeVisible();
    await expect(page.getByText("Udayakumar Rajendran")).toBeVisible();
    await expect(page.getByText("Bavya Anand")).toBeVisible();

    await expect(page.getByText("Basic-2/A")).toBeVisible();
    await expect(page.getByText("Basic-1/B")).toBeVisible();

    await expect(page.getByText("Sujatha Karthikeyan")).toBeVisible();
    await expect(page.getByText("Swasthika Rajendran")).toBeVisible();

    await volunteersBtn.click();
    await expect(page.getByText(/Volunteers are not available yet/)).toBeVisible();

    await faqBtn.click();
    await expect(page.getByText(/FAQ are not available yet/)).toBeVisible();

    await boardBtn.click();
    await expect(page.getByText("Bala Jayaseelan").first()).toBeVisible();
  });

  test("team page displays images for people", async ({ page }) => {
    await page.goto("/team/");

    await expect(page.getByAltText("Bala Jayaseelan")).toBeVisible();
    await expect(page.getByAltText("Karthikeyan N.K")).toBeVisible();
    await expect(page.getByAltText("Padma Swaminathan")).toBeVisible();
  });
});

