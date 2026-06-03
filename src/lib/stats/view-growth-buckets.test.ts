import { describe, expect, it } from "vitest";
import {
  chooseAutoViewGrowthBucketSize,
  computeBucketedViewGrowth,
  computeBucketedViewGrowthTimeline,
  normalizeViewGrowthSnapshots,
  viewsPerHourFromLatestValidPair,
} from "./view-growth-buckets";

function snap(
  capturedAt: Date,
  viewCount: number,
  source = "OAUTH_TT",
  engagementCount: number | null = null,
) {
  return {
    capturedAt,
    viewCount: BigInt(viewCount),
    source,
    engagementCount,
  };
}

function localDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function totalViews(buckets: Array<{ views: number }>) {
  return buckets.reduce((sum, bucket) => sum + bucket.views, 0);
}

describe("computeBucketedViewGrowth", () => {
  it("keeps the first measured total separate so buckets reconcile to the latest total", () => {
    const timeline = computeBucketedViewGrowthTimeline(
      [
        snap(localDate(2026, 5, 25, 0, 0), 9, "OAUTH_TT", 0),
        snap(localDate(2026, 5, 26, 0, 0), 7_158, "OAUTH_TT", 142),
        snap(localDate(2026, 6, 3, 0, 0), 112_344, "OAUTH_TT", 2_085),
      ],
      "1d",
    );

    expect(timeline.initial?.views).toBe(9);
    expect(timeline.initial?.engagements).toBe(0);
    expect(timeline.measuredGrowthViews).toBe(112_335);
    expect(timeline.totalViews).toBe(112_344);
    expect((timeline.initial?.views ?? 0) + totalViews(timeline.buckets)).toBe(112_344);
  });

  it("does not turn a large first measurement into artificial bucket growth", () => {
    const timeline = computeBucketedViewGrowthTimeline(
      [
        snap(localDate(2026, 5, 25, 0, 0), 80_000),
        snap(localDate(2026, 5, 25, 6, 0), 90_000),
        snap(localDate(2026, 5, 25, 12, 0), 112_344),
      ],
      "1d",
    );

    expect(timeline.initial?.views).toBe(80_000);
    expect(timeline.buckets).toHaveLength(1);
    expect(timeline.buckets[0].views).toBe(32_344);
    expect(timeline.totalViews).toBe(112_344);
  });

  it("groups multiple polls on the same calendar day into one daily bucket", () => {
    const buckets = computeBucketedViewGrowth(
      [
        snap(localDate(2026, 5, 29, 0, 0), 1_000, "OAUTH_TT", 10),
        snap(localDate(2026, 5, 29, 3, 0), 1_150, "OAUTH_TT", 16),
        snap(localDate(2026, 5, 29, 9, 0), 1_450, "OAUTH_TT", 29),
        snap(localDate(2026, 5, 29, 16, 0), 1_850, "OAUTH_TT", 41),
        snap(localDate(2026, 5, 29, 23, 45), 2_100, "OAUTH_TT", 55),
      ],
      "1d",
    );

    expect(buckets).toHaveLength(1);
    expect(buckets[0].start).toEqual(localDate(2026, 5, 29));
    expect(buckets[0].end).toEqual(localDate(2026, 5, 30));
    expect(buckets[0].views).toBeCloseTo(1_100, 5);
    expect(buckets[0].engagements).toBe(45);
  });

  it("uses fixed bucket durations for each supported zoom level", () => {
    const snapshots = [
      snap(localDate(2026, 5, 29, 10, 0), 1_000),
      snap(localDate(2026, 5, 29, 11, 0), 1_060),
    ];

    expect(computeBucketedViewGrowth(snapshots, "15m")).toHaveLength(4);
    expect(computeBucketedViewGrowth(snapshots, "15m").map((bucket) => bucket.end.getTime() - bucket.start.getTime())).toEqual([
      15 * 60 * 1000,
      15 * 60 * 1000,
      15 * 60 * 1000,
      15 * 60 * 1000,
    ]);
    expect(computeBucketedViewGrowth(snapshots, "1h").map((bucket) => bucket.end.getTime() - bucket.start.getTime())).toEqual([
      60 * 60 * 1000,
    ]);
    expect(computeBucketedViewGrowth(snapshots, "6h").map((bucket) => bucket.end.getTime() - bucket.start.getTime())).toEqual([
      6 * 60 * 60 * 1000,
    ]);
    expect(computeBucketedViewGrowth(snapshots, "1d").map((bucket) => bucket.end.getTime() - bucket.start.getTime())).toEqual([
      24 * 60 * 60 * 1000,
    ]);
  });

  it("assigns each poll delta to the bucket for the new measurement", () => {
    const buckets = computeBucketedViewGrowth(
      [
        snap(localDate(2026, 5, 29, 10, 30), 1_000),
        snap(localDate(2026, 5, 29, 12, 30), 1_120),
      ],
      "1h",
    );

    expect(buckets.map((bucket) => bucket.views)).toEqual([0, 0, 120]);
    expect(totalViews(buckets)).toBeCloseTo(120, 5);
  });

  it("places exact-boundary poll deltas in the completed bucket", () => {
    const buckets = computeBucketedViewGrowth(
      [
        snap(localDate(2026, 5, 29, 10, 0), 1_000, "OAUTH_TT", 10),
        snap(localDate(2026, 5, 29, 10, 15), 1_040, "OAUTH_TT", 12),
        snap(localDate(2026, 5, 29, 10, 30), 1_100, "OAUTH_TT", 20),
        snap(localDate(2026, 5, 29, 10, 45), 1_125, "OAUTH_TT", 20),
      ],
      "15m",
    );

    expect(buckets.map((bucket) => bucket.views)).toEqual([40, 60, 25]);
    expect(buckets.map((bucket) => bucket.engagements)).toEqual([2, 8, 0]);
  });

  it("keeps engagement unavailable when snapshots do not have engagement counts", () => {
    const buckets = computeBucketedViewGrowth(
      [
        snap(localDate(2026, 5, 29, 10, 0), 1_000),
        snap(localDate(2026, 5, 29, 10, 15), 1_040),
      ],
      "15m",
    );

    expect(buckets[0].engagements).toBeNull();
  });

  it("ignores failed snapshots so rebounds from zero do not create spikes", () => {
    const buckets = computeBucketedViewGrowth(
      [
        snap(localDate(2026, 5, 29, 10, 0), 1_000),
        snap(localDate(2026, 5, 29, 10, 15), 0, "OAUTH_FAILED"),
        snap(localDate(2026, 5, 29, 10, 30), 1_100),
      ],
      "15m",
    );

    expect(totalViews(buckets)).toBeCloseTo(100, 5);
    expect(Math.max(...buckets.map((bucket) => bucket.views))).toBeCloseTo(100, 5);
  });

  it("skips lower non-monotone snapshots and compares later points to the last valid high", () => {
    const normalized = normalizeViewGrowthSnapshots([
      snap(localDate(2026, 5, 29, 10, 0), 1_000),
      snap(localDate(2026, 5, 29, 10, 15), 100),
      snap(localDate(2026, 5, 29, 10, 30), 1_100),
    ]);
    const buckets = computeBucketedViewGrowth(normalized, "15m");

    expect(normalized.map((item) => item.viewCount)).toEqual([1_000, 1_100]);
    expect(totalViews(buckets)).toBeCloseTo(100, 5);
  });
});

