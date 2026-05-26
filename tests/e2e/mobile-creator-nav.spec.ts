import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

async function setDutchLocale(context: BrowserContext) {
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "nl", url: baseURL, path: "/" },
  ]);
}

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: /sign in another way|log in op een andere manier/i })
    .click();
  await page.getByLabel(/email/i).fill(process.env.E2E_CREATOR_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.E2E_CREATOR_PASSWORD!);
  await page
    .getByRole("button", { name: /sign in|log in|inloggen|aanmelden/i })
    .click();
  await page.waitForLoadState("networkidle");
}

test.describe("mobile creator navigation", () => {
  test.beforeEach(async ({ context, page }) => {
    test.skip(
      !process.env.E2E_CREATOR_EMAIL || !process.env.E2E_CREATOR_PASSWORD,
      "E2E creator credentials are not configured.",
    );

    await setDutchLocale(context);
    await signIn(page);
  });

  test("keeps the bottom nav anchored near the viewport bottom on payouts", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/creator/payouts?tab=overview");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/sign-in/);

    await page
      .getByText(/Inkomsten per campagne|Earnings by campaign/i)
      .first()
      .scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 160));

    const nav = page.getByTestId("creator-bottom-nav");
    await expect(nav).toBeVisible();

    const box = await nav.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        top: rect.top,
        viewportHeight: window.innerHeight,
      };
    });

    expect(Math.abs(box.viewportHeight - box.bottom)).toBeLessThanOrEqual(48);
    expect(box.top).toBeGreaterThan(box.viewportHeight * 0.75);
  });
});
