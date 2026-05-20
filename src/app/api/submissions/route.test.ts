import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  applicationFindUnique: vi.fn(),
  submissionCreate: vi.fn(),
  findDuplicate: vi.fn(),
  publishEvent: vi.fn(),
  resolveInstagramThumbnail: vi.fn(),
  resolveStableSubmissionThumbnail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    campaignSubmission: {
      findMany: vi.fn(),
      create: routeMocks.submissionCreate,
    },
    campaignApplication: {
      findUnique: routeMocks.applicationFindUnique,
    },
  },
}));

vi.mock("@/lib/duplicate-detector", () => ({
  findDuplicate: routeMocks.findDuplicate,
}));

vi.mock("@/lib/event-bus", () => ({
  publishEvent: routeMocks.publishEvent,
}));

vi.mock("@/lib/clip-thumbnail", () => ({
  resolveInstagramThumbnail: routeMocks.resolveInstagramThumbnail,
  resolveStableSubmissionThumbnail: routeMocks.resolveStableSubmissionThumbnail,
}));

function request(body: unknown) {
  return new Request("https://app.test/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

describe("POST /api/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "creator-supabase-1" });
    routeMocks.userFindUnique.mockResolvedValue({
      id: "creator-user-1",
      creatorProfile: {
        id: "creator-profile-1",
        igConnections: [{ igUsername: "creator", accessToken: "token" }],
        ttConnections: [],
        fbConnections: [],
        ytConnections: [],
      },
    });
    routeMocks.findDuplicate.mockResolvedValue(null);
    routeMocks.resolveInstagramThumbnail.mockResolvedValue(null);
    routeMocks.resolveStableSubmissionThumbnail.mockResolvedValue(null);
  });

  test("rejects submissions after an active campaign deadline has passed", async () => {
    routeMocks.applicationFindUnique.mockResolvedValue({
      id: "application-1",
      creatorProfileId: "creator-profile-1",
      campaignId: "campaign-1",
      campaign: {
        status: "active",
        deadline: new Date("2020-01-01T00:00:00.000Z"),
      },
    });

    const response = await POST(
      request({
        applicationId: "application-1",
        postUrl: "https://www.instagram.com/p/ABC123/",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This campaign has ended and no longer accepts submissions.",
    });
    expect(routeMocks.findDuplicate).not.toHaveBeenCalled();
    expect(routeMocks.submissionCreate).not.toHaveBeenCalled();
  });

  test("rejects submissions for non-active campaigns", async () => {
    routeMocks.applicationFindUnique.mockResolvedValue({
      id: "application-1",
      creatorProfileId: "creator-profile-1",
      campaignId: "campaign-1",
      campaign: {
        status: "completed",
        deadline: new Date("2026-06-17T00:00:00.000Z"),
      },
    });

    const response = await POST(
      request({
        applicationId: "application-1",
        postUrl: "https://www.instagram.com/p/ABC123/",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This campaign has ended and no longer accepts submissions.",
    });
    expect(routeMocks.findDuplicate).not.toHaveBeenCalled();
    expect(routeMocks.submissionCreate).not.toHaveBeenCalled();
  });

  test("stores a stable cached thumbnail instead of a client-supplied TikTok CDN URL", async () => {
    routeMocks.userFindUnique.mockResolvedValue({
      id: "creator-user-1",
      creatorProfile: {
        id: "creator-profile-1",
        igConnections: [],
        ttConnections: [{ username: "creator", accessToken: "token" }],
        fbConnections: [],
        ytConnections: [],
      },
    });
    routeMocks.applicationFindUnique.mockResolvedValue({
      id: "application-1",
      creatorProfileId: "creator-profile-1",
      campaignId: "campaign-1",
      campaign: {
        status: "active",
        deadline: new Date("2026-06-17T00:00:00.000Z"),
      },
    });
    routeMocks.resolveStableSubmissionThumbnail.mockResolvedValue({
      thumbnailUrl:
        "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/7123456789012345678.jpg",
      mediaType: "video",
    });
    routeMocks.submissionCreate.mockResolvedValue({
      id: "submission-1",
      postUrl: "https://www.tiktok.com/@creator/video/7123456789012345678",
      status: "PENDING",
      createdAt: new Date("2026-05-20T10:00:00.000Z"),
      applicationId: "application-1",
      campaignId: "campaign-1",
      sourcePlatform: "TIKTOK",
      sourceMethod: "OAUTH",
      logoStatus: "PENDING",
    });

    const response = await POST(
      request({
        applicationId: "application-1",
        postUrl: "https://www.tiktok.com/@creator/video/7123456789012345678",
        thumbnailUrl: "https://p16-sign.tiktokcdn-us.com/stale.jpg?x-expires=1",
        mediaType: "video",
      }),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.resolveStableSubmissionThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        postUrl: "https://www.tiktok.com/@creator/video/7123456789012345678",
        creatorId: "creator-user-1",
        candidateThumbnailUrl: "https://p16-sign.tiktokcdn-us.com/stale.jpg?x-expires=1",
        candidateMediaType: "video",
      }),
    );
    expect(routeMocks.submissionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          thumbnailUrl:
            "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/7123456789012345678.jpg",
          mediaType: "video",
        }),
      }),
    );
  });
});
