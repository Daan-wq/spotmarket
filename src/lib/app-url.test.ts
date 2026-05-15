import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildAppUrl, getAppUrlFromHost, getAppUrlFromRequest, getAppUrlForLocale } from "./app-url";
import { getLocaleFromHost } from "@/i18n/routing";

const savedEnv = {
  NEXT_PUBLIC_APP_URL_NL: process.env.NEXT_PUBLIC_APP_URL_NL,
  NEXT_PUBLIC_APP_URL_EN: process.env.NEXT_PUBLIC_APP_URL_EN,
};

describe("app URL and locale routing", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL_NL;
    delete process.env.NEXT_PUBLIC_APP_URL_EN;
  });

  afterEach(() => {
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

  it("maps non-NL hosts to en", () => {
    expect(getLocaleFromHost("app.clipprofit.com")).toBe("en");
    expect(getLocaleFromHost("localhost:3000")).toBe("en");
  });

  it("returns the locale-specific app URL", () => {
    expect(getAppUrlForLocale("nl")).toBe("https://app.clipprofit.nl");
    expect(getAppUrlForLocale("en")).toBe("https://app.clipprofit.com");
  });

  it("uses host-derived URLs", () => {
    expect(getAppUrlFromHost("app.clipprofit.nl")).toBe("https://app.clipprofit.nl");
    expect(getAppUrlFromHost("app.clipprofit.com")).toBe("https://app.clipprofit.com");
  });

  it("prefers a real request origin over env fallbacks", () => {
    const req = new Request("https://preview-123.vercel.app/sign-up", {
      headers: { host: "preview-123.vercel.app" },
    });

    expect(getAppUrlFromRequest(req)).toBe("https://preview-123.vercel.app");
  });

  it("builds absolute app URLs without double slashes", () => {
    expect(buildAppUrl("/auth/confirm", "https://app.clipprofit.nl/")).toBe(
      "https://app.clipprofit.nl/auth/confirm"
    );
  });
});
