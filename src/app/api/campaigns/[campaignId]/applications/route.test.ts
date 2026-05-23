import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  campaignFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  applicationFindFirst: vi.fn(),
  applicationCreate: vi.fn(),
  notificationCreate: vi.fn(),
  getSocialAccountSummariesForProfile: vi.fn(),
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

vi.mock("@/lib/social-account-summary", () => ({
  getSocialAccountSummariesForProfile: routeMocks.getSocialAccountSummariesForProfile,
}));

const params = { params: Promise.resolve({ campaignId: "campaign-1" }) };

function socialAccounts(connections: {
  igConnections?: Array<{ isVerified: boolean }>;
  ttConnections?: Array<{ isVerified: boolean }>;
  ytConnections?: Array<{ isVerified: boolean }>;
  fbConnections?: Array<{ isVerified: boolean }>;
}) {
  const map = (rows: Array<{ isVerified: boolean }> | undefined, audienceCount = 1200) =>
    (rows ?? []).map((row, index) => ({
      id: `connection-${index}`,
      isVerified: row.isVerified,
      audienceCount,
    }));
  return {
    ig: map(connections.igConnections),
    tt: map(connections.ttConnections),
    yt: map(connections.ytConnections),
    fb: map(connections.fbConnections),
  };
}

describe("POST /api/campaigns/[campaignId]/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "creator-supabase-1" });
    routeMocks.campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      createdByUserId: "admin-user-1",
      platforms: ["TIKTOK"],
      status: "active",
      deadline: new Date("2026-06-17T00:00:00.000Z"),
    });
    routeMocks.userFindUnique.mockResolvedValue({
      id: "creator-user-1",
      creatorProfile: {
        id: "creator-profile-1",
        isVerified: false,
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
    routeMocks.getSocialAccountSummariesForProfile.mockResolvedValue(
      socialAccounts({
        igConnections: [],
        ttConnections: [{ isVerified: true }],
        ytConnections: [],
        fbConnections: [],
      }),
    );
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

  it.each([
    [
      "Instagram",
      "INSTAGRAM",
      {
        igConnections: [{ isVerified: true }],
        ttConnections: [],
        ytConnections: [],
        fbConnections: [],
      },
    ],
    [
      "TikTok",
      "TIKTOK",
      {
        igConnections: [],
        ttConnections: [{ isVerified: true }],
        ytConnections: [],
        fbConnections: [],
      },
    ],
    [
      "YouTube",
      "YOUTUBE_SHORTS",
      {
        igConnections: [],
        ttConnections: [],
        ytConnections: [{ isVerified: true }],
        fbConnections: [],
      },
    ],
    [
      "Facebook",
      "FACEBOOK",
      {
        igConnections: [],
        ttConnections: [],
        ytConnections: [],
        fbConnections: [{ isVerified: true }],
      },
    ],
  ])(
    "allows a %s verified connection to join when the creator profile is not profile-verified",
    async (_label, platform, connections) => {
      routeMocks.campaignFindUnique.mockResolvedValueOnce({
        id: "campaign-1",
        createdByUserId: "admin-user-1",
        platforms: [platform],
        status: "active",
        deadline: new Date("2026-06-17T00:00:00.000Z"),
      });
      routeMocks.userFindUnique.mockResolvedValueOnce({
        id: "creator-user-1",
        creatorProfile: {
          id: "creator-profile-1",
          isVerified: false,
          displayName: "Creator",
          totalFollowers: 1200,
          engagementRate: 3.2,
          ...connections,
        },
      });
      routeMocks.getSocialAccountSummariesForProfile.mockResolvedValueOnce(
        socialAccounts(connections),
      );

      const response = await POST(
        new Request("https://app.test/api/campaigns/campaign-1/applications", {
          method: "POST",
        }) as never,
        params,
      );

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({
        id: "application-1",
        application: {
          id: "application-1",
          status: "pending",
        },
      });
      expect(routeMocks.applicationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campaignId: "campaign-1",
            creatorProfileId: "creator-profile-1",
          }),
        }),
      );
    },
  );

  it("returns a structured connect-required response when no matching platform is verified", async () => {
    routeMocks.campaignFindUnique.mockResolvedValueOnce({
      id: "campaign-1",
      createdByUserId: "admin-user-1",
      platforms: ["YOUTUBE_SHORTS"],
      status: "active",
      deadline: new Date("2026-06-17T00:00:00.000Z"),
    });

    const response = await POST(
      new Request("https://app.test/api/campaigns/campaign-1/applications", {
        method: "POST",
      }) as never,
      params,
    );

    const body = await response.json();
    expect(body).toEqual({
      code: "CONNECT_REQUIRED",
      error: "Connect your YouTube account to join this campaign.",
      missingPlatforms: ["YOUTUBE_SHORTS"],
      requiredPlatformLabels: ["YouTube"],
    });
    expect(body.error).not.toMatch(/bio/i);
    expect(body.error).not.toBe("Creator bio must be verified first");
    expect(response.status).toBe(400);
    expect(routeMocks.applicationCreate).not.toHaveBeenCalled();
  });

  it("rejects applying after a campaign deadline has passed", async () => {
    routeMocks.campaignFindUnique.mockResolvedValueOnce({
      id: "campaign-1",
      createdByUserId: "admin-user-1",
      platforms: ["TIKTOK"],
      status: "active",
      deadline: new Date("2020-01-01T00:00:00.000Z"),
    });

    const response = await POST(
      new Request("https://app.test/api/campaigns/campaign-1/applications", {
        method: "POST",
      }) as never,
      params,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This campaign has ended and no longer accepts submissions.",
    });
    expect(routeMocks.userFindUnique).not.toHaveBeenCalled();
    expect(routeMocks.applicationCreate).not.toHaveBeenCalled();
  });

  it("returns a paused message for paused campaigns", async () => {
    routeMocks.campaignFindUnique.mockResolvedValueOnce({
      id: "campaign-1",
      createdByUserId: "admin-user-1",
      platforms: ["TIKTOK"],
      status: "paused",
      deadline: new Date("2026-06-17T00:00:00.000Z"),
    });

    const response = await POST(
      new Request("https://app.test/api/campaigns/campaign-1/applications", {
        method: "POST",
      }) as never,
      params,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This campaign is paused and temporarily does not accept submissions.",
    });
    expect(routeMocks.userFindUnique).not.toHaveBeenCalled();
    expect(routeMocks.applicationCreate).not.toHaveBeenCalled();
  });
});
