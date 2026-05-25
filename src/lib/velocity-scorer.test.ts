import { describe, expect, it } from "vitest";
import { scoreVelocity } from "./velocity-scorer";

type AntiBotTestOutput = {
  antiBot: {
    riskScore: number;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    reasons: string[];
    evidence: Array<{ kind: string; points: number }>;
  } | null;
};

function snap(
  hoursAgo: number,
  views: number,
  likes = 0,
  comments = 0,
  shares = 0,
  saves: number | null = null,
) {
  return {
    capturedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    viewCount: BigInt(views),
    likeCount: likes,
    commentCount: comments,
    shareCount: shares,
    saveCount: saves,
  };
}

function antiBotOf(output: ReturnType<typeof scoreVelocity>) {
  return (output as ReturnType<typeof scoreVelocity> & AntiBotTestOutput).antiBot;
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

  it("routes suspicious view spikes through BOT_SUSPECTED instead of legacy VELOCITY_SPIKE", () => {
    // 6 days of steady growth at ~50 views/hr (1200 views/day), then a sudden
    // 50,000-view jump in the last hour. Velocity is now anti-bot evidence,
    // not its own admin signal.
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
    expect(out.flags.some((f) => f.type === "VELOCITY_SPIKE")).toBe(false);
    expect(out.flags.some((f) => f.type === "BOT_SUSPECTED")).toBe(true);
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

  it("does not mark healthy cumulative engagement as an engagement collapse", () => {
    const out = scoreVelocity({
      snapshots: [
        snap(1, 100000, 5000, 37, 206, 434),
        snap(0, 162290, 6000, 37, 206, 434),
      ],
    });

    expect(antiBotOf(out)?.evidence.map((item) => item.kind)).not.toContain(
      "ENGAGEMENT_COLLAPSE",
    );
    expect(out.flags.some((f) => f.type === "BOT_SUSPECTED")).toBe(false);
  });

  it("ignores unavailable engagement metrics instead of counting them as zero", () => {
    const out = scoreVelocity({
      snapshots: [
        {
          ...snap(1, 1000, 100, 0, 0),
          metricAvailability: {
            views: true,
            likes: true,
            comments: false,
            shares: false,
            saves: false,
            watchTime: false,
            reach: false,
            totalInteractions: false,
            follows: false,
            profileVisits: false,
            reactions: false,
          },
        },
        {
          ...snap(0, 50000, 2500, 0, 0),
          metricAvailability: {
            views: true,
            likes: true,
            comments: false,
            shares: false,
            saves: false,
            watchTime: false,
            reach: false,
            totalInteractions: false,
            follows: false,
            profileVisits: false,
            reactions: false,
          },
        },
      ],
    });

    expect(antiBotOf(out)?.evidence.map((item) => item.kind)).not.toContain(
      "ENGAGEMENT_COLLAPSE",
    );
  });

  it("scores fake-view risk as critical when a view-growth anomaly has collapsed engagement", () => {
    const out = scoreVelocity({
      snapshots: [
        snap(144, 0, 0, 0, 0),
        snap(120, 1200, 120, 24, 10),
        snap(96, 2400, 240, 48, 20),
        snap(72, 3600, 360, 72, 30),
        snap(48, 4800, 480, 96, 40),
        snap(24, 6000, 600, 120, 50),
        snap(1, 6050, 610, 122, 51),
        snap(0, 56050, 630, 122, 51),
      ],
      campaignBenchmark: { velocityP90: 5000 },
    } as Parameters<typeof scoreVelocity>[0] & { campaignBenchmark: { velocityP90: number } });

    const antiBot = antiBotOf(out);
    expect(antiBot?.riskScore).toBeGreaterThanOrEqual(70);
    expect(antiBot?.confidence).toBe("HIGH");
    expect(antiBot?.evidence.map((item) => item.kind)).toContain("ENGAGEMENT_COLLAPSE");
    expect(out.flags).toContainEqual(
      expect.objectContaining({ type: "BOT_SUSPECTED", severity: "CRITICAL" }),
    );
  });

  it("keeps healthy viral growth out of the bot queue", () => {
    const out = scoreVelocity({
      snapshots: [
        snap(144, 0, 0, 0, 0),
        snap(120, 1200, 100, 20, 8),
        snap(96, 2400, 220, 44, 16),
        snap(72, 3600, 340, 70, 24),
        snap(48, 4800, 480, 96, 32),
        snap(24, 6000, 620, 120, 40),
        snap(1, 6050, 630, 124, 42),
        snap(0, 56050, 6000, 1200, 350),
      ],
      campaignBenchmark: { velocityP90: 5000 },
    } as Parameters<typeof scoreVelocity>[0] & { campaignBenchmark: { velocityP90: number } });

    expect(antiBotOf(out)?.riskScore).toBeLessThan(40);
    expect(out.flags.some((flag) => flag.type === "BOT_SUSPECTED")).toBe(false);
  });

  it("warns when like ratio is implausibly high", () => {
    const out = scoreVelocity({
      snapshots: [snap(1, 1000, 100, 10, 2), snap(0, 9000, 7000, 20, 5)],
    });

    const antiBot = antiBotOf(out);
    expect(antiBot?.riskScore).toBeGreaterThanOrEqual(40);
    expect(antiBot?.evidence.map((item) => item.kind)).toContain("RATIO_ANOMALY");
    expect(out.flags).toContainEqual(
      expect.objectContaining({ type: "BOT_SUSPECTED", severity: "WARN" }),
    );
  });

  it("uses account plausibility only when an audience snapshot is available", () => {
    const withoutAudience = scoreVelocity({
      snapshots: [snap(1, 1000, 80, 10, 5), snap(0, 25000, 1800, 250, 90)],
    });
    expect(antiBotOf(withoutAudience)?.evidence.map((item) => item.kind)).not.toContain(
      "ACCOUNT_PLAUSIBILITY",
    );

    const withAudience = scoreVelocity({
      snapshots: [snap(1, 1000, 80, 10, 5), snap(0, 25000, 1800, 250, 90)],
      accountSnapshot: { audienceCount: 500 },
    } as Parameters<typeof scoreVelocity>[0] & { accountSnapshot: { audienceCount: number } });
    expect(antiBotOf(withAudience)?.evidence.map((item) => item.kind)).toContain(
      "ACCOUNT_PLAUSIBILITY",
    );
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
