export const VIEW_GROWTH_BUCKET_SIZES = ["15m", "1h", "6h", "1d"] as const;

export type ViewGrowthBucketSize = (typeof VIEW_GROWTH_BUCKET_SIZES)[number];
export type ViewGrowthZoom = "auto" | ViewGrowthBucketSize;

export type ViewGrowthSnapshotInput = {
  capturedAt: Date | string;
  viewCount: bigint | number | string;
  source?: string | null;
};

export type ViewGrowthSnapshot = {
  capturedAt: Date;
  viewCount: number;
  source?: string | null;
};

export type ViewGrowthBucket = {
  key: string;
  start: Date;
  end: Date;
  views: number;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const AUTO_15M_MAX_MS = 12 * HOUR_MS;
const AUTO_1H_MAX_MS = 48 * HOUR_MS;
const AUTO_6H_MAX_MS = 7 * 24 * HOUR_MS;

export function normalizeViewGrowthSnapshots(
  snapshots: ViewGrowthSnapshotInput[],
): ViewGrowthSnapshot[] {
  const byTime = new Map<number, ViewGrowthSnapshot>();

  for (const snapshot of snapshots) {
    if (snapshot.source === "OAUTH_FAILED") continue;

    const capturedAt = toValidDate(snapshot.capturedAt);
    const viewCount = toValidViewCount(snapshot.viewCount);
    if (!capturedAt || viewCount == null) continue;

    const timestamp = capturedAt.getTime();
    const existing = byTime.get(timestamp);
    if (!existing || viewCount >= existing.viewCount) {
      byTime.set(timestamp, {
        capturedAt,
        viewCount,
        source: snapshot.source,
      });
    }
  }

  const sorted = Array.from(byTime.values()).sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime(),
  );
  const monotone: ViewGrowthSnapshot[] = [];

  for (const snapshot of sorted) {
    const previous = monotone[monotone.length - 1];
    if (!previous || snapshot.viewCount >= previous.viewCount) {
      monotone.push(snapshot);
    }
  }

  return monotone;
}

export function computeBucketedViewGrowth(
  snapshots: ViewGrowthSnapshotInput[],
  bucketSize: ViewGrowthBucketSize,
): ViewGrowthBucket[] {
  const validSnapshots = normalizeViewGrowthSnapshots(snapshots);
  if (validSnapshots.length < 2) return [];

  const first = validSnapshots[0];
  const last = validSnapshots[validSnapshots.length - 1];
  const rangeStart = floorBucket(first.capturedAt, bucketSize);
  const rangeEnd = ceilBucket(last.capturedAt, bucketSize);
  if (rangeEnd.getTime() <= rangeStart.getTime()) return [];

  const buckets = buildBuckets(rangeStart, rangeEnd, bucketSize);
  const bucketByStart = new Map(buckets.map((bucket) => [bucket.start.getTime(), bucket]));

  for (let index = 1; index < validSnapshots.length; index++) {
    const previous = validSnapshots[index - 1];
    const current = validSnapshots[index];
    const deltaViews = current.viewCount - previous.viewCount;
    if (deltaViews <= 0) continue;

    const pairStartMs = previous.capturedAt.getTime();
    const pairEndMs = current.capturedAt.getTime();
    const elapsedMs = pairEndMs - pairStartMs;
    if (elapsedMs <= 0) continue;

    let cursor = floorBucket(previous.capturedAt, bucketSize);
    while (cursor.getTime() < pairEndMs) {
      const next = addBucket(cursor, bucketSize);
      const overlapMs = Math.max(
        0,
        Math.min(pairEndMs, next.getTime()) - Math.max(pairStartMs, cursor.getTime()),
      );
      if (overlapMs > 0) {
        const bucket = bucketByStart.get(cursor.getTime());
        if (bucket) bucket.views += deltaViews * (overlapMs / elapsedMs);
      }
      cursor = next;
    }
  }

  return buckets;
}

export function chooseAutoViewGrowthBucketSize(
  snapshots: ViewGrowthSnapshotInput[],
): ViewGrowthBucketSize {
  const validSnapshots = normalizeViewGrowthSnapshots(snapshots);
  if (validSnapshots.length < 2) return "15m";

  const startedAt = validSnapshots[0].capturedAt.getTime();
  const endedAt = validSnapshots[validSnapshots.length - 1].capturedAt.getTime();
  const durationMs = endedAt - startedAt;

  if (durationMs <= AUTO_15M_MAX_MS) return "15m";
  if (durationMs <= AUTO_1H_MAX_MS) return "1h";
  if (durationMs <= AUTO_6H_MAX_MS) return "6h";
  return "1d";
}

export function resolveViewGrowthBucketSize(
  zoom: ViewGrowthZoom,
  snapshots: ViewGrowthSnapshotInput[],
): ViewGrowthBucketSize {
  return zoom === "auto" ? chooseAutoViewGrowthBucketSize(snapshots) : zoom;
}

export function viewsPerHourFromLatestValidPair(
  snapshots: ViewGrowthSnapshotInput[],
): number | null {
  const validSnapshots = normalizeViewGrowthSnapshots(snapshots);
  if (validSnapshots.length < 2) return null;

  const latest = validSnapshots[validSnapshots.length - 1];
  const previous = validSnapshots[validSnapshots.length - 2];
  const elapsedHours = (latest.capturedAt.getTime() - previous.capturedAt.getTime()) / HOUR_MS;
  if (elapsedHours <= 0) return null;

  return Math.max(0, latest.viewCount - previous.viewCount) / elapsedHours;
}

function buildBuckets(
  rangeStart: Date,
  rangeEnd: Date,
  bucketSize: ViewGrowthBucketSize,
) {
  const buckets: ViewGrowthBucket[] = [];
  let cursor = rangeStart;

  while (cursor.getTime() < rangeEnd.getTime()) {
    const start = new Date(cursor);
    const end = addBucket(start, bucketSize);
    buckets.push({
      key: `${bucketSize}:${start.toISOString()}`,
      start,
      end,
      views: 0,
    });
    cursor = end;
  }

  return buckets;
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

function toValidViewCount(value: bigint | number | string) {
  const numberValue = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return null;
  return numberValue;
}
