import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assessBanEvasion,
  collectRequestObservations,
  verifyTurnstile,
} from "./enforcement";
import {
  createChallengeProofValue,
  createDeviceCookieValue,
  hashSignal,
} from "./signals";

const mocks = vi.hoisted(() => ({
  getActiveAccountBan: vi.fn(),
  findActiveIndicatorMatches: vi.fn(),
  countRecentDistinctSignupsForIp: vi.fn(),
  logEnforcementEvent: vi.fn(),
  verifyTurnstile: vi.fn(),
  fetch: vi.fn(),
}));

const dependencies = {
  getActiveAccountBan: mocks.getActiveAccountBan,
  findActiveIndicatorMatches: mocks.findActiveIndicatorMatches,
  countRecentDistinctSignupsForIp: mocks.countRecentDistinctSignupsForIp,
  logEnforcementEvent: mocks.logEnforcementEvent,
  verifyTurnstile: mocks.verifyTurnstile,
};

function request(cookie?: string) {
  return new Request("https://app.clipprofit.com/sign-up", {
    headers: {
      "x-vercel-forwarded-for": "203.0.113.10",
      ...(cookie ? { cookie } : {}),
    },
  });
}

describe("ban-evasion request enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveAccountBan.mockResolvedValue({
      active: false,
      banId: null,
    });
    mocks.findActiveIndicatorMatches.mockResolvedValue([]);
    mocks.countRecentDistinctSignupsForIp.mockResolvedValue(0);
    mocks.logEnforcementEvent.mockResolvedValue(undefined);
    mocks.verifyTurnstile.mockResolvedValue(null);
  });

  it("collects only hashed IP and verified device observations", () => {
    const deviceCookie = createDeviceCookieValue("device-123", "secret");

    expect(
      collectRequestObservations(
        request(`clipprofit_device=${deviceCookie}`),
        {
          secret: "secret",
          isVercel: true,
        },
      ),
    ).toEqual([
      {
        type: "IP",
        valueHash: hashSignal("IP", "203.0.113.10", "secret"),
        maskedValue: "203.0.113.xxx",
      },
      {
        type: "DEVICE",
        valueHash: hashSignal("DEVICE", "device-123", "secret"),
        maskedValue: "devi...-123",
      },
    ]);
  });

  it("returns a challenge for an IP-only match in enforce mode", async () => {
    mocks.findActiveIndicatorMatches.mockResolvedValue([
      {
        id: "indicator-ip",
        accountBanId: "ban-1",
        type: "IP",
        strength: "WEAK",
        mode: "LAYERED",
      },
    ]);

    await expect(
      assessBanEvasion(
        {
          request: request(),
          subjectRole: "creator",
          mode: "enforce",
          signalSecret: "secret",
          isVercel: true,
        },
        dependencies,
      ),
    ).resolves.toMatchObject({
      decision: "CHALLENGE",
      observedDecision: "CHALLENGE",
      reasonCode: "IP_REQUIRES_CHALLENGE",
    });
  });

  it("accepts a recent challenge-proof cookie for an IP-only match", async () => {
    const proof = createChallengeProofValue(new Date(), "secret");
    mocks.findActiveIndicatorMatches.mockResolvedValue([
      {
        id: "indicator-ip",
        accountBanId: "ban-1",
        type: "IP",
        strength: "WEAK",
        mode: "LAYERED",
      },
    ]);

    await expect(
      assessBanEvasion(
        {
          request: request(`clipprofit_challenge=${proof}`),
          subjectRole: "creator",
          mode: "enforce",
          signalSecret: "secret",
          isVercel: true,
        },
        dependencies,
      ),
    ).resolves.toMatchObject({
      decision: "ALLOW",
      reasonCode: "IP_CHALLENGE_PASSED",
    });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("logs but allows a strong device match in observation mode", async () => {
    const deviceCookie = createDeviceCookieValue("device-123", "secret");
    mocks.findActiveIndicatorMatches.mockResolvedValue([
      {
        id: "indicator-device",
        accountBanId: "ban-1",
        type: "DEVICE",
        strength: "STRONG",
        mode: "LAYERED",
      },
    ]);

    const result = await assessBanEvasion(
      {
        request: request(`clipprofit_device=${deviceCookie}`),
        subjectRole: "creator",
        mode: "observe",
        signalSecret: "secret",
        isVercel: true,
      },
      dependencies,
    );

    expect(result).toMatchObject({
      decision: "ALLOW",
      observedDecision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
    });
    expect(mocks.logEnforcementEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        accountBanId: "ban-1",
        decision: "ALLOW",
        observedDecision: "BLOCK",
        matchedIndicatorIds: ["indicator-device"],
      }),
    );
  });

  it("blocks an actively banned authenticated creator in observation mode", async () => {
    mocks.getActiveAccountBan.mockResolvedValue({
      active: true,
      banId: "ban-account",
    });

    await expect(
      assessBanEvasion(
        {
          request: request(),
          subjectRole: "creator",
          supabaseId: "supabase-1",
          mode: "observe",
          signalSecret: "secret",
          isVercel: true,
        },
        dependencies,
      ),
    ).resolves.toMatchObject({
      decision: "BLOCK",
      reasonCode: "ACCOUNT_BANNED",
    });
  });
});

describe("verifyTurnstile", () => {
  it("sends the token and trusted IP to Cloudflare", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    await expect(
      verifyTurnstile(
        "turnstile-token",
        "203.0.113.10",
        "turnstile-secret",
        mocks.fetch,
      ),
    ).resolves.toBe(true);

    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      }),
    );
    const body = mocks.fetch.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("secret")).toBe("turnstile-secret");
    expect(body.get("response")).toBe("turnstile-token");
    expect(body.get("remoteip")).toBe("203.0.113.10");
  });
});
