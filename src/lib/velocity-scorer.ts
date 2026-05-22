/**
 * Velocity scorer + anomaly flagger.
 *
 * Owner: A. Consumes MetricSnapshot rows for a submission and computes:
 * - viewsPerHour over the last window
 * - rolling 7-day mean
 * - spike multiplier against that rolling mean
 * - engagement ratios
 * - explainable anti-bot risk for admin review
 */

import type {
  EngagementRatios,
  MetricSnapshot,
  VelocityWindow,
} from "@/lib/contracts/metrics";
import type {
  AntiBotEvidence,
  AntiBotPayload,
  RatioPayload,
  SignalSeverity,
  SignalType,
  TokenBrokenPayload,
  VelocityPayload,
} from "@/lib/contracts/signals";

export interface ScorerInput {
  /** Snapshots ordered by capturedAt ASC. */
  snapshots: Pick<
    MetricSnapshot,
    "capturedAt" | "viewCount" | "likeCount" | "commentCount" | "shareCount"
  >[];
  campaignBenchmark?: {
    velocityP50?: number | null;
    velocityP90?: number | null;
  } | null;
  accountSnapshot?: {
    audienceCount?: number | null;
  } | null;
  now?: Date;
}

export interface FlagDraft {
  type: SignalType;
  severity: SignalSeverity;
  payload: VelocityPayload | RatioPayload | TokenBrokenPayload | AntiBotPayload | { reason: string };
}

export interface ScorerOutput {
  velocity: VelocityWindow | null;
  ratios: EngagementRatios | null;
  flags: FlagDraft[];
  velocityScore: number | null;
  antiBot: AntiBotPayload | null;
}

const HOUR_MS = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * HOUR_MS;

/**
 * Compute velocity window from the most-recent two snapshots,
 * the rolling 7d mean, and any anomaly flags.
 */
export function scoreVelocity(input: ScorerInput): ScorerOutput {
  const { snapshots } = input;
  if (snapshots.length < 2) {
    return { velocity: null, ratios: null, flags: [], velocityScore: null, antiBot: null };
  }

  const last = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  const elapsedMs = last.capturedAt.getTime() - prev.capturedAt.getTime();
  if (elapsedMs <= 0) {
    return { velocity: null, ratios: null, flags: [], velocityScore: null, antiBot: null };
  }

  const deltaViews = Number(last.viewCount) - Number(prev.viewCount);
  const deltaComments = Math.max(0, last.commentCount - prev.commentCount);
  const deltaShares = Math.max(0, last.shareCount - prev.shareCount);
  const viewsPerHour = (deltaViews / elapsedMs) * HOUR_MS;

  const cutoff = last.capturedAt.getTime() - SEVEN_DAYS_MS;
  const baseline = snapshots
    .slice(0, -1)
    .filter((s) => s.capturedAt.getTime() >= cutoff);
  let rolling7dMean: number | null = null;
  if (baseline.length >= 2) {
    let total = 0;
    let count = 0;
    for (let i = 1; i < baseline.length; i++) {
      const dt = baseline[i].capturedAt.getTime() - baseline[i - 1].capturedAt.getTime();
      if (dt <= 0) continue;
      const dv = Number(baseline[i].viewCount) - Number(baseline[i - 1].viewCount);
      total += (dv / dt) * HOUR_MS;
      count += 1;
    }
    if (count > 0) rolling7dMean = total / count;
  }

  const spikeMultiplier =
    rolling7dMean && rolling7dMean > 0 ? viewsPerHour / rolling7dMean : null;

  const lastViews = Number(last.viewCount);
  const ratios: EngagementRatios = {
    likeRatio: lastViews > 0 ? last.likeCount / lastViews : 0,
    commentRatio: lastViews > 0 ? last.commentCount / lastViews : 0,
    shareRatio: lastViews > 0 ? last.shareCount / lastViews : 0,
  };

  const flags: FlagDraft[] = [];

  if (rolling7dMean != null && spikeMultiplier != null) {
    if (spikeMultiplier < 0.1 && rolling7dMean > 1) {
      flags.push({
        type: "VELOCITY_DROP",
        severity: "INFO",
        payload: {
          reason: `viewsPerHour ${viewsPerHour.toFixed(0)} fell to ${(spikeMultiplier * 100).toFixed(0)}% of 7d mean`,
          viewsPerHour,
          rolling7dMean,
          spikeMultiplier,
        },
      });
    }
  }

  if (lastViews > 5000 && ratios.likeRatio > 0.5) {
    flags.push({
      type: "RATIO_ANOMALY",
      severity: "WARN",
      payload: {
        reason: `likeRatio=${ratios.likeRatio.toFixed(3)} (>0.5)`,
        ratio: "like",
        observed: ratios.likeRatio,
        expected: 0.1,
      } satisfies RatioPayload,
    });
  }

  let velocityScore: number | null = null;
  if (spikeMultiplier != null) {
    velocityScore = Math.max(0, Math.min(100, 50 + Math.log10(Math.max(spikeMultiplier, 1e-3)) * 25));
  }

  const antiBot = evaluateAntiBot({
    deltaViews,
    deltaComments,
    deltaShares,
    viewsPerHour,
    rolling7dMean,
    spikeMultiplier,
    ratios,
    lastViews,
    campaignVelocityP90: input.campaignBenchmark?.velocityP90 ?? null,
    accountAudienceCount: input.accountSnapshot?.audienceCount ?? null,
    evaluatedAt: input.now ?? last.capturedAt,
  });

  if (antiBot.riskScore >= 40) {
    flags.push({
      type: "BOT_SUSPECTED",
      severity: antiBot.riskScore >= 70 ? "CRITICAL" : "WARN",
      payload: antiBot,
    });
  }

  return {
    velocity: {
      startedAt: prev.capturedAt,
      endedAt: last.capturedAt,
      viewsPerHour,
      rolling7dMean,
      spikeMultiplier,
    },
    ratios,
    flags,
    velocityScore,
    antiBot,
  };
}

