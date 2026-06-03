import { metricAvailabilityValue, type MetricAvailabilityKey } from "@/lib/contracts/metrics";
import type { ViewGrowthBucketSize } from "@/lib/stats/view-growth-buckets";

export type SignalMetricSnapshotInput = {
  capturedAt: Date | string;
  source?: string | null;
  viewCount: bigint | number | string;
  likeCount?: number | string | null;
  commentCount?: number | string | null;
  shareCount?: number | string | null;
  saveCount?: number | string | null;
  watchTimeSec?: number | string | null;
  reachCount?: number | string | null;
  totalInteractions?: number | string | null;
  followsFromMedia?: number | string | null;
  profileVisits?: number | string | null;
  metricAvailability?: unknown;
  raw?: unknown;
};

export type SignalViewGrowthBucket = {
  key: string;
  start: Date;
  end: Date;
  views: number;
  totalViews: number | null;
  deltas: {
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    totalInteractions: number | null;
    reach: number | null;
    follows: number | null;
    profileVisits: number | null;
  };
  engagementTotal: number | null;
  engagementPerThousandViews: number | null;
  watchTime: {
    deltaSec: number | null;
    averageSec: number | null;
    unavailable: boolean;
    unknownKind: boolean;
  };
  unavailable: MetricAvailabilityKey[];
  source: string | null;
};

export type SignalViewGrowthInitialValue = {
  capturedAt: Date;
  views: number;
  engagementTotal: number | null;
  source: string | null;
};

export type SignalViewGrowthTimeline = {
  initial: SignalViewGrowthInitialValue | null;
  buckets: SignalViewGrowthBucket[];
  measuredGrowthViews: number;
  measuredGrowthEngagements: number | null;
  totalViews: number | null;
  totalEngagements: number | null;
};

type NormalizedSignalSnapshot = {
  capturedAt: Date;
  source: string | null;
  viewCount: number;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  saveCount: number | null;
  watchTimeSec: number | null;
  reachCount: number | null;
  totalInteractions: number | null;
  followsFromMedia: number | null;
  profileVisits: number | null;
  metricAvailability: unknown;
  raw: unknown;
};

