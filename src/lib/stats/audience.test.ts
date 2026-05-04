import { describe, expect, it } from "vitest";
import type { AudienceSnapshot } from "@prisma/client";
import { aggregateAudience, latestPerConnection } from "./audience";

function snap(overrides: Partial<AudienceSnapshot>): AudienceSnapshot {
  return {
    id: overrides.id ?? "snap-" + Math.random().toString(36).slice(2),
    connectionType: overrides.connectionType ?? "IG",
    connectionId: overrides.connectionId ?? "conn-1",
    capturedAt: overrides.capturedAt ?? new Date(),
    source: overrides.source ?? "PLATFORM_API",
    kind: overrides.kind ?? "FOLLOWER",
    ageBuckets: overrides.ageBuckets ?? { "18-24": 0.4, "25-34": 0.6 },
    genderSplit: overrides.genderSplit ?? { male: 0.5, female: 0.5, other: 0 },
    topCountries: overrides.topCountries ?? [{ code: "US", share: 0.8 }, { code: "NL", share: 0.2 }],
    cities: overrides.cities ?? null,
    totalReach: overrides.totalReach ?? null,
    raw: overrides.raw ?? null,
  } as AudienceSnapshot;
}

describe("aggregateAudience", () => {
  it("returns empty distribution when no snapshots", () => {
    const r = aggregateAudience([]);
    expect(r.sampleCount).toBe(0);
    expect(r.topCountries).toHaveLength(0);
  });

  it("sums age buckets across snapshots", () => {
    const snaps = [
      snap({ ageBuckets: { "18-24": 0.5, "25-34": 0.5 } }),
      snap({ id: "s2", ageBuckets: { "18-24": 0.3, "35-44": 0.7 } }),
    ];
    const r = aggregateAudience(snaps);
    expect(r.ageBuckets["18-24"]).toBeCloseTo(0.8, 5);
    expect(r.ageBuckets["25-34"]).toBeCloseTo(0.5, 5);
    expect(r.ageBuckets["35-44"]).toBeCloseTo(0.7, 5);
  });

  it("sums country shares and sorts descending", () => {
    const snaps = [
      snap({ topCountries: [{ code: "US", share: 0.6 }, { code: "NL", share: 0.4 }] }),
      snap({ id: "s2", topCountries: [{ code: "US", share: 0.5 }, { code: "DE", share: 0.5 }] }),
    ];
    const r = aggregateAudience(snaps);
    expect(r.topCountries[0]?.code).toBe("US");
    expect(r.topCountries[0]?.share).toBeCloseTo(1.1, 5);
  });

  it("filters by AudienceKind when provided", () => {
    const snaps = [
      snap({ kind: "FOLLOWER", ageBuckets: { "18-24": 1 } }),
      snap({ id: "s2", kind: "ENGAGED", ageBuckets: { "25-34": 1 } }),
    ];
    const onlyFollower = aggregateAudience(snaps, "FOLLOWER");
    expect(onlyFollower.sampleCount).toBe(1);
    expect(onlyFollower.ageBuckets["18-24"]).toBe(1);
    expect(onlyFollower.ageBuckets["25-34"]).toBeUndefined();
  });
});

describe("latestPerConnection", () => {
  it("dedupes to the first occurrence per (type, id, kind)", () => {
    const a = snap({ id: "a", connectionId: "c1", kind: "FOLLOWER", capturedAt: new Date(2026, 5, 1) });
    const b = snap({ id: "b", connectionId: "c1", kind: "FOLLOWER", capturedAt: new Date(2026, 4, 1) });
    const c = snap({ id: "c", connectionId: "c1", kind: "ENGAGED", capturedAt: new Date(2026, 5, 1) });
    // Caller passes in capturedAt-desc order
    const r = latestPerConnection([a, c, b]);
    expect(r.map((x) => x.id)).toEqual(["a", "c"]);
  });
});
