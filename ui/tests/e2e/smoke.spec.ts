import {test, expect} from "@playwright/test";

test("smoke test - home and login pages load", async ({page}) => {
    // Test home page loads
    await page.goto("/", {waitUntil: "domcontentloaded"});
    await expect(page.locator("text=GSDTA")).toBeVisible();

    // Test login page loads
    await page.goto("/login", {waitUntil: "domcontentloaded"});
    await expect(page.getByRole("heading", {name: /login/i})).toBeVisible();
});
