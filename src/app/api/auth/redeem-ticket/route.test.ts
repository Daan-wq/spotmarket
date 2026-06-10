import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  ticketFindUnique: vi.fn(),
  ticketUpdate: vi.fn(),
  listUsers: vi.fn(),
  updateUserById: vi.fn(),
  generateLink: vi.fn(),
  verifyOtp: vi.fn(),
  assessBanEvasion: vi.fn(),
  recordAccessSignals: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    signupTicket: {
      findUnique: routeMocks.ticketFindUnique,
      update: routeMocks.ticketUpdate,
    },
    campaignReferralAttribution: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: routeMocks.listUsers,
        updateUserById: routeMocks.updateUserById,
        generateLink: routeMocks.generateLink,
      },
    },
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { verifyOtp: routeMocks.verifyOtp },
  })),
}));

vi.mock("@/lib/ban-evasion/enforcement", () => ({
  assessBanEvasion: routeMocks.assessBanEvasion,
}));

vi.mock("@/lib/ban-evasion/store", () => ({
  recordAccessSignals: routeMocks.recordAccessSignals,
}));

function request(body: unknown = { ticketId: "ticket-1" }) {
  return new Request("https://app.clipprofit.com/api/auth/redeem-ticket", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/redeem-ticket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    routeMocks.ticketFindUnique.mockResolvedValue({
      id: "ticket-1",
      email: "creator@example.com",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      ref: null,
      campaignSlug: null,
      clickId: null,
    });
    routeMocks.ticketUpdate.mockResolvedValue({});
    routeMocks.listUsers.mockResolvedValue({
      data: {
        users: [{ id: "supabase-1", email: "creator@example.com" }],
      },
    });
    routeMocks.updateUserById.mockResolvedValue({});
    routeMocks.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: "hashed-token" } },
      error: null,
    });
    routeMocks.verifyOtp.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
      },
      error: null,
    });
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "ALLOW",
      observedDecision: "ALLOW",
      reasonCode: "NO_MATCH",
      matches: [],
      observations: [],
    });
    routeMocks.recordAccessSignals.mockResolvedValue(undefined);
  });

  it("checks ban evasion before confirming the user", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(routeMocks.assessBanEvasion).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectRole: "creator",
        supabaseId: "supabase-1",
      }),
    );
    expect(routeMocks.updateUserById).toHaveBeenCalled();
  });

  it("does not consume the ticket when the request is blocked", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
      matches: [{ id: "private-indicator" }],
      observations: [],
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Access unavailable.",
    });
    expect(routeMocks.ticketUpdate).not.toHaveBeenCalled();
    expect(routeMocks.updateUserById).not.toHaveBeenCalled();
  });

  it("requests Turnstile without consuming the ticket", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "CHALLENGE",
      observedDecision: "CHALLENGE",
      reasonCode: "IP_REQUIRES_CHALLENGE",
      matches: [{ id: "private-indicator" }],
      observations: [],
    });

    const response = await POST(request());

    expect(response.status).toBe(428);
    await expect(response.json()).resolves.toEqual({
      challengeRequired: true,
      siteKey: "site-key",
    });
    expect(routeMocks.ticketUpdate).not.toHaveBeenCalled();
  });
});
