import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const proxyMocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: proxyMocks.getClaims,
    },
  })),
}));

describe("proxy canonical app domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    proxyMocks.getClaims.mockResolvedValue({
      data: { claims: null },
      error: null,
    });
  });

  it("permanently redirects app.clipprofit.nl to app.clipprofit.com preserving path and query", async () => {
    const response = await proxy(
      new NextRequest("https://app.clipprofit.nl/creator/connections?x=1")
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://app.clipprofit.com/creator/connections?x=1"
    );
  });

  it("defaults app.clipprofit.com requests to Dutch", async () => {
    const response = await proxy(new NextRequest("https://app.clipprofit.com/sign-in"));

    expect(response.headers.get("content-language")).toBe("nl");
    expect(response.headers.get("x-locale")).toBe("nl");
    expect(response.headers.get("set-cookie")).toContain("NEXT_LOCALE=nl");
  });

  it("preserves an explicit English preference", async () => {
    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/sign-in", {
        headers: { cookie: "NEXT_LOCALE=en" },
      })
    );

    expect(response.headers.get("content-language")).toBe("en");
    expect(response.headers.get("x-locale")).toBe("en");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("keeps password recovery confirmation public without consuming its token", async () => {
    const response = await proxy(
      new NextRequest(
        "https://app.clipprofit.com/auth/recovery?token_hash=recovery-token",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    "refresh_token_already_used",
    "refresh_token_not_found",
  ])("clears invalid Supabase cookies for %s and marks the session as expired", async (code) => {
    proxyMocks.getClaims.mockResolvedValue({
      data: { claims: null },
      error: { code, message: code },
    });

    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/brand?campaignId=campaign-1", {
        headers: {
          cookie: [
            "sb-test-ref-auth-token.0=stale-part-1",
            "sb-test-ref-auth-token.1=stale-part-2",
          ].join("; "),
        },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.clipprofit.com/sign-in?redirect_url=%2Fbrand%3FcampaignId%3Dcampaign-1&session_expired=1",
    );
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("sb-test-ref-auth-token.0=");
    expect(setCookie).toContain("sb-test-ref-auth-token.1=");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("turns an auth network exception into a recoverable sign-in page", async () => {
    proxyMocks.getClaims.mockRejectedValue(new TypeError("fetch failed"));

    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/brand"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.clipprofit.com/sign-in?redirect_url=%2Fbrand&auth_error=network",
    );
  });

  it("logs the first authenticated destination without exposing credentials", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const attemptId = "58b21f1a-b64f-41ca-95e5-79a4f9c0d47f";
    proxyMocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1" } },
      error: null,
    });

    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/brand", {
        headers: {
          cookie: `clipprofit-auth-attempt=${attemptId}`,
        },
      }),
    );

    expect(info).toHaveBeenCalledWith(
      "[brand-auth]",
      expect.objectContaining({
        event: "redirect_succeeded",
        attemptId,
        pathname: "/brand",
      }),
    );
    expect(response.headers.get("set-cookie")).toContain(
      "clipprofit-auth-attempt=",
    );

    info.mockRestore();
  });
});
