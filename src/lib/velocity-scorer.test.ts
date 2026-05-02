import { describe, expect, it } from "vitest";
import { scoreVelocity } from "./velocity-scorer";

function snap(
  hoursAgo: number,
  views: number,
  likes = 0,
  comments = 0,
  shares = 0,
) {
  return {
    capturedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    viewCount: BigInt(views),
    likeCount: likes,
    commentCount: comments,
    shareCount: shares,
  };
}

describe("scoreVelocity", () => {
  it("returns nulls when fewer than 2 snapshots", () => {
    const out = scoreVelocity({ snapshots: [snap(1, 100)] });
    expect(out.velocity).toBeNull();
    expect(out.flags).toHaveLength(0);
  });

  it("computes viewsPerHour from the last pair", () => {
    const out = scoreVelocity({
      snapshots: [snap(1, 100), snap(0, 1100)],
    });
    expect(out.velocity).not.toBeNull();
    expect(out.velocity!.viewsPerHour).toBeCloseTo(1000, 0);
  });

  it("flags VELOCITY_SPIKE when last delta is >10× the rolling mean", () => {
    // 6 days of steady growth at ~50 views/hr (1200 views/day), then a sudden
    // 50,000-view jump in the last hour — should fire VELOCITY_SPIKE.
    const snapshots = [
      snap(144, 0),
      snap(120, 1200),
      snap(96, 2400),
      snap(72, 3600),
      snap(48, 4800),
      snap(24, 6000),
      snap(1, 6050),
      snap(0, 56050),
    ];
    const out = scoreVelocity({ snapshots });
    expect(out.flags.some((f) => f.type === "VELOCITY_SPIKE")).toBe(true);
  });

  it("flags BOT_SUSPECTED when comments+shares collapse against view spike", () => {
    const out = scoreVelocity({
      snapshots: [
        snap(1, 1000, 10, 5, 1),
        snap(0, 50000, 100, 0, 0),
      ],
    });
    expect(out.flags.some((f) => f.type === "BOT_SUSPECTED")).toBe(true);
  });

  it("does not flag BOT when engagement is healthy", () => {
    const out = scoreVelocity({
      snapshots: [
        snap(1, 1000, 100, 20, 5),
        snap(0, 5000, 500, 100, 25),
      ],
    });
    expect(out.flags.some((f) => f.type === "BOT_SUSPECTED")).toBe(false);
  });

  it("computes velocityScore as a 0..100 score", () => {
    const out = scoreVelocity({
      snapshots: [
        snap(48, 0),
        snap(24, 1200), // 50/hr
        snap(0, 2400), // 50/hr — steady
      ],
    });
    expect(out.velocityScore).not.toBeNull();
    expect(out.velocityScore!).toBeGreaterThanOrEqual(0);
    expect(out.velocityScore!).toBeLessThanOrEqual(100);
  });
});
