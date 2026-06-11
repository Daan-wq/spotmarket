const DEFAULT_ROUTES = ["/", "/sign-in", "/brand"];
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3_000;

function fail(message) {
  console.error(`[preview-smoke] ${message}`);
  process.exit(1);
}

function normalizeBaseUrl(value) {
  if (!value) {
    fail("Pass the deployment URL as the first argument.");
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    fail(`Invalid deployment URL: ${value}`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    fail("The deployment URL must use HTTP or HTTPS.");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function checkRoute(baseUrl, route) {
  const url = new URL(route, baseUrl);
  let lastFailure = "unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(20_000),
        headers: {
          "user-agent": "clipprofit-preview-smoke/1.0",
        },
      });

      if (response.status >= 200 && response.status < 400) {
        console.log(`[preview-smoke] ${route} returned ${response.status}.`);
        return;
      }

      lastFailure = `HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    if (attempt < MAX_ATTEMPTS) {
      await wait(RETRY_DELAY_MS);
    }
  }

  fail(`${route} failed after ${MAX_ATTEMPTS} attempts: ${lastFailure}.`);
}

const baseUrl = normalizeBaseUrl(process.argv[2]);

for (const route of DEFAULT_ROUTES) {
  await checkRoute(baseUrl, route);
}

console.log(`[preview-smoke] Deployment is healthy: ${baseUrl.origin}`);