describe("chooseAutoViewGrowthBucketSize", () => {
  it("chooses the planned zoom threshold from the valid snapshot range", () => {
    const start = localDate(2026, 5, 29, 0, 0);

    expect(chooseAutoViewGrowthBucketSize([snap(start, 0), snap(localDate(2026, 5, 29, 12, 0), 1)])).toBe("15m");
    expect(chooseAutoViewGrowthBucketSize([snap(start, 0), snap(localDate(2026, 5, 29, 13, 0), 1)])).toBe("1h");
    expect(chooseAutoViewGrowthBucketSize([snap(start, 0), snap(localDate(2026, 5, 31, 1, 0), 1)])).toBe("6h");
    expect(chooseAutoViewGrowthBucketSize([snap(start, 0), snap(localDate(2026, 6, 6, 1, 0), 1)])).toBe("1d");
  });
});

describe("viewsPerHourFromLatestValidPair", () => {
  it("uses the latest valid monotone pair for current velocity", () => {
    const velocity = viewsPerHourFromLatestValidPair([
      snap(localDate(2026, 5, 29, 10, 0), 1_000),
      snap(localDate(2026, 5, 29, 10, 15), 0, "OAUTH_FAILED"),
      snap(localDate(2026, 5, 29, 10, 30), 1_100),
    ]);

    expect(velocity).toBeCloseTo(200, 5);
  });
});
