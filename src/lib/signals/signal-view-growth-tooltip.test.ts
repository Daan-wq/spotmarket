import { describe, expect, it } from "vitest";
import { metricAvailability } from "@/lib/contracts/metrics";
import {
  computeSignalViewGrowthBuckets,
  computeSignalViewGrowthTimeline,
} from "./signal-view-growth-tooltip";

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
  it("reconciles the first measured total plus bucket growth to the latest totals", () => {
    const timeline = computeSignalViewGrowthTimeline(
      [
        snap(0, {
          viewCount: 9,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          saveCount: 0,
        }),
        snap(15, {
          viewCount: 7_158,
          likeCount: 120,
          commentCount: 12,
          shareCount: 8,
          saveCount: 2,
        }),
        snap(30, {
          viewCount: 112_344,
          likeCount: 1_800,
          commentCount: 150,
          shareCount: 100,
          saveCount: 35,
        }),
      ],
      "15m",
    );

    expect(timeline.initial?.views).toBe(9);
    expect(timeline.initial?.engagementTotal).toBe(0);
    expect(timeline.measuredGrowthViews).toBe(112_335);
    expect(timeline.measuredGrowthEngagements).toBe(2_085);
    expect(timeline.totalViews).toBe(112_344);
    expect(timeline.totalEngagements).toBe(2_085);
  });

  it("keeps a large first measurement out of the visible growth buckets", () => {
    const timeline = computeSignalViewGrowthTimeline(
      [
        snap(0, { viewCount: 80_000, likeCount: 400 }),
        snap(15, { viewCount: 90_000, likeCount: 460 }),
        snap(30, { viewCount: 112_344, likeCount: 542 }),
      ],
      "1d",
    );

    expect(timeline.initial?.views).toBe(80_000);
    expect(timeline.buckets).toHaveLength(1);
    expect(timeline.buckets[0].views).toBe(32_344);
    expect(timeline.totalViews).toBe(112_344);
  });

  it("ignores failed snapshots and reset-like lower view counts", () => {
    const timeline = computeSignalViewGrowthTimeline(
      [
        snap(0, { viewCount: 1_000 }),
        snap(15, { viewCount: 0, source: "OAUTH_FAILED" }),
        snap(30, { viewCount: 900 }),
        snap(45, { viewCount: 1_100 }),
      ],
      "15m",
    );

    expect(timeline.initial?.views).toBe(1_000);
    expect(timeline.measuredGrowthViews).toBe(100);
    expect(Math.max(...timeline.buckets.map((bucket) => bucket.views))).toBe(100);
  });

  it("does not show negative engagement deltas as growth", () => {
    const buckets = computeSignalViewGrowthBuckets(
      [
        snap(0, { likeCount: 20, commentCount: 5, shareCount: 3, saveCount: 2 }),
        snap(15, {
          viewCount: 1_100,
          likeCount: 18,
          commentCount: 4,
          shareCount: 3,
          saveCount: 1,
        }),
      ],
      "15m",
    );

    expect(buckets[0].engagementTotal).toBe(0);
    expect(buckets[0].deltas.likes).toBe(0);
    expect(buckets[0].deltas.comments).toBe(0);
    expect(buckets[0].deltas.saves).toBe(0);
  });

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