type WatchTimeValue = {
  totalSec: number | null;
  averageSec: number | null;
  unavailable: boolean;
  unknownKind: boolean;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const CUMULATIVE_DELTA_FIELDS = [
  "likes",
  "comments",
  "shares",
  "saves",
  "totalInteractions",
  "reach",
  "follows",
  "profileVisits",
] as const;

const TOOLTIP_UNAVAILABLE_KEYS: MetricAvailabilityKey[] = [
  "watchTime",
  "saves",
  "reach",
  "follows",
  "profileVisits",
  "totalInteractions",
  "reactions",
];

export function computeSignalViewGrowthBuckets(
  snapshots: SignalMetricSnapshotInput[],
  bucketSize: ViewGrowthBucketSize,
): SignalViewGrowthBucket[] {
  return computeSignalViewGrowthTimeline(snapshots, bucketSize).buckets;
}

export function computeSignalViewGrowthTimeline(
  snapshots: SignalMetricSnapshotInput[],
  bucketSize: ViewGrowthBucketSize,
): SignalViewGrowthTimeline {
  const validSnapshots = normalizeSignalSnapshots(snapshots);
  if (validSnapshots.length === 0) return emptyTimeline();

  const first = validSnapshots[0];
  const initial: SignalViewGrowthInitialValue = {
    capturedAt: first.capturedAt,
    views: first.viewCount,
    engagementTotal: snapshotEngagementTotal(first),
    source: first.source,
  };

  if (validSnapshots.length < 2) {
    return {
      initial,
      buckets: [],
      measuredGrowthViews: 0,
      measuredGrowthEngagements: null,
      totalViews: initial.views,
      totalEngagements: initial.engagementTotal,
    };
  }

  const last = validSnapshots[validSnapshots.length - 1];
  const rangeStart = floorBucket(first.capturedAt, bucketSize);
  const rangeEnd = ceilBucket(last.capturedAt, bucketSize);
  if (rangeEnd.getTime() <= rangeStart.getTime()) {
    return {
      initial,
      buckets: [],
      measuredGrowthViews: 0,
      measuredGrowthEngagements: null,
      totalViews: initial.views,
      totalEngagements: initial.engagementTotal,
    };
  }

  const buckets = buildBuckets(rangeStart, rangeEnd, bucketSize);
  const bucketByStart = new Map(buckets.map((bucket) => [bucket.start.getTime(), bucket]));

  for (let index = 1; index < validSnapshots.length; index++) {
    const previous = validSnapshots[index - 1];
    const current = validSnapshots[index];
    const deltaViews = current.viewCount - previous.viewCount;
    if (deltaViews < 0) continue;

    const elapsedMs = current.capturedAt.getTime() - previous.capturedAt.getTime();
    if (elapsedMs <= 0) continue;

    const bucketStart = floorBucketForDeltaEnd(current.capturedAt, bucketSize);
    const bucket = bucketByStart.get(bucketStart.getTime());
    if (!bucket) continue;

    if (deltaViews > 0) bucket.views += deltaViews;
    bucket.totalViews = current.viewCount;
    bucket.source = current.source;
    addDeltas(bucket, previous, current);
    addWatchTime(bucket, previous, current);
    addUnavailable(bucket, current);
  }

  for (const bucket of buckets) {
    const engagementParts = [
      bucket.deltas.likes,
      bucket.deltas.comments,
      bucket.deltas.shares,
      bucket.deltas.saves,
    ].filter((value): value is number => value != null);

    bucket.engagementTotal = engagementParts.length > 0
      ? engagementParts.reduce((sum, value) => sum + value, 0)
      : null;
    bucket.engagementPerThousandViews =
      bucket.engagementTotal != null && bucket.views > 0
        ? (bucket.engagementTotal / bucket.views) * 1000
        : null;
    bucket.unavailable = [...new Set(bucket.unavailable)];
  }

  const measuredGrowthViews = buckets.reduce((sum, bucket) => sum + bucket.views, 0);
  const engagementBuckets = buckets
    .map((bucket) => bucket.engagementTotal)
    .filter((value): value is number => value != null);
  const measuredGrowthEngagements = engagementBuckets.length > 0
    ? engagementBuckets.reduce((sum, value) => sum + value, 0)
    : null;

  return {
    initial,
    buckets,
    measuredGrowthViews,
    measuredGrowthEngagements,
    totalViews: initial.views + measuredGrowthViews,
    totalEngagements:
      initial.engagementTotal != null && measuredGrowthEngagements != null
        ? initial.engagementTotal + measuredGrowthEngagements
        : initial.engagementTotal,
  };
}

export function normalizeSignalSnapshots(
  snapshots: SignalMetricSnapshotInput[],
): NormalizedSignalSnapshot[] {
  const byTime = new Map<number, NormalizedSignalSnapshot>();

  for (const snapshot of snapshots) {
    if (snapshot.source === "OAUTH_FAILED") continue;

    const capturedAt = toValidDate(snapshot.capturedAt);
    const viewCount = toValidCount(snapshot.viewCount);
    if (!capturedAt || viewCount == null) continue;

    const normalized: NormalizedSignalSnapshot = {
      capturedAt,
      source: snapshot.source ?? null,
      viewCount,
      likeCount: toOptionalCount(snapshot.likeCount),
      commentCount: toOptionalCount(snapshot.commentCount),
      shareCount: toOptionalCount(snapshot.shareCount),
      saveCount: toOptionalCount(snapshot.saveCount),
      watchTimeSec: toOptionalCount(snapshot.watchTimeSec),
      reachCount: toOptionalCount(snapshot.reachCount),
      totalInteractions: toOptionalCount(snapshot.totalInteractions),
      followsFromMedia: toOptionalCount(snapshot.followsFromMedia),
      profileVisits: toOptionalCount(snapshot.profileVisits),
      metricAvailability: snapshot.metricAvailability,
      raw: snapshot.raw,
    };

    const timestamp = capturedAt.getTime();
    const existing = byTime.get(timestamp);
    if (!existing || normalized.viewCount >= existing.viewCount) {
      byTime.set(timestamp, normalized);
    }
  }

  const sorted = Array.from(byTime.values()).sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );
  const monotone: NormalizedSignalSnapshot[] = [];

  for (const snapshot of sorted) {
    const previous = monotone[monotone.length - 1];
    if (!previous || snapshot.viewCount >= previous.viewCount) {
      monotone.push(snapshot);
    }
  }

  return monotone;
}

