import { execFileSync } from "node:child_process";

const PRODUCTION_BRANCH = "master";

function fail(message) {
  console.error(`[production-deploy] ${message}`);
  process.exit(1);
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...options,
  }).trim();
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
  verifyVercelBuild();
}