interface AntiBotInput {
  deltaViews: number;
  deltaComments: number;
  deltaShares: number;
  viewsPerHour: number;
  rolling7dMean: number | null;
  spikeMultiplier: number | null;
  ratios: EngagementRatios;
  lastViews: number;
  campaignVelocityP90: number | null;
  accountAudienceCount: number | null;
  evaluatedAt: Date;
}

function evaluateAntiBot(input: AntiBotInput): AntiBotPayload {
  const evidence: AntiBotEvidence[] = [];

  if (input.spikeMultiplier != null && input.spikeMultiplier > 10) {
    evidence.push({
      kind: "VELOCITY_ANOMALY",
      label:
        input.spikeMultiplier > 25
          ? "Extreme view growth anomaly against submission history"
          : "View growth anomaly against submission history",
      points: input.spikeMultiplier > 25 ? 15 : 10,
      metrics: {
        viewsPerHour: round(input.viewsPerHour),
        rolling7dMean: input.rolling7dMean == null ? null : round(input.rolling7dMean),
        spikeMultiplier: round(input.spikeMultiplier, 1),
      },
    });
  }

  if (input.campaignVelocityP90 != null && input.campaignVelocityP90 > 0) {
    const campaignRatio = input.viewsPerHour / input.campaignVelocityP90;
    if (campaignRatio > 2.5) {
      evidence.push({
        kind: "VELOCITY_ANOMALY",
        label: "View growth above campaign benchmark",
        points: campaignRatio > 6 ? 10 : 5,
        metrics: {
          viewsPerHour: round(input.viewsPerHour),
          campaignVelocityP90: round(input.campaignVelocityP90),
          campaignRatio: round(campaignRatio, 1),
        },
      });
    }
  }

  if (
    input.deltaViews > 1000 &&
    input.deltaComments / input.deltaViews < 0.0005 &&
    input.deltaShares / input.deltaViews < 0.0001
  ) {
    evidence.push({
      kind: "ENGAGEMENT_COLLAPSE",
      label: "High view growth with near-zero comments and shares",
      points: input.deltaViews > 10_000 ? 45 : 40,
      metrics: {
        deltaViews: input.deltaViews,
        deltaCommentRatio: round(input.deltaComments / input.deltaViews, 5),
        deltaShareRatio: round(input.deltaShares / input.deltaViews, 5),
      },
    });
  }

  if (input.lastViews > 5000 && input.ratios.likeRatio > 0.5) {
    evidence.push({
      kind: "RATIO_ANOMALY",
      label: "Like ratio is unusually high for the view count",
      points: 45,
      metrics: {
        likeRatio: round(input.ratios.likeRatio, 3),
        views: input.lastViews,
      },
    });
  }

  if (input.accountAudienceCount != null && input.accountAudienceCount > 0 && input.lastViews > 5000) {
    const audienceMultiple = input.lastViews / input.accountAudienceCount;
    if (audienceMultiple > 10) {
      evidence.push({
        kind: "ACCOUNT_PLAUSIBILITY",
        label: "Views are high relative to the tracked account audience",
        points: audienceMultiple > 20 ? 40 : 25,
        metrics: {
          views: input.lastViews,
          audienceCount: input.accountAudienceCount,
          audienceMultiple: round(audienceMultiple, 1),
        },
      });
    }
  }

  const riskScore = Math.min(100, evidence.reduce((sum, item) => sum + item.points, 0));
  const orderedEvidence = [...evidence].sort((a, b) => b.points - a.points);
  const reasons = orderedEvidence.map((item) => item.label);
  const confidence: AntiBotPayload["confidence"] =
    riskScore >= 70 && evidence.length >= 2 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";

  return {
    reason:
      riskScore > 0
        ? `Anti-bot risk ${riskScore}/100: ${reasons[0]}`
        : "Anti-bot risk 0/100",
    riskScore,
    confidence,
    reasons,
    evidence: orderedEvidence,
    evaluatedAt: input.evaluatedAt.toISOString(),
    version: "anti-bot-v1",
  };
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
