/**
 * Metric types — mirrors Prisma `MetricSnapshot` and adds rolling-window types
 * used by the velocity scorer + benchmarks.
 *
 * Owner: A. Consumers: B (benchmarks), D (admin charts).
 */

export type MetricSource =
  | "OAUTH_IG"
  | "OAUTH_TT"
  | "OAUTH_YT"
  | "OAUTH_FB"
  | "OAUTH_FAILED";

export interface MetricSnapshot {
  id: string;
  submissionId: string;
  capturedAt: Date;
  source: MetricSource;
  viewCount: bigint;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number | null;
  watchTimeSec: number | null;
  reachCount: number | null;
}

export interface VelocityWindow {
  /** Window start (capturedAt of the earliest snapshot in the window). */
  startedAt: Date;
  /** Window end. */
  endedAt: Date;
  /** Average views per hour across the window. */
  viewsPerHour: number;
  /** Rolling 7-day mean for this submission, or null if < 24h of data. */
  rolling7dMean: number | null;
  /** Spike multiplier vs rolling mean. > 10 typically flags. */
  spikeMultiplier: number | null;
}

export interface EngagementRatios {
  likeRatio: number; // likes / views
  commentRatio: number; // comments / views
  shareRatio: number; // shares / views
}

export type ConnectionType = "IG" | "TT" | "YT" | "FB";
export type DemographicSource = "PLATFORM_API" | "SELF_REPORT";

export interface AudienceSnapshot {
  id: string;
  connectionType: ConnectionType;
  connectionId: string;
  capturedAt: Date;
  source: DemographicSource;
  ageBuckets: Record<string, number>; // { "13-17": 0.05, "18-24": 0.42, ... }
  genderSplit: { male: number; female: number; other: number };
  topCountries: Array<{ code: string; share: number }>;
  totalReach: number | null;
}
