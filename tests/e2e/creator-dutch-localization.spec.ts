import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

const staticCreatorRoutes: Array<{ path: string; expected: RegExp }> = [
  { path: "/creator/dashboard", expected: /Goed je te zien|Welkom/i },
  { path: "/creator/campaigns", expected: /Campagnes/i },
  { path: "/creator/applications", expected: /Aanmeldingen|Campagnes/i },
  { path: "/creator/connections", expected: /Accounts|Analytics/i },
  { path: "/creator/videos", expected: /clips/i },
  { path: "/creator/payouts?tab=overview", expected: /Betalingen|Payouts/i },
  {
    path: "/creator/payouts?tab=withdraw",
    expected: /Opnemen|Uitbetalen|Withdraw/i,
  },
  { path: "/creator/payouts?tab=history", expected: /Geschiedenis|History/i },
  { path: "/creator/referral", expected: /Invite|Uitnodigen/i },
  { path: "/creator/profile?tab=general", expected: /Profiel|Algemeen/i },
  { path: "/creator/profile?tab=activity", expected: /Activiteit/i },
  { path: "/creator/profile?tab=balance", expected: /Saldo|Beschikbaar/i },
  { path: "/creator/profile?tab=community", expected: /Community/i },
  { path: "/creator/settings", expected: /Instellingen|Taal/i },
  {
    path: "/creator/settings/notifications",
    expected: /Notificaties|Meldingen/i,
  },
  { path: "/creator/course", expected: /Course|lessen|training/i },
  { path: "/creator/course/foundations", expected: /Foundations|Basis/i },
  { path: "/creator/leaderboard", expected: /Leaderboard|rang/i },
  { path: "/creator/notifications", expected: /Notificaties|meldingen/i },
  { path: "/creator/stats", expected: /Stats|Accounts/i },
  { path: "/creator/updates", expected: /Updates|Nieuw|Verbeterd/i },
  { path: "/creator/wallet", expected: /Wallet|Betalingen|Saldo/i },
];

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

async function expectDutchCreatorPage(page: Page, expected?: RegExp) {
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page).not.toHaveURL(/\/sign-in/);
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
  await expect(page.locator("body")).not.toContainText(
    "PrismaClientKnownRequestError",
  );
  if (expected) {
    await expect(page.locator("body")).toContainText(expected);
  }
}

async function visit(page: Page, path: string, expected?: RegExp) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expectDutchCreatorPage(page, expected);
}

async function firstCreatorHref(page: Page, matcher: RegExp) {
  const hrefs = await page
    .locator("a[href^='/creator/'], a[href^='http']")
    .evaluateAll((links) =>
      links
        .map((link) => (link as HTMLAnchorElement).href)
        .map((href) => new URL(href).pathname)
        .filter((pathname, index, all) => all.indexOf(pathname) === index),
    );
  return hrefs.find((href) => matcher.test(href)) ?? null;
}

test.describe("Dutch creator localization", () => {
  test.beforeEach(async ({ context, page }) => {
    test.skip(
      !process.env.E2E_CREATOR_EMAIL || !process.env.E2E_CREATOR_PASSWORD,
      "E2E creator credentials are not configured.",
    );

    await setDutchLocale(context);
    await signIn(page);
  });

  test("renders core creator routes in Dutch on desktop and mobile", async ({
    page,
  }) => {
    for (const route of staticCreatorRoutes) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await visit(page, route.path, route.expected);

      await page.setViewportSize({ width: 390, height: 844 });
      await visit(page, route.path, route.expected);
    }
  });

  test("covers creator dynamic routes when fixture data exists", async ({
    page,
  }) => {
    await visit(page, "/creator/campaigns", /Campagnes/i);
    const campaignPath = await firstCreatorHref(
      page,
      /^\/creator\/campaigns\/[^/]+$/,
    );
    if (campaignPath) {
      await visit(page, campaignPath);
      await visit(page, `${campaignPath}/contact`);
      await visit(page, `${campaignPath}/leaderboard`);
    } else {
      test
        .info()
        .annotations.push({
          type: "skip-data",
          description: "No campaign detail link found.",
        });
    }

    await visit(page, "/creator/applications", /Aanmeldingen|Campagnes/i);
    const applicationPath = await firstCreatorHref(
      page,
      /^\/creator\/applications\/[^/]+$/,
    );
    if (applicationPath) {
      await visit(page, applicationPath);
      await visit(page, `${applicationPath}/submit`);
    } else {
      test
        .info()
        .annotations.push({
          type: "skip-data",
          description: "No application detail link found.",
        });
    }

    await visit(page, "/creator/videos", /clips/i);
    const submissionPath = await firstCreatorHref(
      page,
      /^\/creator\/videos\/[^/]+$/,
    );
    if (submissionPath) {
      await visit(page, submissionPath);
    } else {
      test
        .info()
        .annotations.push({
          type: "skip-data",
          description: "No submitted clip detail link found.",
        });
    }

    await visit(page, "/creator/stats", /Stats|Accounts/i);
    const platformStatsPath = await firstCreatorHref(
      page,
      /^\/creator\/stats\/[^/]+$/,
    );
    if (platformStatsPath) {
      await visit(page, platformStatsPath);
      const connectionStatsPath = await firstCreatorHref(
        page,
        /^\/creator\/stats\/[^/]+\/[^/]+$/,
      );
      if (connectionStatsPath) {
        await visit(page, connectionStatsPath);
      }
    } else {
      test
        .info()
        .annotations.push({
          type: "skip-data",
          description: "No platform stats link found.",
        });
    }
  });
});
