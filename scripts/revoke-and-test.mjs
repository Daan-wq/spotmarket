import { chromium } from "playwright";
import https from "https";

const CLIENT_ID = "2199789334158131";
const SECRET = "7c90d5bbf3acd4e82bd5c8e9816757f6";
const REDIRECT_URI = "https://spotmarket-gamma.vercel.app/api/auth/instagram/callback";
const APP_URL = "https://spotmarket-gamma.vercel.app";

function exchange(code) {
  return new Promise((resolve) => {
    const body = new URLSearchParams({ client_id: CLIENT_ID, client_secret: SECRET, grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code }).toString();
    const req = https.request({ hostname: "api.instagram.com", path: "/oauth/access_token", method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) } }, (res) => {
      let data = ""; res.on("data", c => data += c); res.on("end", () => resolve(res.statusCode + ": " + data));
    });
    req.on("error", e => resolve("ERROR: " + e.message));
    req.write(body); req.end();
  });
}

async function dismissCookies(page) {
  const btn = page.locator('text="Allow all cookies", text="Decline optional cookies"').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) { await btn.click({ force: true }); await page.waitForTimeout(1000); }
}

const browser = await chromium.launch({ headless: false, slowMo: 100 }); // headful to see what's happening
const ctx = await browser.newContext();
const page = await ctx.newPage();

// 1. Log into Instagram directly and revoke app
console.log("1. Revoking previous Spotmarket-IG authorization...");
await page.goto("https://www.instagram.com/");
await page.waitForTimeout(2000);
await dismissCookies(page);

// Check if already logged in
if (page.url().includes("accounts/login")) {
  await page.fill('input[name="username"]', "emperorsagency").catch(() => {});
  await page.fill('input[name="password"]', "Danuel69!").catch(() => {});
  await page.locator('button[type="submit"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(4000);
  if (page.url().includes("onetap")) {
    const notNow = page.locator('button:has-text("Not Now"), a:has-text("Not now")').first();
    if (await notNow.isVisible({ timeout: 3000 }).catch(() => false)) await notNow.click();
    await page.waitForTimeout(2000);
  }
}

// Navigate to Apps and Websites settings
await page.goto("https://www.instagram.com/accounts/manage_access/?hl=en");
await page.waitForTimeout(3000);
await page.screenshot({ path: "scripts/apps-settings.png" });
console.log("   URL:", page.url());

// Look for Spotmarket-IG and remove it
const appRow = page.locator('text="Spotmarket-IG", text="Spotmarket"').first();
if (await appRow.isVisible({ timeout: 5000 }).catch(() => false)) {
  console.log("   Found Spotmarket-IG, removing...");
  // Click the app to expand / find remove button
  await appRow.click().catch(() => {});
  await page.waitForTimeout(1000);
  
  const removeBtn = page.locator('button:has-text("Remove"), button:has-text("Revoke"), a:has-text("Remove"), a:has-text("Revoke")').first();
  if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await removeBtn.click({ force: true });
    await page.waitForTimeout(2000);
    console.log("   Removed!");
  } else {
    await page.screenshot({ path: "scripts/app-row.png" });
    console.log("   Could not find Remove button. Screenshot saved.");
  }
} else {
  console.log("   Spotmarket-IG not found in apps list.");
  await page.screenshot({ path: "scripts/apps-settings.png" });
}

// Now log into Spotmarket and re-authorize
console.log("\n2. Now doing fresh OAuth...");
const lp = await ctx.newPage();
await lp.goto(`${APP_URL}/sign-in`);
await lp.waitForLoadState("networkidle");
await lp.fill('input[type="email"]', "daan0529@icloud.com");
await lp.fill('input[type="password"]', "Test123");
await lp.click('button[type="submit"]');
await lp.waitForLoadState("networkidle");
await lp.waitForTimeout(2000);
await lp.close();

const oauthPage = await ctx.newPage();
await oauthPage.goto(`${APP_URL}/api/auth/instagram`);
await oauthPage.waitForTimeout(3000);
await dismissCookies(oauthPage);

const u = oauthPage.locator('input[name="username"], input[autocomplete="username"]').first();
if (await u.isVisible({ timeout: 5000 }).catch(() => false)) {
  await u.fill("emperorsagency");
  await oauthPage.locator('input[type="password"]').first().fill("Danuel69!");
  await oauthPage.locator('button[type="submit"]').first().dispatchEvent("click");
  await oauthPage.waitForTimeout(5000);
}

for (let i = 0; i < 3; i++) {
  const url = oauthPage.url();
  if (url.includes("onetap") || url.includes("save-info")) {
    const nextParam = new URL(url).searchParams.get("next");
    if (nextParam) { await oauthPage.goto(decodeURIComponent(nextParam)); await oauthPage.waitForTimeout(2000); }
    else break;
  } else break;
}

await dismissCookies(oauthPage);
await oauthPage.screenshot({ path: "scripts/fresh-consent.png" });
console.log("   Consent page:", oauthPage.url().slice(0, 80));

const allowSelectors = ['button:has-text("Allow")', '[role="button"]:has-text("Allow")', '[role="button"]:has-text("Continue")'];
for (const sel of allowSelectors) {
  const btn = oauthPage.locator(sel).first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) { await btn.click({ force: true }); break; }
}
await oauthPage.waitForTimeout(5000);

const finalUrl = oauthPage.url();
const debugCode = new URL(finalUrl).searchParams.get("debug_code");
if (!debugCode) { console.log("No code. URL:", finalUrl); await browser.close(); process.exit(0); }
const code = decodeURIComponent(debugCode);
console.log("Fresh code captured, length:", code.length);
await browser.close();

console.log("\nExchanging fresh code...");
const result = await exchange(code);
console.log("Result:", result);
