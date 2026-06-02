import { describe, expect, it } from "vitest";
import {
  chooseAutoViewGrowthBucketSize,
  computeBucketedViewGrowth,
  normalizeViewGrowthSnapshots,
  viewsPerHourFromLatestValidPair,
} from "./view-growth-buckets";

function snap(
  capturedAt: Date,
  viewCount: number,
  source = "OAUTH_TT",
) {
  return {
    capturedAt,
    viewCount: BigInt(viewCount),
    source,
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
  it("groups multiple polls on the same calendar day into one daily bucket", () => {
    const buckets = computeBucketedViewGrowth(
      [
        snap(localDate(2026, 5, 29, 0, 0), 1_000),
        snap(localDate(2026, 5, 29, 3, 0), 1_150),
        snap(localDate(2026, 5, 29, 9, 0), 1_450),
        snap(localDate(2026, 5, 29, 16, 0), 1_850),
        snap(localDate(2026, 5, 29, 23, 45), 2_100),
      ],
      "1d",
    );

    expect(buckets).toHaveLength(1);
    expect(buckets[0].start).toEqual(localDate(2026, 5, 29));
    expect(buckets[0].end).toEqual(localDate(2026, 5, 30));
    expect(buckets[0].views).toBeCloseTo(1_100, 5);
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

  it("distributes growth across bucket boundaries by time overlap", () => {
    const buckets = computeBucketedViewGrowth(
      [
        snap(localDate(2026, 5, 29, 10, 30), 1_000),
        snap(localDate(2026, 5, 29, 12, 30), 1_120),
      ],
      "1h",
    );

    expect(buckets.map((bucket) => bucket.views)).toEqual([30, 60, 30]);
    expect(totalViews(buckets)).toBeCloseTo(120, 5);
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
    expect(Math.max(...buckets.map((bucket) => bucket.views))).toBeCloseTo(50, 5);
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
