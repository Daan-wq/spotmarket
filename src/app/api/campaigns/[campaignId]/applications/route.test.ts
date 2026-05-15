import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  campaignFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  applicationFindFirst: vi.fn(),
  applicationCreate: vi.fn(),
  notificationCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: routeMocks.campaignFindUnique },
    user: { findUnique: routeMocks.userFindUnique },
    campaignApplication: {
      findFirst: routeMocks.applicationFindFirst,
      create: routeMocks.applicationCreate,
    },
    notification: { create: routeMocks.notificationCreate },
  },
}));

const params = { params: Promise.resolve({ campaignId: "campaign-1" }) };

describe("POST /api/campaigns/[campaignId]/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "creator-supabase-1" });
    routeMocks.campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      createdByUserId: "admin-user-1",
      platforms: ["TIKTOK"],
    });
    routeMocks.userFindUnique.mockResolvedValue({
      id: "creator-user-1",
      creatorProfile: {
        id: "creator-profile-1",
        displayName: "Creator",
        totalFollowers: 1200,
        engagementRate: 3.2,
        igConnections: [],
        ttConnections: [{ isVerified: true }],
        ytConnections: [],
        fbConnections: [],
      },
    });
    routeMocks.applicationFindFirst.mockResolvedValue(null);
    routeMocks.applicationCreate.mockResolvedValue({
      id: "application-1",
      status: "pending",
    });
    routeMocks.notificationCreate.mockResolvedValue({});
  });

  it("allows a TikTok-only creator to join a TikTok campaign without Instagram", async () => {
    const response = await POST(
      new Request("https://app.test/api/campaigns/campaign-1/applications", {
        method: "POST",
      }) as never,
      params,
    );

    await expect(response.json()).resolves.toEqual({
      id: "application-1",
      application: {
        id: "application-1",
        status: "pending",
      },
    });
    expect(response.status).toBe(201);
    expect(routeMocks.applicationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          campaignId: "campaign-1",
          creatorProfileId: "creator-profile-1",
        }),
      }),
    );
  });

  it("returns a structured connect-required response when no matching platform is verified", async () => {
    routeMocks.campaignFindUnique.mockResolvedValueOnce({
      id: "campaign-1",
      createdByUserId: "admin-user-1",
      platforms: ["YOUTUBE_SHORTS"],
    });

    const response = await POST(
      new Request("https://app.test/api/campaigns/campaign-1/applications", {
        method: "POST",
      }) as never,
      params,
    );

    await expect(response.json()).resolves.toEqual({
      code: "CONNECT_REQUIRED",
      error: "Connect your YouTube account to join this campaign.",
      missingPlatforms: ["YOUTUBE_SHORTS"],
      requiredPlatformLabels: ["YouTube"],
    });
    expect(response.status).toBe(400);
    expect(routeMocks.applicationCreate).not.toHaveBeenCalled();
  });
});