function buildBuckets(
  rangeStart: Date,
  rangeEnd: Date,
  bucketSize: ViewGrowthBucketSize,
) {
  const buckets: SignalViewGrowthBucket[] = [];
  let cursor = rangeStart;

  while (cursor.getTime() < rangeEnd.getTime()) {
    const start = new Date(cursor);
    const end = addBucket(start, bucketSize);
    buckets.push({
      key: `${bucketSize}:${start.toISOString()}`,
      start,
      end,
      views: 0,
      totalViews: null,
      deltas: {
        likes: null,
        comments: null,
        shares: null,
        saves: null,
        totalInteractions: null,
        reach: null,
        follows: null,
        profileVisits: null,
      },
      engagementTotal: null,
      engagementPerThousandViews: null,
      watchTime: {
        deltaSec: null,
        averageSec: null,
        unavailable: false,
        unknownKind: false,
      },
      unavailable: [],
      source: null,
    });
    cursor = end;
  }

  return buckets;
}

function addDeltas(
  bucket: SignalViewGrowthBucket,
  previous: NormalizedSignalSnapshot,
  current: NormalizedSignalSnapshot,
) {
  for (const key of CUMULATIVE_DELTA_FIELDS) {
    const delta = cumulativeDelta(previous, current, key);
    if (delta == null) continue;
    bucket.deltas[key] = (bucket.deltas[key] ?? 0) + delta;
  }
}

function addWatchTime(
  bucket: SignalViewGrowthBucket,
  previous: NormalizedSignalSnapshot,
  current: NormalizedSignalSnapshot,
) {
  const previousWatch = watchTimeValue(previous);
  const currentWatch = watchTimeValue(current);

  if (currentWatch.unavailable) bucket.watchTime.unavailable = true;
  if (currentWatch.averageSec != null) bucket.watchTime.averageSec = currentWatch.averageSec;
  if (currentWatch.unknownKind) bucket.watchTime.unknownKind = true;

  if (previousWatch.totalSec != null && currentWatch.totalSec != null) {
    bucket.watchTime.deltaSec =
      (bucket.watchTime.deltaSec ?? 0) + Math.max(0, currentWatch.totalSec - previousWatch.totalSec);
  }
}

function addUnavailable(
  bucket: SignalViewGrowthBucket,
  current: NormalizedSignalSnapshot,
) {
  for (const key of TOOLTIP_UNAVAILABLE_KEYS) {
    if (metricAvailabilityValue(current.metricAvailability, key) === false) {
      bucket.unavailable.push(key);
    }
  }
}

function cumulativeDelta(
  previous: NormalizedSignalSnapshot,
  current: NormalizedSignalSnapshot,
  key: keyof SignalViewGrowthBucket["deltas"],
) {
  const availabilityKey = metricAvailabilityKeyForDelta(key);
  if (availabilityKey) {
    const previousAvailable = metricAvailabilityValue(previous.metricAvailability, availabilityKey);
    const currentAvailable = metricAvailabilityValue(current.metricAvailability, availabilityKey);
    if (previousAvailable === false || currentAvailable === false) return null;
  }

  const previousValue = metricValue(previous, key);
  const currentValue = metricValue(current, key);
  if (previousValue == null || currentValue == null) return null;
  return Math.max(0, currentValue - previousValue);
}

function watchTimeValue(snapshot: NormalizedSignalSnapshot): WatchTimeValue {
  const explicitAvailable = metricAvailabilityValue(snapshot.metricAvailability, "watchTime");
  if (explicitAvailable === false) {
    return { totalSec: null, averageSec: null, unavailable: true, unknownKind: false };
  }

  const raw = asRecord(snapshot.raw);
  const watchTimeKind = stringValue(raw?.watchTimeKind);

  if (watchTimeKind === "total") {
    return {
      totalSec: snapshot.watchTimeSec,
      averageSec: numberValue(raw?.averageWatchTimeSec),
      unavailable: false,
      unknownKind: false,
    };
  }
  if (watchTimeKind === "average") {
    return {
      totalSec: null,
      averageSec: snapshot.watchTimeSec ?? numberValue(raw?.averageWatchTimeSec),
      unavailable: false,
      unknownKind: false,
    };
  }

  if (snapshot.source === "OAUTH_YT") {
    const averageSec = numberValue(raw?.averageViewDuration);
    return {
      totalSec: snapshot.watchTimeSec,
      averageSec,
      unavailable: false,
      unknownKind: false,
    };
  }

  if (snapshot.source === "OAUTH_FB") {
    const reel = asRecord(raw?.reel);
    const totalMs = numberValue(reel?.viewTime);
    const averageMs = numberValue(reel?.avgTimeWatched);
    return {
      totalSec: totalMs != null ? snapshot.watchTimeSec : null,
      averageSec: averageMs == null ? null : Math.round(averageMs / 1000),
      unavailable: false,
      unknownKind: false,
    };
  }

  return {
    totalSec: null,
    averageSec: null,
    unavailable: false,
    unknownKind: snapshot.watchTimeSec != null,
  };
}

