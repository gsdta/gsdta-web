import { test, expect } from "@playwright/test";

// Tamil language tests for Team page

test.describe("Team Page (Tamil)", () => {
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

  test("team page shows navigation and content for all sections", async ({ page }) => {
    await page.goto("/team/");
    await expect(page.getByTestId("page-title")).toHaveText("குழு");

    // Labels must match i18n messages.ts (ta)
    const boardBtn = page.getByRole("button", { name: "மன்றம்", exact: true });
    const executivesBtn = page.getByRole("button", { name: "நிர்வாகம்", exact: true });
    const teachersBtn = page.getByRole("button", { name: "ஆசிரியர்கள்", exact: true });
    const volunteersBtn = page.getByRole("button", { name: "தன்னார்வலர்கள்", exact: true });
    const faqBtn = page.getByRole("button", { name: "அடிக்கடி கேட்கப்படும் கேள்விகள்", exact: true });

    await expect(boardBtn).toBeVisible();
    await expect(executivesBtn).toBeVisible();
    await expect(teachersBtn).toBeVisible();
    await expect(volunteersBtn).toBeVisible();
    await expect(faqBtn).toBeVisible();

    // Board section content
    await expect(page.getByText("Bala Jayaseelan").first()).toBeVisible();
    await expect(page.getByText("Karthikeyan N.K").first()).toBeVisible();
    await expect(page.getByText("Padma Swaminathan").first()).toBeVisible();
    await expect(page.getByText("Devi Kumaradev").first()).toBeVisible();
    await expect(page.getByText("Rajaraman Krishnan").first()).toBeVisible();

    // Role and location as displayed in UI/data
    await expect(page.getByText("Board Member").first()).toBeVisible();
    await expect(page.getByText("Poway, CA")).toBeVisible();

    // Executives/committees
    await executivesBtn.click();
    await expect(page.getByText("Technology Committee")).toBeVisible();
    await expect(page.getByText("Administration Committee")).toBeVisible();
    await expect(page.getByText("Facilities Committee")).toBeVisible();
    await expect(page.getByText("Marketing & Fund-raising Committee")).toBeVisible();
    await expect(page.getByText("High School Students Award Committee")).toBeVisible();
    await expect(page.getByText("Events & Cultural Committee")).toBeVisible();

    await expect(page.getByText("Ashok Annamalai")).toBeVisible();
    await expect(page.getByText("Nachiappan Panchanathan")).toBeVisible();

    // Teachers
    await teachersBtn.click();
    await expect(page.getByText("எங்கள் ஆசிரியர்கள்")).toBeVisible();
    await expect(page.getByText("உதவி ஆசிரியர்கள்")).toBeVisible();

    // Volunteers
    await volunteersBtn.click();
    await expect(page.getByText(/தன்னார்வலர்கள் are not available yet/)).toBeVisible();

    // FAQ
    await faqBtn.click();
    await expect(page.getByText(/அடிக்கடி கேட்கப்படும் கேள்விகள் are not available yet/)).toBeVisible();
  });
});
