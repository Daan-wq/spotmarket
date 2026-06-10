import { beforeEach, describe, expect, it, vi } from "vitest";

const hookMocks = vi.hoisted(() => ({
  verify: vi.fn(),
  findMatches: vi.fn(),
  countSignups: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("standardwebhooks", () => ({
  Webhook: class {
    verify(payload: string) {
      return hookMocks.verify(payload);
    }
  },
}));

vi.mock("@/lib/ban-evasion/store", () => ({
  findActiveIndicatorMatches: hookMocks.findMatches,
  countRecentDistinctSignupsForIp: hookMocks.countSignups,
  logEnforcementEvent: hookMocks.logEvent,
}));

import { POST } from "./route";

const creatorEvent: {
  metadata: { name: string; ip_address: string };
  user: {
    id: string;
    app_metadata: Record<string, string>;
    user_metadata: Record<string, string>;
    identities: Array<Record<string, unknown>>;
  };
} = {
  metadata: {
    name: "before-user-created",
    ip_address: "203.0.113.9",
  },
  user: {
    id: "supabase-new",
    app_metadata: { provider: "discord" },
    user_metadata: {
      provider_id: "discord-123",
    },
    identities: [],
  },
};

function request(body = creatorEvent) {
  return new Request(
    "https://clipprofit.com/api/auth/hooks/before-user-created",
    {
      method: "POST",
      headers: {
        "webhook-id": "msg-1",
        "webhook-timestamp": "1749550000",
        "webhook-signature": "v1,test",
      },
      body: JSON.stringify(body),
    },
  );
}

describe("Before User Created hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_AUTH_HOOK_SECRET = "whsec_test";
    process.env.BAN_SIGNAL_HASH_SECRET = "ban-secret";
    process.env.BAN_EVASION_MODE = "enforce";
    hookMocks.verify.mockImplementation((payload: string) =>
      JSON.parse(payload),
    );
    hookMocks.findMatches.mockResolvedValue([]);
    hookMocks.countSignups.mockResolvedValue(0);
    hookMocks.logEvent.mockResolvedValue(undefined);
  });

  it("rejects an invalid signature", async () => {
    hookMocks.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("blocks a hard IP match with a generic error", async () => {
    hookMocks.findMatches.mockResolvedValue([
      {
        id: "indicator-1",
        accountBanId: "ban-1",
        type: "IP",
        strength: "WEAK",
        mode: "HARD",
      },
    ]);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: { http_code: 403, message: "Access unavailable." },
    });
  });

  it("does not apply creator enforcement to brand invites", async () => {
    const response = await POST(
      request({
        ...creatorEvent,
        user: {
          ...creatorEvent.user,
          app_metadata: {
            provider: "email",
            user_role: "brand",
          } as Record<string, string>,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
    expect(hookMocks.findMatches).not.toHaveBeenCalled();
  });

  it("does not trust a user-supplied brand role", async () => {
    hookMocks.findMatches.mockResolvedValue([
      {
        id: "indicator-1",
        accountBanId: "ban-1",
        type: "IP",
        strength: "WEAK",
        mode: "HARD",
      },
    ]);

    const response = await POST(
      request({
        ...creatorEvent,
        user: {
          ...creatorEvent.user,
          user_metadata: { role: "brand" },
        },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("logs matches but allows signup during observation mode", async () => {
    process.env.BAN_EVASION_MODE = "observe";
    hookMocks.findMatches.mockResolvedValue([
      {
        id: "indicator-1",
        accountBanId: "ban-1",
        type: "DISCORD",
        strength: "STRONG",
        mode: "LAYERED",
      },
    ]);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(hookMocks.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "ALLOW",
        observedDecision: "BLOCK",
        reasonCode: "STRONG_INDICATOR",
      }),
    );
  });
});
