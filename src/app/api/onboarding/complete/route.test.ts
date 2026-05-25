import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateSupabaseUser: vi.fn(),
  userFindUnique: vi.fn(),
  userUpsert: vi.fn(),
  profileFindUnique: vi.fn(),
  profileCreate: vi.fn(),
  profileUpdate: vi.fn(),
  attributionFindUnique: vi.fn(),
  attributionFindFirst: vi.fn(),
  attributionUpdate: vi.fn(),
  attributionUpdateMany: vi.fn(),
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
      upsert: routeMocks.userUpsert,
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

function request(body: unknown) {
  return new Request("https://app.test/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/onboarding/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "supabase-user-1",
          email: "new@example.com",
          app_metadata: { provider: "discord" },
          user_metadata: {
            provider_id: "discord-1",
            full_name: "New Clipper",
          },
        },
      },
    });
    routeMocks.userFindUnique.mockResolvedValue(null);
    routeMocks.userUpsert.mockResolvedValue({
      id: "user-1",
      creatorProfile: null,
    });
    routeMocks.profileFindUnique.mockResolvedValue(null);
    routeMocks.profileCreate.mockResolvedValue({});
    routeMocks.profileUpdate.mockResolvedValue({});
    routeMocks.attributionFindFirst.mockResolvedValue(null);
    routeMocks.attributionUpdate.mockResolvedValue({});
    routeMocks.attributionUpdateMany.mockResolvedValue({ count: 1 });
    routeMocks.updateSupabaseUser.mockResolvedValue({});
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
    expect(routeMocks.userUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.not.objectContaining({
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
});
