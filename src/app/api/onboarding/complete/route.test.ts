import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateSupabaseUser: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  profileFindUnique: vi.fn(),
  profileCreate: vi.fn(),
  profileUpdate: vi.fn(),
  attributionFindUnique: vi.fn(),
  attributionFindFirst: vi.fn(),
  attributionUpdate: vi.fn(),
  attributionUpdateMany: vi.fn(),
  assessBanEvasion: vi.fn(),
  recordAccessSignals: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: routeMocks.getUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        updateUserById: routeMocks.updateSupabaseUser,
      },
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: routeMocks.userFindUnique,
      create: routeMocks.userCreate,
      update: routeMocks.userUpdate,
    },
    creatorProfile: {
      findUnique: routeMocks.profileFindUnique,
      create: routeMocks.profileCreate,
      update: routeMocks.profileUpdate,
    },
    campaignReferralAttribution: {
      findUnique: routeMocks.attributionFindUnique,
      findFirst: routeMocks.attributionFindFirst,
      update: routeMocks.attributionUpdate,
      updateMany: routeMocks.attributionUpdateMany,
    },
  },
}));

vi.mock("@/lib/ban-evasion/enforcement", () => ({
  assessBanEvasion: routeMocks.assessBanEvasion,
}));

vi.mock("@/lib/ban-evasion/store", () => ({
  recordAccessSignals: routeMocks.recordAccessSignals,
}));

function request(body: unknown) {
  return new Request("https://app.test/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "supabase-user-1",
    email: "new@example.com",
    app_metadata: { provider: "discord" },
    user_metadata: {
      provider_id: "discord-1",
      full_name: "New Clipper",
    },
    ...overrides,
  };
}

function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    supabaseId: "supabase-user-1",
    email: "new@example.com",
    role: "creator",
    discordId: "discord-1",
    discordUsername: "New Clipper",
    creatorProfile: null,
    ...overrides,
  };
}

function mockNoExistingUsers() {
  routeMocks.userFindUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) => {
    if (where.referralCode) return null;
    return null;
  });
}

describe("POST /api/onboarding/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getUser.mockResolvedValue({ data: { user: authUser() } });
    mockNoExistingUsers();
    routeMocks.userCreate.mockResolvedValue(dbUser());
    routeMocks.userUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...dbUser(),
      ...data,
    }));
    routeMocks.profileFindUnique.mockResolvedValue(null);
    routeMocks.profileCreate.mockResolvedValue({});
    routeMocks.profileUpdate.mockResolvedValue({});
    routeMocks.attributionFindUnique.mockResolvedValue(null);
    routeMocks.attributionFindFirst.mockResolvedValue(null);
    routeMocks.attributionUpdate.mockResolvedValue({});
    routeMocks.attributionUpdateMany.mockResolvedValue({ count: 1 });
    routeMocks.updateSupabaseUser.mockResolvedValue({});
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
  });

  it("attaches campaign attribution without setting cash referredBy", async () => {
    routeMocks.attributionFindUnique.mockResolvedValue({
      id: "attribution-1",
      campaignId: "campaign-1",
      referrerId: "referrer-1",
      referralCode: "QUBGZDF-",
      referredUserId: null,
      campaign: { slug: "clipprofit", name: "ClipProfit" },
      referrer: {
        role: "creator",
        email: "referrer@example.com",
        supabaseId: "referrer-supabase-1",
      },
    });

    const response = await POST(
      request({
        displayName: "New Clipper",
        referralCode: "QUBGZDF-",
        campaignSlug: "clipprofit",
        campaignClickId: "click-1",
        role: "creator",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      firstClipNextHref: "/creator/connections?firstClip=1",
      firstClipNextStep: "connect_account",
    });
    expect(routeMocks.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          referredBy: expect.any(String),
        }),
      }),
    );
    expect(routeMocks.attributionUpdate).toHaveBeenCalledWith({
      where: { id: "attribution-1" },
      data: { referredUserId: "user-1" },
    });
    expect(routeMocks.attributionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "attribution-1", onboardedAt: null },
      }),
    );
  });

  it("claims a stale Discord user instead of creating a duplicate", async () => {
    const staleUser = dbUser({
      id: "user-stale",
      supabaseId: "old-supabase-user",
      discordUsername: "Old Name",
      creatorProfile: {
        userId: "user-stale",
        username: "existing",
        displayName: "Existing Clipper",
      },
    });
    routeMocks.userFindUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) => {
      if (where.referralCode) return null;
      if (where.discordId === "discord-1") return staleUser;
      return null;
    });
    routeMocks.userUpdate.mockResolvedValue({
      ...staleUser,
      supabaseId: "supabase-user-1",
      discordUsername: "New Clipper",
    });

    const response = await POST(request({ displayName: "New Clipper", role: "creator" }));

    expect(response.status).toBe(200);
    expect(routeMocks.userCreate).not.toHaveBeenCalled();
    expect(routeMocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-stale" },
        data: expect.objectContaining({
          supabaseId: "supabase-user-1",
          discordUsername: "New Clipper",
        }),
      }),
    );
    expect(routeMocks.profileCreate).not.toHaveBeenCalled();
    expect(routeMocks.profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-stale" },
      }),
    );
  });

  it("creates a new user when no identity match exists", async () => {
    const response = await POST(request({ displayName: "New Clipper", role: "creator" }));

    expect(response.status).toBe(200);
    expect(routeMocks.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supabaseId: "supabase-user-1",
          email: "new@example.com",
          discordId: "discord-1",
        }),
      }),
    );
    expect(routeMocks.profileCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          displayName: "New Clipper",
        }),
      }),
    );
  });

  it("returns a friendly conflict instead of a raw Prisma unique error", async () => {
    routeMocks.userFindUnique.mockImplementation(async ({ where }: { where: Record<string, string> }) => {
      if (where.referralCode) return null;
      if (where.discordId === "discord-1") {
        return dbUser({ id: "discord-user", email: "other@example.com", supabaseId: "old-supabase" });
      }
      if (where.email === "new@example.com") {
        return dbUser({ id: "email-user", discordId: null, supabaseId: "email-supabase" });
      }
      return null;
    });

    const response = await POST(request({ displayName: "New Clipper", role: "creator" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Dit Discord-account is al gekoppeld aan een ander ClipProfit-account.",
    });
    expect(routeMocks.userCreate).not.toHaveBeenCalled();
  });

  it("blocks onboarding before creating a duplicate creator identity", async () => {
    routeMocks.assessBanEvasion.mockResolvedValue({
      decision: "BLOCK",
      observedDecision: "BLOCK",
      reasonCode: "STRONG_INDICATOR",
      matches: [{ id: "private-indicator" }],
      observations: [],
    });

    const response = await POST(
      request({ displayName: "Blocked Clipper", role: "creator" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Access unavailable.",
    });
    expect(routeMocks.userCreate).not.toHaveBeenCalled();
    expect(routeMocks.profileCreate).not.toHaveBeenCalled();
  });
});
