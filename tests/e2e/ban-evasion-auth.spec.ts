import { expect, test, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

async function openEmailSignup(page: Page) {
  await page.goto("/sign-up");
  await page
    .getByRole("button", {
      name: /registreer op een andere manier|sign up another way/i,
    })
    .click();
  await page.getByLabel(/e-mail|email/i).fill("creator@example.test");
  await page.getByLabel(/^wachtwoord|^password/i).fill("strong-password");
  await page
    .getByLabel(/bevestig wachtwoord|confirm password/i)
    .fill("strong-password");
}

test.describe("ban-evasion auth UI", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "nl",
        url: baseURL,
      },
    ]);
  });

  test("renders Turnstile after an IP-only challenge", async ({ page }) => {
    await page.route("**/api/auth/signup", (route) =>
      route.fulfill({
        status: 428,
        contentType: "application/json",
        body: JSON.stringify({
          challengeRequired: true,
          siteKey: "test-site-key",
        }),
      }),
    );
    await page.route(
      "https://challenges.cloudflare.com/turnstile/**",
      (route) => route.abort(),
    );

    await openEmailSignup(page);
    await page.locator("form button[type='submit']").click();

    await expect(
      page.getByLabel("Security verification"),
    ).toHaveAttribute("data-sitekey", "test-site-key");
  });

  test("shows only the generic block message", async ({ page }) => {
    await page.route("**/api/auth/signup", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Access unavailable." }),
      }),
    );

    await openEmailSignup(page);
    await page.locator("form button[type='submit']").click();

    await expect(page.getByText("Access unavailable.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /IP-adres|IP address|devicecookie|device identifier|ban indicator/i,
    );
  });
});
