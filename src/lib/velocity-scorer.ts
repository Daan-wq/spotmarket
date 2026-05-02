/**
 * Velocity scorer + anomaly flagger.
 *
 * Owner: A. Consumes MetricSnapshot rows for a submission and computes:
 *   - viewsPerHour over the last window
 *   - rolling 7-day mean
 *   - spike multiplier (vs rolling mean)
 *   - engagement ratios (like/comment/share over views)
 *
 * Flags:
 *   - VELOCITY_SPIKE  when spikeMultiplier > 10  (CRITICAL > 25, WARN otherwise)
 *   - VELOCITY_DROP   when current viewsPerHour < 0.1 * rolling mean (and prior data exists)
 *   - RATIO_ANOMALY   when likeRatio falls outside [P5, P95] of campaign baseline
 *   - BOT_SUSPECTED   when comment+share ratios collapse against high view delta
 *
 * The scorer never throws — pure compute. Persisting + event emission happens
 * in the cron route so flag IO is colocated with metric IO.
 */

import type {
  EngagementRatios,
  MetricSnapshot,
  VelocityWindow,
} from "@/lib/contracts/metrics";
import type {
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
}

export interface FlagDraft {
  type: SignalType;
  severity: SignalSeverity;
  payload: VelocityPayload | RatioPayload | TokenBrokenPayload | { reason: string };
}

export interface ScorerOutput {
  velocity: VelocityWindow | null;
  ratios: EngagementRatios | null;
  flags: FlagDraft[];
  velocityScore: number | null;
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
    return { velocity: null, ratios: null, flags: [], velocityScore: null };
  }

  const last = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  const elapsedMs = last.capturedAt.getTime() - prev.capturedAt.getTime();
  if (elapsedMs <= 0) {
    return { velocity: null, ratios: null, flags: [], velocityScore: null };
  }

  const deltaViews = Number(last.viewCount) - Number(prev.viewCount);
  const viewsPerHour = (deltaViews / elapsedMs) * HOUR_MS;

  // Rolling 7d mean of viewsPerHour across consecutive pairs.
  // We *exclude* the final pair (which IS the value being scored) so the spike
  // doesn't contaminate the baseline it's compared against.
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
    if (spikeMultiplier > 10) {
      flags.push({
        type: "VELOCITY_SPIKE",
        severity: spikeMultiplier > 25 ? "CRITICAL" : "WARN",
        payload: {
          reason: `viewsPerHour ${viewsPerHour.toFixed(0)} vs 7d mean ${rolling7dMean.toFixed(0)} (×${spikeMultiplier.toFixed(1)})`,
          viewsPerHour,
          rolling7dMean,
          spikeMultiplier,
        },
      });
    } else if (spikeMultiplier < 0.1 && rolling7dMean > 1) {
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

  // Bot heuristic: very high view delta but near-zero comments AND shares.
  // (Likes alone aren't enough — many platforms inflate likes via botnets.)
  if (deltaViews > 1000) {
    if (ratios.commentRatio < 0.0005 && ratios.shareRatio < 0.0001) {
      flags.push({
        type: "BOT_SUSPECTED",
        severity: "WARN",
        payload: {
          reason: `commentRatio=${ratios.commentRatio.toFixed(5)} shareRatio=${ratios.shareRatio.toFixed(5)} on Δ${deltaViews.toLocaleString()} views`,
        },
      });
    }
  }

  // Ratio anomaly — extreme like ratios usually indicate engagement farms.
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

  // velocityScore: 0..100. >50 == accelerating, <50 == decelerating, ~50 == steady.
  let velocityScore: number | null = null;
  if (spikeMultiplier != null) {
    velocityScore = Math.max(0, Math.min(100, 50 + Math.log10(Math.max(spikeMultiplier, 1e-3)) * 25));
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
  };
}
