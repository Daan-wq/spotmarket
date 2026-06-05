import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  campaignFindUnique: vi.fn(),
  submissionFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: routeMocks.campaignFindUnique },
    campaignSubmission: { findMany: routeMocks.submissionFindMany },
    user: { findUnique: routeMocks.userFindUnique },
    $queryRaw: routeMocks.queryRaw,
  },
}));

describe("GET /api/campaigns/[campaignId]/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({
      userId: "supabase_creator_8",
      role: "creator",
    });
    routeMocks.userFindUnique.mockResolvedValue({ id: "creator_8" });
    routeMocks.campaignFindUnique.mockResolvedValue({
      id: "campaign_1",
      name: "Campaign",
      creatorCpv: 0,
      minimumPaidViews: 0,
      maximumPaidViews: null,
    });
    routeMocks.queryRaw.mockResolvedValue([]);
    routeMocks.submissionFindMany.mockResolvedValue(
      Array.from({ length: 8 }, (_, index) =>
        submission({
          creatorId: `creator_${index + 1}`,
          viewCount: 8_000 - index * 1_000,
        }),
      ),
    );
  });

  it("queries approved submissions with failed metric snapshots excluded", async () => {
    await GET(
      new NextRequest(
        "https://app.test/api/campaigns/campaign_1/leaderboard?sort=views",
      ),
      { params: Promise.resolve({ campaignId: "campaign_1" }) },
    );

    expect(routeMocks.submissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: "campaign_1", status: "APPROVED" },
        select: expect.objectContaining({
          metricSnapshots: expect.objectContaining({
            where: { source: { not: "OAUTH_FAILED" } },
            orderBy: { capturedAt: "desc" },
            take: 1,
          }),
        }),
      }),
    );
  });

  it("returns the top five and the current creator's true position", async () => {
    const response = await GET(
      new NextRequest(
        "https://app.test/api/campaigns/campaign_1/leaderboard?sort=views",
      ),
      { params: Promise.resolve({ campaignId: "campaign_1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        leaderboard: [
          expect.objectContaining({ creatorId: "creator_1", rank: 1 }),
          expect.objectContaining({ creatorId: "creator_2", rank: 2 }),
          expect.objectContaining({ creatorId: "creator_3", rank: 3 }),
          expect.objectContaining({ creatorId: "creator_4", rank: 4 }),
          expect.objectContaining({ creatorId: "creator_5", rank: 5 }),
        ],
        currentUserEntry: expect.objectContaining({
          creatorId: "creator_8",
          rank: 8,
        }),
        totalClippers: 8,
      }),
    );
  });
});

function submission({
  creatorId,
  viewCount,
}: {
  creatorId: string;
  viewCount: number;
}) {
  return {
    id: `submission_${creatorId}`,
    postUrl: `https://example.com/${creatorId}`,
    viewCount,
    claimedViews: 0,
    eligibleViews: viewCount,
    baselineViews: 0,
    earnedAmount: viewCount / 1_000,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    creatorId,
    metricSnapshots: [
      {
        source: "OAUTH_TT",
        viewCount: BigInt(viewCount),
        capturedAt: new Date("2026-06-05T00:00:00.000Z"),
      },
    ],
    creator: {
      id: creatorId,
      email: `${creatorId}@example.com`,
      discordUsername: creatorId,
      creatorProfile: {
        id: `profile_${creatorId}`,
        username: creatorId,
        avatarUrl: null,
      },
    },
  };
}
