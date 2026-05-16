import { chromium } from "playwright";

const APP_URL = "https://spotmarket-gamma.vercel.app";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Login
await page.goto(`${APP_URL}/sign-in`);
await page.waitForLoadState("networkidle");
await page.fill('input[type="email"]', requiredEnv("TEST_OAUTH_EMAIL"));
await page.fill('input[type="password"]', requiredEnv("TEST_OAUTH_PASSWORD"));
await page.click('button[type="submit"]');
await page.waitForLoadState("networkidle");
await page.waitForTimeout(2000);
console.log("After login:", page.url());

// Log cookies
const cookies = await ctx.cookies();
console.log("Cookie count:", cookies.length);
const sbCookies = cookies.filter(c => c.name.startsWith("sb-"));
console.log("Supabase cookies:", sbCookies.map(c => c.name));

// Navigate to OAuth init
await page.goto(`${APP_URL}/api/auth/instagram`);
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(3000);
console.log("After OAuth init:", page.url());

await page.screenshot({ path: "scripts/oauth-init.png" });
await browser.close();
