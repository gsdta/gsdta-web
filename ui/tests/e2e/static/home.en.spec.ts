import { test, expect } from "@playwright/test";

// English language tests for homepage

test.describe("Homepage (English)", () => {
  test.beforeEach(async ({ page, context }) => {
    test.setTimeout(20_000);
    await context.clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("i18n:lang", "en");
        window.sessionStorage.clear();
      } catch {}
    });
  });

  test("homepage shows brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Greater San Diego Tamil Academy" })).toBeVisible();
  });

  test("public nav shows all links and routes resolve", async ({ page }) => {
    test.setTimeout(40_000);
    await page.goto("/");

    const nav = page.locator("header nav").first();

    const links: { name: string; expectTitle: string | RegExp | null; path: string; skipTitleCheck?: boolean }[] = [
      { name: "Home", expectTitle: null, path: "/", skipTitleCheck: true },
      { name: "About us", expectTitle: /About us/i, path: "/about/" },
      { name: "Team", expectTitle: "Team", path: "/team/" },
      { name: "Documents", expectTitle: "Documents", path: "/documents/" },
      { name: "Calendar", expectTitle: /Calendar(\s+20\d{2}-\d{2})?/i, path: "/calendar/" },
      {
        name: "Text books",
        expectTitle: "Academic Year 2025-26 – Text Books",
        path: "/textbooks/",
      },
      { name: "Donate", expectTitle: "Donate", path: "/donate/" },
    ];

    for (const l of links) {
      const link = nav.getByRole("link", { name: l.name, exact: true });
      await expect(link).toBeVisible();
      await Promise.all([
        page.waitForURL((url) => {
          const u = url.toString();
          const want = l.path.endsWith("/") ? l.path.slice(0, -1) : l.path;
          return u.endsWith(want) || u.endsWith(want + "/");
        }),
        link.click(),
      ]);
      if (!l.skipTitleCheck) {
        const title = page.getByTestId("page-title");
        await expect(title).toBeVisible();
        await expect(title).toHaveText(l.expectTitle as string | RegExp);
      }
      await page.goto("/");
    }

    // Ensure removed items are not present in the main nav
    await expect(nav.getByRole("link", { name: "Contact Us", exact: true })).toHaveCount(0);
  });
});

