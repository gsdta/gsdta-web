import { test, expect } from "@playwright/test";

// E2E checks for Team page navigation and content rendering

test("team page shows navigation and content for all sections", async ({ page, context }) => {
  test.setTimeout(30_000);
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("i18n:lang", "en");
      window.sessionStorage.clear();
    } catch {}
  });

  await page.goto("/team/");

  await expect(page.getByTestId("page-title")).toHaveText("Team");

  // Left nav buttons
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

  // Default is Board section - check for board members
  await expect(page.getByText("Bala Jayaseelan").first()).toBeVisible();
  await expect(page.getByText("Karthikeyan N.K").first()).toBeVisible();
  await expect(page.getByText("Padma Swaminathan").first()).toBeVisible();
  await expect(page.getByText("Devi Kumaradev").first()).toBeVisible();
  await expect(page.getByText("Rajaraman Krishnan").first()).toBeVisible();

  // Check that board member role is displayed (appears multiple times, so use .first())
  await expect(page.getByText("Board Member").first()).toBeVisible();
  await expect(page.getByText("Poway, CA")).toBeVisible();

  // Switch to Executives
  await executivesBtn.click();
  await expect(page.getByText("Technology Committee")).toBeVisible();
  await expect(page.getByText("Administration Committee")).toBeVisible();
  await expect(page.getByText("Facilities Committee")).toBeVisible();
  await expect(page.getByText("Marketing & Fund-raising Committee")).toBeVisible();
  await expect(page.getByText("High School Students Award Committee")).toBeVisible();
  await expect(page.getByText("Events & Cultural Committee")).toBeVisible();

  // Check some committee members
  await expect(page.getByText("Ashok Annamalai")).toBeVisible();
  await expect(page.getByText("Nachiappan Panchanathan")).toBeVisible();

  // Switch to Teachers
  await teachersBtn.click();
  await expect(page.getByText("Our Teachers")).toBeVisible();
  await expect(page.getByText("Assistant Teachers")).toBeVisible();

  // Check for some teachers
  await expect(page.getByText("Rajini J")).toBeVisible();
  await expect(page.getByText("Udayakumar Rajendran")).toBeVisible();
  await expect(page.getByText("Bavya Anand")).toBeVisible();

  // Check for teacher grades
  await expect(page.getByText("Basic-2/A")).toBeVisible();
  await expect(page.getByText("Basic-1/B")).toBeVisible();

  // Check for assistant teachers
  await expect(page.getByText("Sujatha Karthikeyan")).toBeVisible();
  await expect(page.getByText("Swasthika Rajendran")).toBeVisible();

  // Switch to Volunteers (not available)
  await volunteersBtn.click();
  await expect(page.getByText(/Volunteers are not available yet/)).toBeVisible();

  // Switch to FAQ (not available)
  await faqBtn.click();
  await expect(page.getByText(/FAQ are not available yet/)).toBeVisible();

  // Switch back to Board to verify navigation works
  await boardBtn.click();
  await expect(page.getByText("Bala Jayaseelan").first()).toBeVisible();
});

test("team page displays images for people", async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("i18n:lang", "en");
      window.sessionStorage.clear();
    } catch {}
  });

  await page.goto("/team/");

  // Check that images are rendered (by alt text)
  await expect(page.getByAltText("Bala Jayaseelan")).toBeVisible();
  await expect(page.getByAltText("Karthikeyan N.K")).toBeVisible();
  await expect(page.getByAltText("Padma Swaminathan")).toBeVisible();
  await expect(page.getByAltText("Devi Kumaradev")).toBeVisible();
  await expect(page.getByAltText("Rajaraman Krishnan")).toBeVisible();

  // Switch to Executives and check committee member images
  const executivesBtn = page.getByRole("button", { name: "Executives", exact: true });
  await executivesBtn.click();

  await expect(page.getByAltText("Ashok Annamalai")).toBeVisible();
  await expect(page.getByAltText("Nachiappan Panchanathan")).toBeVisible();
});

test("team page expandable bios work correctly", async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("i18n:lang", "en");
      window.sessionStorage.clear();
    } catch {}
  });

  await page.goto("/team/");

  // Check that More... buttons are visible for board members
  const moreButton = page.getByRole("button", { name: "More..." }).first();
  await expect(moreButton).toBeVisible();

  // Click More... to expand detail view
  await moreButton.click();

  // Verify detail view is shown
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

  // Verify full bio text is visible (longer than preview)
  await expect(page.getByText(/dedicated leader with extensive experience/i)).toBeVisible();

  // Close the detail view
  await page.getByRole("button", { name: "Close" }).click();

  // Verify we're back to grid view
  await expect(page.getByRole("button", { name: "More..." }).first()).toBeVisible();
});

test("team page mobile menu wraps correctly", async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("i18n:lang", "en");
      window.sessionStorage.clear();
    } catch {}
  });

  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto("/team/");

  // Verify all navigation buttons are visible on mobile
  await expect(page.getByRole("button", { name: "Board" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Executives" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Teachers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Volunteers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "FAQ" })).toBeVisible();
});

test("team page is accessible from header navigation", async ({ page, context }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("i18n:lang", "en");
      window.sessionStorage.clear();
    } catch {}
  });

  await page.goto("/");

  // Click Team link in header
  await page.getByRole("link", { name: /team/i }).click();

  await expect(page).toHaveURL(/\/team\/?/);
  await expect(page.getByTestId("page-title")).toHaveText("Team");
});
