import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const proxyMocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  assessBanEvasion: vi.fn(),
  recordAccessSignals: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: proxyMocks.getClaims,
    },
  })),
}));

vi.mock("@/lib/ban-evasion/enforcement", () => ({
  assessBanEvasion: proxyMocks.assessBanEvasion,
}));
vi.mock("@/lib/ban-evasion/store", () => ({
  recordAccessSignals: proxyMocks.recordAccessSignals,
}));

describe("proxy canonical app domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BAN_SIGNAL_HASH_SECRET = "test-ban-secret";
    proxyMocks.getClaims.mockResolvedValue({ data: { claims: null } });
    proxyMocks.assessBanEvasion.mockResolvedValue({
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "NO_MATCH",
      matches: [],
      observations: [],
    });
    proxyMocks.recordAccessSignals.mockResolvedValue(undefined);
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
    expect(response.headers.get("set-cookie")).not.toContain("NEXT_LOCALE=");
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

  it("sets a signed HttpOnly device cookie on public auth pages", async () => {
    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/sign-up", {
        headers: { cookie: "NEXT_LOCALE=nl" },
      }),
    );

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("clipprofit_device=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it("blocks an active creator ban on protected pages", async () => {
    proxyMocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "supabase-1",
          app_metadata: { user_role: "creator" },
        },
      },
    });
    proxyMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "ACCOUNT_BANNED",
      matches: [],
      observations: [],
    });

    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/creator/dashboard", {
        headers: { cookie: "NEXT_LOCALE=nl" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.clipprofit.com/sign-in?auth_error=access_denied",
    );
  });

  it("returns a generic forbidden response for a banned creator API request", async () => {
    proxyMocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "supabase-1",
          app_metadata: { user_role: "creator" },
        },
      },
    });
    proxyMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "ACCOUNT_BANNED",
      matches: [],
      observations: [],
    });

    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/api/campaigns", {
        headers: { cookie: "NEXT_LOCALE=nl" },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Access unavailable.",
    });
  });

  it("challenges an existing creator session when a request matches only an IP indicator", async () => {
    proxyMocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "supabase-1",
          app_metadata: { user_role: "creator" },
        },
      },
    });
    proxyMocks.assessBanEvasion.mockResolvedValue({
      decision: "CHALLENGE",
      observedDecision: "CHALLENGE",
      reasonCode: "IP_REQUIRES_CHALLENGE",
      matches: [{ id: "indicator-1" }],
      observations: [],
    });

    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/api/campaigns", {
        headers: { cookie: "NEXT_LOCALE=nl" },
      }),
    );

    expect(response.status).toBe(428);
    await expect(response.json()).resolves.toEqual({
      error: "Additional verification required.",
      challengeRequired: true,
      siteKey: "",
    });
  });

  it("keeps the sign-in page reachable when an old creator session is blocked", async () => {
    proxyMocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "supabase-1",
          app_metadata: { user_role: "creator" },
        },
      },
    });
    proxyMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "ACCOUNT_BANNED",
      matches: [],
      observations: [],
    });

    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/sign-in"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(proxyMocks.assessBanEvasion).not.toHaveBeenCalled();
  });

  it("refreshes allowed device and IP observations on protected page navigation", async () => {
    proxyMocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "supabase-1",
          app_metadata: { user_role: "creator" },
        },
      },
    });
    proxyMocks.assessBanEvasion.mockResolvedValue({
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "NO_MATCH",
      matches: [],
      observations: [
        {
          type: "DEVICE",
          valueHash: "v1:device",
          maskedValue: "devi...ce-1",
        },
      ],
    });

    const response = await proxy(
      new NextRequest("https://app.clipprofit.com/creator/dashboard"),
    );

    expect(response.status).toBe(200);
    expect(proxyMocks.recordAccessSignals).toHaveBeenCalledWith({
      supabaseId: "supabase-1",
      source: "session",
      observations: [
        {
          type: "DEVICE",
          valueHash: "v1:device",
          maskedValue: "devi...ce-1",
        },
      ],
    });
  });
});
