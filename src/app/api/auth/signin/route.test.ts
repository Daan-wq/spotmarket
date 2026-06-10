import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getIdentitySignals: vi.fn(),
  assessBanEvasion: vi.fn(),
  recordAccessSignals: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: routeMocks.signInWithPassword,
      signOut: routeMocks.signOut,
    },
  })),
}));

vi.mock("@/lib/ban-evasion/identity-signals", () => ({
  getIdentitySignalsForSupabaseUser: routeMocks.getIdentitySignals,
}));

vi.mock("@/lib/ban-evasion/enforcement", () => ({
  assessBanEvasion: routeMocks.assessBanEvasion,
}));

vi.mock("@/lib/ban-evasion/store", () => ({
  recordAccessSignals: routeMocks.recordAccessSignals,
}));

function request(body: unknown) {
  return new Request("https://app.clipprofit.com/api/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    routeMocks.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "supabase-1" },
        session: { access_token: "token" },
      },
      error: null,
    });
    routeMocks.getIdentitySignals.mockResolvedValue({
      userId: "user-1",
      role: "creator",
      signals: [{ type: "DISCORD", value: "discord-1" }],
    });
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "NO_MATCH",
      matches: [],
      observations: [
        {
          type: "DEVICE",
          valueHash: "v1:device",
          maskedValue: "devi...1234",
        },
      ],
    });
    routeMocks.recordAccessSignals.mockResolvedValue(undefined);
    routeMocks.signOut.mockResolvedValue({ error: null });
  });

  it("establishes an allowed server-side password session", async () => {
    const response = await POST(
      request({ email: "Creator@Example.com", password: "secret123" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(routeMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "creator@example.com",
      password: "secret123",
    });
    expect(routeMocks.assessBanEvasion).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectRole: "creator",
        supabaseId: "supabase-1",
        identitySignals: [{ type: "DISCORD", value: "discord-1" }],
      }),
    );
    expect(routeMocks.recordAccessSignals).toHaveBeenCalledWith({
      supabaseId: "supabase-1",
      userId: "user-1",
      source: "signin",
      observations: [
        {
          type: "DEVICE",
          valueHash: "v1:device",
          maskedValue: "devi...1234",
        },
      ],
    });
  });

  it("returns a generic credential error", async () => {
    routeMocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const response = await POST(
      request({ email: "creator@example.com", password: "wrong-password" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid email or password.",
    });
  });

  it("revokes the new session and denies a blocked creator", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
      matches: [{ id: "private-indicator" }],
      observations: [],
    });

    const response = await POST(
      request({ email: "creator@example.com", password: "secret123" }),
    );

    expect(routeMocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Access unavailable.",
    });
  });

  it("revokes the session and requests Turnstile for an IP-only match", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "CHALLENGE",
      observedDecision: "CHALLENGE",
      reasonCode: "IP_REQUIRES_CHALLENGE",
      matches: [{ id: "private-indicator" }],
      observations: [],
    });

    const response = await POST(
      request({ email: "creator@example.com", password: "secret123" }),
    );

    expect(routeMocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(response.status).toBe(428);
    await expect(response.json()).resolves.toEqual({
      challengeRequired: true,
      siteKey: "site-key",
    });
  });
});
