import { chromium } from "playwright";
import https from "https";

const APP_URL = "https://spotmarket-gamma.vercel.app";
const IG_APP_ID = "2199789334158131";
const IG_SECRET = "5a1b55705d4f4e1ecb72fc662662cc5c";
const REDIRECT_URI = "https://spotmarket-gamma.vercel.app/api/auth/instagram/callback";

function exchange(code, secret, label) {
  return new Promise((resolve) => {
    const body = new URLSearchParams({ client_id: IG_APP_ID, client_secret: secret, grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code }).toString();
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

const lp = await ctx.newPage();
await lp.goto(`${APP_URL}/sign-in`);
await lp.waitForLoadState("networkidle");
await lp.fill('input[type="email"]', "daan0529@icloud.com");
await lp.fill('input[type="password"]', "Test123");
await lp.click('button[type="submit"]');
await lp.waitForLoadState("networkidle");
await lp.waitForTimeout(2000);
await lp.close();

const page = await ctx.newPage();
await page.goto(`${APP_URL}/api/auth/instagram`);
await page.waitForTimeout(3000);
await dismissCookies(page);

const u = page.locator('input[name="username"], input[autocomplete="username"]').first();
if (await u.isVisible({ timeout: 5000 }).catch(() => false)) {
  await u.fill("emperorsagency");
  await page.locator('input[type="password"]').first().fill("Danuel69!");
  await page.locator('button[type="submit"]').first().dispatchEvent("click");
  await page.waitForTimeout(5000);
}

for (let i = 0; i < 3; i++) {
  const url = page.url();
  if (url.includes("onetap") || url.includes("save-info")) {
    const next = new URL(url).searchParams.get("next");
    if (next) { await page.goto(decodeURIComponent(next)); await page.waitForTimeout(2000); }
    else break;
  } else break;
}

await dismissCookies(page);

for (const sel of ['button:has-text("Allow")', '[role="button"]:has-text("Allow")', '[role="button"]:has-text("Continue")']) {
  const btn = page.locator(sel).first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) { await btn.click({ force: true }); break; }
}

await page.waitForTimeout(6000);
const finalUrl = page.url();
const debugCode = new URL(finalUrl).searchParams.get("debug_code");
if (!debugCode) { console.log("No code. URL:", finalUrl); await page.screenshot({path:"scripts/final.png"}); await browser.close(); process.exit(1); }

const code = decodeURIComponent(debugCode);
console.log("Fresh code captured, length:", code.length);
await browser.close();

const result = await exchange(code, IG_SECRET, "IG_ID + IG_secret");
console.log(result);
