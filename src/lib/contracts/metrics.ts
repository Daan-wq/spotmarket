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
  metricAvailability?: MetricAvailability | null;
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
  likeRatio: number | null; // likes / views
  commentRatio: number | null; // comments / views
  shareRatio: number | null; // shares / views
  saveRatio: number | null; // saves / views
  engagementRate: number | null; // available engagements / views
  availableEngagements: number;
}

export const METRIC_AVAILABILITY_KEYS = [
  "views",
  "likes",
  "comments",
  "shares",
  "saves",
  "watchTime",
  "reach",
  "totalInteractions",
  "follows",
  "profileVisits",
  "reactions",
] as const;

export type MetricAvailabilityKey = (typeof METRIC_AVAILABILITY_KEYS)[number];
export type MetricAvailability = Record<MetricAvailabilityKey, boolean>;

export const UNAVAILABLE_METRICS: MetricAvailability = {
  views: false,
  likes: false,
  comments: false,
  shares: false,
  saves: false,
  watchTime: false,
  reach: false,
  totalInteractions: false,
  follows: false,
  profileVisits: false,
  reactions: false,
};

export function metricAvailability(
  overrides: Partial<MetricAvailability>,
): MetricAvailability {
  return { ...UNAVAILABLE_METRICS, ...overrides };
}

export function metricAvailabilityValue(
  availability: unknown,
  key: MetricAvailabilityKey,
): boolean | null {
  if (!availability || typeof availability !== "object" || Array.isArray(availability)) {
    return null;
  }
  const value = (availability as Partial<Record<MetricAvailabilityKey, unknown>>)[key];
  return typeof value === "boolean" ? value : null;
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
