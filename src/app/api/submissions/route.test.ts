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
});
