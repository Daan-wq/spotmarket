import { chromium } from "playwright";

const APP_URL = "https://spotmarket-gamma.vercel.app";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`${APP_URL}/sign-in`);
await page.waitForLoadState("networkidle");

await page.screenshot({ path: "scripts/signin-page.png" });
console.log("Sign-in page URL:", page.url());

const inputs = await page.$$eval("input", (els) => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder, id: e.id })));
console.log("Form inputs:", JSON.stringify(inputs, null, 2));

// Try filling in
const emailInput = await page.$('input[type="email"]');
const passInput = await page.$('input[type="password"]');
console.log("Email input found:", !!emailInput, "Password input found:", !!passInput);

if (emailInput && passInput) {
  await emailInput.fill(requiredEnv("TEST_SIGNIN_EMAIL"));
  await passInput.fill(requiredEnv("TEST_SIGNIN_PASSWORD"));
  await page.screenshot({ path: "scripts/signin-filled.png" });
  
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: "scripts/signin-after.png" });
  console.log("After submit URL:", page.url());
}

await browser.close();
