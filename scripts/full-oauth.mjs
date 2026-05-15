import { chromium } from "playwright";
import https from "https";

const APP_URL = "https://spotmarket-gamma.vercel.app";
const REDIRECT_URI = "https://spotmarket-gamma.vercel.app/api/auth/instagram/callback";
const APP_TEST_EMAIL = process.env.APP_TEST_EMAIL ?? "";
const APP_TEST_PASSWORD = process.env.APP_TEST_PASSWORD ?? "";
const INSTAGRAM_TEST_USERNAME = process.env.INSTAGRAM_TEST_USERNAME ?? "";
const INSTAGRAM_TEST_PASSWORD = process.env.INSTAGRAM_TEST_PASSWORD ?? "";

function exchange(code, clientId, secret, label) {
  return new Promise((resolve) => {
    const body = new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code }).toString();
    const req = https.request({ hostname: "api.instagram.com", path: "/oauth/access_token", method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) } }, (res) => {
      let data = ""; res.on("data", c => data += c); res.on("end", () => resolve(`[${label}] ${res.statusCode}: ${data}`));
    });
    req.on("error", e => resolve(`ERROR: ${e.message}`));
    req.write(body); req.end();
  });
}

async function dismissCookies(page) {
  const btn = page.locator('text="Allow all cookies", text="Decline optional cookies"').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) { await btn.click({ force: true }); await page.waitForTimeout(1000); }
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();

// Login Spotmarket
const lp = await ctx.newPage();
await lp.goto(`${APP_URL}/sign-in`);
await lp.waitForLoadState("networkidle");
await lp.fill('input[type="email"]', APP_TEST_EMAIL);
await lp.fill('input[type="password"]', APP_TEST_PASSWORD);
await lp.click('button[type="submit"]');
await lp.waitForLoadState("networkidle");
await lp.waitForTimeout(2000);
await lp.close();

// OAuth flow
const page = await ctx.newPage();
await page.goto(`${APP_URL}/api/auth/instagram`);
await page.waitForTimeout(3000);
await dismissCookies(page);

// Instagram login
const u = page.locator('input[name="username"], input[autocomplete="username"]').first();
if (await u.isVisible({ timeout: 5000 }).catch(() => false)) {
  await u.fill(INSTAGRAM_TEST_USERNAME);
  await page.locator('input[type="password"]').first().fill(INSTAGRAM_TEST_PASSWORD);
  await page.locator('button[type="submit"]').first().dispatchEvent("click");
  await page.waitForTimeout(5000);
}

// Bypass onetap
for (let i = 0; i < 3; i++) {
  const url = page.url();
  if (url.includes("onetap") || url.includes("save-info")) {
    const next = new URL(url).searchParams.get("next");
    if (next) { await page.goto(decodeURIComponent(next)); await page.waitForTimeout(2000); }
    else break;
  } else break;
}

await dismissCookies(page);
console.log("Consent page:", page.url().slice(0, 80));

// Click Allow — try multiple strategies
let clicked = false;
for (const sel of ['button:has-text("Allow")', '[role="button"]:has-text("Allow")', '[role="button"]:has-text("Continue")']) {
  const btn = page.locator(sel).first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click({ force: true });
    clicked = true;
    break;
  }
}
if (!clicked) {
  // Try clicking the blue button directly
  await page.mouse.click(640, 481);
}

await page.waitForTimeout(6000);
const finalUrl = page.url();
console.log("Final URL:", finalUrl.slice(0, 100));

const debugCode = new URL(finalUrl).searchParams.get("debug_code");
if (!debugCode) {
  console.log("No debug_code found.");
  await page.screenshot({ path: "scripts/final.png" });
  await browser.close();
  process.exit(1);
}

const code = decodeURIComponent(debugCode);
console.log("Code length:", code.length);
await browser.close();

// Test the new parent-app secret with Instagram app ID
const IG_APP_ID = process.env.INSTAGRAM_APP_ID ?? "2199789334158131";
const FB_APP_ID = process.env.FACEBOOK_APP_ID ?? "1474992817586889";
const NEW_SECRET = process.env.INSTAGRAM_APP_SECRET ?? "";

const r1 = await exchange(code, IG_APP_ID, NEW_SECRET, `IG_ID + parent_secret`);
console.log(r1);

// Also try with FB app ID + new secret
const r2 = await exchange(code, FB_APP_ID, NEW_SECRET, `FB_ID + parent_secret`);
console.log(r2);

