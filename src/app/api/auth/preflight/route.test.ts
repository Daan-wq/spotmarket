import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  assessBanEvasion: vi.fn(),
}));

vi.mock("@/lib/ban-evasion/enforcement", () => ({
  assessBanEvasion: routeMocks.assessBanEvasion,
}));

function request(body: unknown = {}) {
  return new Request("https://app.clipprofit.com/api/auth/preflight", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "NO_MATCH",
      matches: [],
      observations: [],
    });
  });

  it("allows a clean creator auth attempt", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("sets a short-lived HttpOnly proof after a successful challenge", async () => {
    process.env.BAN_SIGNAL_HASH_SECRET = "test-secret";

    const response = await POST(
      request({ turnstileToken: "turnstile-token" }),
    );

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("clipprofit_challenge=");
    expect(cookie).toContain("Max-Age=600");
    expect(cookie).toContain("HttpOnly");
  });

  it("requests Turnstile without exposing the matched signal", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "CHALLENGE",
      observedDecision: "CHALLENGE",
      reasonCode: "IP_REQUIRES_CHALLENGE",
      matches: [{ id: "secret-indicator" }],
      observations: [],
    });

    const response = await POST(request());

    expect(response.status).toBe(428);
    await expect(response.json()).resolves.toEqual({
      challengeRequired: true,
      siteKey: "site-key",
    });
  });

  it("returns a generic denial for a blocked auth attempt", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
      matches: [{ id: "secret-indicator" }],
      observations: [],
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Access unavailable.",
    });
  });
});
