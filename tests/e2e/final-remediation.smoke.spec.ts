import { expect, test } from "@playwright/test";

const creatorRoutes = ["/creator/connections", "/creator/course", "/creator/course/foundations"];
const adminRoutes = ["/admin", "/admin/pricing", "/admin/documents", "/admin/reports"];

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: /sign in another way|log in op een andere manier/i })
    .click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForLoadState("networkidle");
}

test.describe("ClickProfit final remediation smoke", () => {
  test("creator remediation routes render for a creator account", async ({ page }) => {
    test.skip(!process.env.E2E_CREATOR_EMAIL || !process.env.E2E_CREATOR_PASSWORD, "E2E creator credentials are not configured.");
    await signIn(page, process.env.E2E_CREATOR_EMAIL!, process.env.E2E_CREATOR_PASSWORD!);

    for (const route of creatorRoutes) {
      await page.goto(route);
      await expect(page.locator("body")).toContainText(/Accounts|Course hub|Foundations/);
    }
  });

  test("admin remediation routes render for an admin account", async ({ page }) => {
    test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "E2E admin credentials are not configured.");
    await signIn(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!);

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page.locator("body")).toContainText(/Command Center|Pricing|Documents|Reports/);
    }
  });
});
