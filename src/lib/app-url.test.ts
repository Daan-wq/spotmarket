import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAppUrl,
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
};

describe("app URL and locale routing", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL_NL;
    delete process.env.NEXT_PUBLIC_APP_URL_EN;
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
