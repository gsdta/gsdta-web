import { test, expect } from "@playwright/test";

// Minimal smoke test for the public homepage

test("homepage shows brand", async ({ page, context }) => {
  test.setTimeout(20_000);
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {}
  });

  await page.goto("/");

  await expect(page.getByText("GSDTA").first()).toBeVisible();
});

// Verify public nav links in English and their destinations

test("public nav (en) shows all links and routes resolve", async ({ page, context }) => {
  test.setTimeout(40_000);
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("i18n:lang", "en");
      window.sessionStorage.clear();
    } catch {}
  });

  await page.goto("/");

  const nav = page.locator("header nav");

  // Expect all public links by accessible name within header nav
  const links: { name: string; expectTitle: string | RegExp | null; path: string }[] = [
    { name: "Home", expectTitle: null, path: "/" },
    { name: "About us", expectTitle: /About us/i, path: "/about/" },
    { name: "Register", expectTitle: "Register", path: "/register/" },
    { name: "Team", expectTitle: "Team", path: "/team/" },
    { name: "Documents", expectTitle: "Documents", path: "/documents/" },
    { name: "Calendar", expectTitle: /Calendar(\s+20\d{2}-\d{2})?/i, path: "/calendar/" },
    { name: "Text books", expectTitle: "Text books", path: "/textbooks/" },
    { name: "Donate", expectTitle: "Donate", path: "/donate/" },
    { name: "Contact Us", expectTitle: "Contact Us", path: "/contact/" },
  ];

  for (const l of links) {
    const link = nav.getByRole("link", { name: l.name, exact: true });
    await expect(link).toBeVisible();
    if (l.path === "/") {
      // Already on home; clicking Home may not trigger a navigation event
      await link.click();
      await expect(page.getByText("GSDTA").first()).toBeVisible();
    } else {
      await Promise.all([
        page.waitForURL((url) => {
          const u = url.toString();
          const want = l.path.endsWith("/") ? l.path.slice(0, -1) : l.path;
          return u.endsWith(want) || u.endsWith(want + "/");
        }),
        link.click(),
      ]);
      await expect(page.getByTestId("page-title")).toHaveText(l.expectTitle as string | RegExp);
    }
    // Navigate back to home before next link
    await page.goto("/");
  }
});
