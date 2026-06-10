import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  recentTicket: vi.fn(),
  createTicket: vi.fn(),
  attributionUpdateMany: vi.fn(),
  createUser: vi.fn(),
  sendAuthEmail: vi.fn(),
  resendSend: vi.fn(),
  assessBanEvasion: vi.fn(),
  recordAccessSignals: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    signupTicket: {
      findFirst: routeMocks.recentTicket,
      create: routeMocks.createTicket,
    },
    campaignReferralAttribution: {
      updateMany: routeMocks.attributionUpdateMany,
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: routeMocks.createUser,
      },
    },
  })),
}));

vi.mock("@/lib/auth-email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-email")>();
  return {
    ...actual,
    sendAuthEmail: routeMocks.sendAuthEmail,
  };
});

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: routeMocks.resendSend };
  },
}));

vi.mock("@/lib/ban-evasion/enforcement", () => ({
  assessBanEvasion: routeMocks.assessBanEvasion,
}));

vi.mock("@/lib/ban-evasion/store", () => ({
  recordAccessSignals: routeMocks.recordAccessSignals,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async ({ namespace }: { namespace: string }) => {
    if (namespace === "auth.api") {
      return (key: string) => key;
    }

    const values: Record<string, string> = {
      subject: "legacy subject",
      title: "legacy title",
      body: "legacy body",
      button: "legacy button",
      footer: "legacy footer",
    };
    return (key: string) => values[key] ?? key;
  }),
}));

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.recentTicket.mockResolvedValue(null);
    routeMocks.createUser.mockResolvedValue({
      data: { user: { id: "supabase-user-1" } },
      error: null,
    });
    routeMocks.createTicket.mockResolvedValue({
      id: "ticket-1",
      email: "creator@example.com",
    });
    routeMocks.attributionUpdateMany.mockResolvedValue({ count: 0 });
    routeMocks.sendAuthEmail.mockResolvedValue(undefined);
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "NO_MATCH",
      matches: [],
      observations: [
        {
          type: "IP",
          valueHash: "v1:ip",
          maskedValue: "203.0.113.xxx",
        },
      ],
    });
    routeMocks.recordAccessSignals.mockResolvedValue(undefined);
    routeMocks.resendSend.mockResolvedValue({
      data: { id: "legacy-email" },
      error: null,
    });
  });

  it("sends signup verification through the shared English auth email flow", async () => {
    const response = await POST(
      new Request("https://app.clipprofit.com/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "Creator@Example.com",
          password: "secret123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.sendAuthEmail).toHaveBeenCalledWith({
      kind: "verification",
      locale: "en",
      actionUrl:
        "https://app.clipprofit.com/auth/confirm?ticket=ticket-1",
      to: "creator@example.com",
    });
    expect(routeMocks.resendSend).not.toHaveBeenCalled();
    expect(routeMocks.recordAccessSignals).toHaveBeenCalledWith({
      supabaseId: "supabase-user-1",
      source: "signup",
      observations: [
        {
          type: "IP",
          valueHash: "v1:ip",
          maskedValue: "203.0.113.xxx",
        },
      ],
    });
  });

  it("blocks a matched signup before creating a Supabase user", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
      matches: [{ id: "private-indicator" }],
      observations: [],
    });

    const response = await POST(
      new Request("https://app.clipprofit.com/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "creator@example.com",
          password: "secret123",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Access unavailable.",
    });
    expect(routeMocks.createUser).not.toHaveBeenCalled();
  });

  it("requests a Turnstile challenge for an IP-only match", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "CHALLENGE",
      observedDecision: "CHALLENGE",
      reasonCode: "IP_REQUIRES_CHALLENGE",
      matches: [{ id: "private-indicator" }],
      observations: [],
    });

    const response = await POST(
      new Request("https://app.clipprofit.com/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "creator@example.com",
          password: "secret123",
        }),
      }),
    );

    expect(response.status).toBe(428);
    await expect(response.json()).resolves.toEqual({
      challengeRequired: true,
      siteKey: "site-key",
    });
  });
});
