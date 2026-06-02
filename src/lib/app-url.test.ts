import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAppUrl,
  getAppUrlForSharedLinks,
  getAppUrlFromHeaders,
  getAppUrlFromHost,
  getAppUrlFromRequest,
  getAppUrlForLocale,
} from "./app-url";
import { getLocaleFromHost } from "@/i18n/routing";

const savedEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_URL_NL: process.env.NEXT_PUBLIC_APP_URL_NL,
  NEXT_PUBLIC_APP_URL_EN: process.env.NEXT_PUBLIC_APP_URL_EN,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
};

describe("app URL and locale routing", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL_NL;
    delete process.env.NEXT_PUBLIC_APP_URL_EN;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
  });

  afterEach(() => {
    if (savedEnv.NEXT_PUBLIC_APP_URL === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = savedEnv.NEXT_PUBLIC_APP_URL;
    }
    if (savedEnv.NEXT_PUBLIC_APP_URL_NL === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL_NL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL_NL = savedEnv.NEXT_PUBLIC_APP_URL_NL;
    }
    if (savedEnv.NEXT_PUBLIC_APP_URL_EN === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL_EN;
    } else {
      process.env.NEXT_PUBLIC_APP_URL_EN = savedEnv.NEXT_PUBLIC_APP_URL_EN;
    }
    if (savedEnv.VERCEL_ENV === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = savedEnv.VERCEL_ENV;
    }
    if (savedEnv.VERCEL_URL === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = savedEnv.VERCEL_URL;
    }
    if (savedEnv.VERCEL_BRANCH_URL === undefined) {
      delete process.env.VERCEL_BRANCH_URL;
    } else {
      process.env.VERCEL_BRANCH_URL = savedEnv.VERCEL_BRANCH_URL;
    }
  });

  it("maps Dutch app hosts to nl", () => {
    expect(getLocaleFromHost("app.clipprofit.nl")).toBe("nl");
    expect(getLocaleFromHost("app.clipprofit.nl:443")).toBe("nl");
  });

  it("maps non-NL hosts to the Dutch default locale", () => {
    expect(getLocaleFromHost("app.clipprofit.com")).toBe("nl");
    expect(getLocaleFromHost("localhost:3000")).toBe("nl");
  });

  it("returns the locale-specific app URL", () => {
    expect(getAppUrlForLocale("nl")).toBe("https://app.clipprofit.com");
    expect(getAppUrlForLocale("en")).toBe("https://app.clipprofit.com");
  });

  it("uses the canonical app URL for host-derived URLs", () => {
    expect(getAppUrlFromHost("app.clipprofit.nl")).toBe("https://app.clipprofit.com");
    expect(getAppUrlFromHost("app.clipprofit.com")).toBe("https://app.clipprofit.com");
  });

  it("prefers a real request origin over env fallbacks", () => {
    const req = new Request("https://preview-123.vercel.app/sign-up", {
      headers: { host: "preview-123.vercel.app" },
    });

    expect(getAppUrlFromRequest(req)).toBe("https://preview-123.vercel.app");
  });

  it("uses the Vercel branch URL for shared links in preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "clipprofit-branch.vercel.app";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.clipprofit.com";
    const req = new Request("https://old-preview.vercel.app/api/admin/brands/brand-1/contacts", {
      headers: { host: "old-preview.vercel.app" },
    });

    expect(getAppUrlForSharedLinks(req)).toBe("https://clipprofit-branch.vercel.app");
  });

  it("keeps local request origins for shared links during development", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.clipprofit.com";
    const req = new Request("http://localhost:3000/api/admin/brands/brand-1/contacts", {
      headers: { host: "localhost:3000" },
    });

    expect(getAppUrlForSharedLinks(req)).toBe("http://localhost:3000");
  });

  it("builds dashboard links from forwarded preview headers", () => {
    const headers = new Headers({
      "x-forwarded-host": "preview-123.vercel.app",
      "x-forwarded-proto": "https",
      host: "app.clipprofit.com",
    });

    expect(getAppUrlFromHeaders(headers)).toBe("https://preview-123.vercel.app");
  });

  it("uses http for local dashboard links", () => {
    expect(getAppUrlFromHeaders(new Headers({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("builds absolute app URLs without double slashes", () => {
    expect(buildAppUrl("/auth/confirm", "https://app.clipprofit.com/")).toBe(
      "https://app.clipprofit.com/auth/confirm"
    );
  });
});
