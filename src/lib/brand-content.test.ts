import { describe, expect, it } from "vitest";
import { buildBrandContentPage } from "@/lib/brand-content";

const submissions = [
  {
    id: "approved-old",
    status: "APPROVED",
    postUrl: "https://www.tiktok.com/@fruit/video/1",
    thumbnailUrl: "https://example.com/1.jpg",
    normalizedPlatform: "TIKTOK",
    sourcePlatform: null,
    authorHandle: "fruit",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    viewCount: 1000,
    claimedViews: 900,
    eligibleViews: 800,
    likeCount: 20,
    commentCount: 5,
    shareCount: 2,
    metricSnapshots: [{
      capturedAt: new Date("2026-05-03T10:00:00.000Z"),
      viewCount: BigInt(2500),
      likeCount: 100,
      commentCount: 25,
      shareCount: 10,
    }],
  },
  {
    id: "approved-new",
    status: "APPROVED",
    postUrl: "https://www.instagram.com/reel/2",
    thumbnailUrl: null,
    normalizedPlatform: "INSTAGRAM",
    sourcePlatform: null,
    authorHandle: "@bramsfruit",
    createdAt: new Date("2026-05-05T10:00:00.000Z"),
    viewCount: 4000,
    claimedViews: 0,
    eligibleViews: null,
    likeCount: 200,
    commentCount: 50,
    shareCount: 25,
    metricSnapshots: [],
  },
  {
    id: "rejected",
    status: "REJECTED",
    postUrl: "https://www.tiktok.com/@hidden/video/3",
    thumbnailUrl: null,
    normalizedPlatform: "TIKTOK",
    sourcePlatform: null,
    authorHandle: "@hidden",
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    viewCount: 999999,
    claimedViews: 0,
    eligibleViews: null,
    likeCount: 1,
    commentCount: 1,
    shareCount: 1,
    metricSnapshots: [],
  },
];

describe("brand content projection", () => {
  it("returns approved clips only with public account and current metrics", () => {
    const page = buildBrandContentPage(submissions, {
      platform: "all",
      sort: "recent",
      page: 1,
      pageSize: 24,
    });

    expect(page.total).toBe(2);
    expect(page.items.map((item) => item.id)).toEqual(["approved-new", "approved-old"]);
    expect(page.items[1]).toEqual({
      id: "approved-old",
      platform: "TikTok",
      postUrl: "https://www.tiktok.com/@fruit/video/1",
      thumbnailUrl: "https://example.com/1.jpg",
      publicAccount: "@fruit",
      submittedAt: "2026-05-01T10:00:00.000Z",
      views: 2500,
      engagement: 135,
    });
  });

  it("filters by platform, sorts by views or engagement, and paginates", () => {
    expect(buildBrandContentPage(submissions, {
      platform: "TikTok",
      sort: "views",
      page: 1,
      pageSize: 1,
    })).toEqual(expect.objectContaining({
      total: 1,
      page: 1,
      totalPages: 1,
      items: [expect.objectContaining({ id: "approved-old" })],
    }));

    expect(buildBrandContentPage(submissions, {
      platform: "all",
      sort: "engagement",
      page: 1,
      pageSize: 1,
    })).toEqual(expect.objectContaining({
      total: 2,
      page: 1,
      totalPages: 2,
      items: [expect.objectContaining({ id: "approved-new", engagement: 275 })],
    }));
  });

  it("normalizes invalid filters and out-of-range pages", () => {
    const page = buildBrandContentPage(submissions, {
      platform: "not-a-platform",
      sort: "not-a-sort",
      page: 99,
      pageSize: 1,
    });

    expect(page.platform).toBe("all");
    expect(page.sort).toBe("recent");
    expect(page.page).toBe(2);
    expect(page.items).toHaveLength(1);
  });
});
