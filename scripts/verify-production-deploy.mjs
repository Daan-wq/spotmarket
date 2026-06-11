import { execFileSync } from "node:child_process";

const PRODUCTION_BRANCH = "master";
const REQUIRED_DATABASE_VARIABLES = ["DATABASE_URL", "DATABASE_URL_DIRECT"];
const LOCAL_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "host.docker.internal",
]);

function fail(message) {
  console.error(`[vercel-deploy] ${message}`);
  process.exit(1);
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...options,
  }).trim();
}

function verifyDatabaseUrl(name, value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    fail(`${name} must be a valid PostgreSQL connection URL.`);
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    fail(`${name} must use the postgres or postgresql protocol.`);
  }

  if (LOCAL_DATABASE_HOSTS.has(url.hostname.toLowerCase())) {
    fail(`${name} points to a local database host and cannot be used by Vercel.`);
  }
}

function verifyVercelRuntimeEnvironment() {
  if (process.env.VERCEL !== "1") {
    return;
  }

  const missing = REQUIRED_DATABASE_VARIABLES.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length > 0) {
    fail(
      `Missing required ${process.env.VERCEL_ENV || "Vercel"} environment variables: ${missing.join(", ")}. Configure them for the complete Preview or Production environment, not only for one Git branch.`,
    );
  }

  for (const name of REQUIRED_DATABASE_VARIABLES) {
    verifyDatabaseUrl(name, process.env[name]);
  }

  console.log(
    `[vercel-deploy] Verified database configuration for ${process.env.VERCEL_ENV || "Vercel"}.`,
  );
}

function verifyVercelBuild() {
  if (process.env.VERCEL !== "1" || process.env.VERCEL_ENV !== "production") {
    return;
  }

  const commitRef = process.env.VERCEL_GIT_COMMIT_REF;
  if (commitRef !== PRODUCTION_BRANCH) {
    fail(
      `Production builds must come from ${PRODUCTION_BRANCH}; received ${commitRef || "no Git branch"}.`,
    );
  }

  console.log(`[production-deploy] Verified Vercel production branch: ${commitRef}`);
}

function verifyLocalDeploy() {
  execFileSync("git", ["fetch", "origin", PRODUCTION_BRANCH], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  const branch = git(["branch", "--show-current"]);
  if (branch !== PRODUCTION_BRANCH) {
    fail(`Run production deploys from ${PRODUCTION_BRANCH}; current branch is ${branch || "detached HEAD"}.`);
  }

  if (git(["status", "--porcelain"])) {
    fail("The worktree must be clean before a production deploy.");
  }

  const localHead = git(["rev-parse", "HEAD"]);
  const remoteHead = git(["rev-parse", `origin/${PRODUCTION_BRANCH}`]);
  if (localHead !== remoteHead) {
    fail(`Local ${PRODUCTION_BRANCH} must exactly match origin/${PRODUCTION_BRANCH}.`);
  }

  console.log(`[production-deploy] Verified local ${PRODUCTION_BRANCH} at ${localHead.slice(0, 8)}`);
}

if (process.argv.includes("--local")) {
  verifyLocalDeploy();
} else {
  verifyVercelRuntimeEnvironment();
  verifyVercelBuild();
}