function metricAvailabilityKeyForDelta(
  key: keyof SignalViewGrowthBucket["deltas"],
): MetricAvailabilityKey | null {
  const map: Record<keyof SignalViewGrowthBucket["deltas"], MetricAvailabilityKey> = {
    likes: "likes",
    comments: "comments",
    shares: "shares",
    saves: "saves",
    totalInteractions: "totalInteractions",
    reach: "reach",
    follows: "follows",
    profileVisits: "profileVisits",
  };
  return map[key];
}

function metricValue(
  snapshot: NormalizedSignalSnapshot,
  key: keyof SignalViewGrowthBucket["deltas"],
) {
  const map: Record<keyof SignalViewGrowthBucket["deltas"], number | null> = {
    likes: snapshot.likeCount,
    comments: snapshot.commentCount,
    shares: snapshot.shareCount,
    saves: snapshot.saveCount,
    totalInteractions: snapshot.totalInteractions,
    reach: snapshot.reachCount,
    follows: snapshot.followsFromMedia,
    profileVisits: snapshot.profileVisits,
  };
  return map[key];
}

function snapshotEngagementTotal(snapshot: NormalizedSignalSnapshot) {
  const values = (["likes", "comments", "shares", "saves"] as const)
    .map((key) => snapshotMetricCount(snapshot, key))
    .filter((value): value is number => value != null);

  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0)
    : null;
}

function snapshotMetricCount(
  snapshot: NormalizedSignalSnapshot,
  key: "likes" | "comments" | "shares" | "saves",
) {
  const availabilityKey = metricAvailabilityKeyForDelta(key);
  if (!availabilityKey) return null;

  const explicit = metricAvailabilityValue(snapshot.metricAvailability, availabilityKey);
  if (explicit === false) return null;

  const value = metricValue(snapshot, key);
  if (value != null) return value;
  return explicit === true ? 0 : null;
}

function floorBucket(value: Date, bucketSize: ViewGrowthBucketSize) {
  if (bucketSize === "1d") {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (bucketSize === "6h") {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      Math.floor(value.getHours() / 6) * 6,
    );
  }

  if (bucketSize === "1h") {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
    );
  }

  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    value.getHours(),
    Math.floor(value.getMinutes() / 15) * 15,
  );
}

function ceilBucket(value: Date, bucketSize: ViewGrowthBucketSize) {
  const floor = floorBucket(value, bucketSize);
  return floor.getTime() === value.getTime() ? floor : addBucket(floor, bucketSize);
}

function floorBucketForDeltaEnd(value: Date, bucketSize: ViewGrowthBucketSize) {
  const floor = floorBucket(value, bucketSize);
  if (floor.getTime() !== value.getTime()) return floor;

  const previousMoment = new Date(value.getTime() - 1);
  return floorBucket(previousMoment, bucketSize);
}

function addBucket(value: Date, bucketSize: ViewGrowthBucketSize) {
  const next = new Date(value);

  if (bucketSize === "15m") {
    next.setMinutes(next.getMinutes() + 15);
  } else if (bucketSize === "1h") {
    next.setHours(next.getHours() + 1);
  } else if (bucketSize === "6h") {
    next.setHours(next.getHours() + 6);
  } else {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function toValidDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function toValidCount(value: bigint | number | string) {
  const numberValue = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return null;
  return numberValue;
}

function toOptionalCount(value: number | string | null | undefined) {
  if (value == null) return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return null;
  return numberValue;
}

function numberValue(value: unknown) {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function emptyTimeline(): SignalViewGrowthTimeline {
  return {
    initial: null,
    buckets: [],
    measuredGrowthViews: 0,
    measuredGrowthEngagements: null,
    totalViews: null,
    totalEngagements: null,
  };
}
