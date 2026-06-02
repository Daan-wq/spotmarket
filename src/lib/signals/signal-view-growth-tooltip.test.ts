import { describe, expect, it } from "vitest";
import { metricAvailability } from "@/lib/contracts/metrics";
import { computeSignalViewGrowthBuckets } from "./signal-view-growth-tooltip";

function snap(
  minute: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    capturedAt: new Date(2026, 5, 3, 12, minute),
    source: "OAUTH_IG",
    viewCount: 1_000,
    likeCount: 10,
    commentCount: 2,
    shareCount: 1,
    saveCount: 0,
    metricAvailability: metricAvailability({
      views: true,
      likes: true,
      comments: true,
      shares: true,
      saves: true,
    }),
    ...overrides,
  };
}

describe("computeSignalViewGrowthBuckets", () => {
  it("computes view, engagement breakdown, and engagement quality deltas", () => {
    const buckets = computeSignalViewGrowthBuckets(
      [
        snap(0),
        snap(15, {
          viewCount: 3_580,
          likeCount: 20,
          commentCount: 5,
          shareCount: 3,
          saveCount: 1,
        }),
      ],
      "15m",
    );

    expect(buckets).toHaveLength(1);
    expect(buckets[0].views).toBe(2_580);
    expect(buckets[0].totalViews).toBe(3_580);
    expect(buckets[0].deltas).toMatchObject({
      likes: 10,
      comments: 3,
      shares: 2,
      saves: 1,
    });
    expect(buckets[0].engagementTotal).toBe(16);
    expect(buckets[0].engagementPerThousandViews).toBeCloseTo(6.202, 3);
  });

  it("shows TikTok watch time, saves, and reach as unavailable instead of zero", () => {
    const availability = metricAvailability({
      views: true,
      likes: true,
      comments: true,
      shares: true,
      saves: false,
      watchTime: false,
      reach: false,
    });

    const buckets = computeSignalViewGrowthBuckets(
      [
        snap(0, { source: "OAUTH_TT", metricAvailability: availability }),
        snap(15, {
          source: "OAUTH_TT",
          viewCount: 3_000,
          likeCount: 14,
          commentCount: 4,
          shareCount: 3,
          metricAvailability: availability,
        }),
      ],
      "15m",
    );

    expect(buckets[0].watchTime.unavailable).toBe(true);
    expect(buckets[0].deltas.saves).toBeNull();
    expect(buckets[0].deltas.reach).toBeNull();
    expect(buckets[0].unavailable).toEqual(expect.arrayContaining(["watchTime", "saves", "reach"]));
  });

  it("computes total watch time delta only when watch time is cumulative", () => {
    const availability = metricAvailability({ views: true, watchTime: true });
    const buckets = computeSignalViewGrowthBuckets(
      [
        snap(0, {
          source: "OAUTH_FB",
          watchTimeSec: 120,
          raw: { reel: { viewTime: 120_000 } },
          metricAvailability: availability,
        }),
        snap(15, {
          source: "OAUTH_FB",
          viewCount: 2_000,
          watchTimeSec: 300,
          raw: { reel: { viewTime: 300_000 } },
          metricAvailability: availability,
        }),
      ],
      "15m",
    );

    expect(buckets[0].watchTime.deltaSec).toBe(180);
    expect(buckets[0].watchTime.averageSec).toBeNull();
    expect(buckets[0].watchTime.unknownKind).toBe(false);
  });

  it("keeps average watch time separate from cumulative watch time deltas", () => {
    const availability = metricAvailability({ views: true, watchTime: true });
    const buckets = computeSignalViewGrowthBuckets(
      [
        snap(0, {
          source: "OAUTH_FB",
          watchTimeSec: 12,
          raw: { reel: { avgTimeWatched: 12_000 } },
          metricAvailability: availability,
        }),
        snap(15, {
          source: "OAUTH_FB",
          viewCount: 2_000,
          watchTimeSec: 18,
          raw: { reel: { avgTimeWatched: 18_000 } },
          metricAvailability: availability,
        }),
      ],
      "15m",
    );

    expect(buckets[0].watchTime.deltaSec).toBeNull();
    expect(buckets[0].watchTime.averageSec).toBe(18);
  });

  it("marks legacy watch time with unknown kind instead of inventing a delta", () => {
    const availability = metricAvailability({ views: true, watchTime: true });
    const buckets = computeSignalViewGrowthBuckets(
      [
        snap(0, { watchTimeSec: 100, metricAvailability: availability }),
        snap(15, {
          viewCount: 2_000,
          watchTimeSec: 220,
          metricAvailability: availability,
        }),
      ],
      "15m",
    );

    expect(buckets[0].watchTime.deltaSec).toBeNull();
    expect(buckets[0].watchTime.unknownKind).toBe(true);
  });
});
