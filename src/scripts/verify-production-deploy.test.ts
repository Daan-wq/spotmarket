import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.join(
  process.cwd(),
  "scripts",
  "verify-production-deploy.mjs",
);

function runVerification(overrides: Record<string, string | undefined>) {
  const env = { ...process.env };

  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[name];
    } else {
      env[name] = value;
    }
  }

  return spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
}

describe("Vercel deployment environment verification", () => {
  it("does not require Vercel variables outside Vercel", () => {
    const result = runVerification({
      VERCEL: undefined,
      VERCEL_ENV: undefined,
      DATABASE_URL: undefined,
      DATABASE_URL_DIRECT: undefined,
    });

    expect(result.status).toBe(0);
  });

  it("blocks previews without project-wide database variables", () => {
    const result = runVerification({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      DATABASE_URL: undefined,
      DATABASE_URL_DIRECT: undefined,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Missing required preview environment variables: DATABASE_URL, DATABASE_URL_DIRECT",
    );
  });

  it("blocks database URLs that point to localhost", () => {
    const result = runVerification({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/app",
      DATABASE_URL_DIRECT: "postgresql://user:pass@localhost:5432/app",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "DATABASE_URL points to a local database host",
    );
  });

  it("accepts complete remote preview database configuration", () => {
    const result = runVerification({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      DATABASE_URL: "postgresql://user:pass@pooler.example.com:6543/app",
      DATABASE_URL_DIRECT: "postgresql://user:pass@db.example.com:5432/app",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Verified database configuration for preview",
    );
  });
});
