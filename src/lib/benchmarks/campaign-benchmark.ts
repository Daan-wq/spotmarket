/**
 * Campaign Benchmark — rolling p10/p50/p90 of view-velocity, like-ratio, comment-ratio.
 *
 * Owner: Subsystem B (Performance Intelligence).
 *
 * Inputs (read-only across boundaries):
 *   - Prisma `MetricSnapshot` rows for active submissions in a campaign.
 * Outputs:
 *   - `CampaignBenchmark` row written via Prisma.
 *   - `campaign.benchmark.recomputed` event published on the bus.
 *
 * Rolling window: by default last 14 days; configurable via `windowHours`.
 *
 * Velocity definition (per submission):
 *   For each submission with at least 2 snapshots in the window, compute
 *     viewsPerHour = (viewCount[last] - viewCount[first]) / hoursBetween
 *   We use the inclusive window range; submissions with < 1 hour of data,
 *   only one snapshot, or non-positive elapsed time are skipped.
 *
 * Engagement ratio definition (per submission):
 *   Take the latest snapshot in the window; ratio = like / max(views, 1).
 *   Skip submissions whose latest snapshot has 0 views.
 *
 * Percentiles use linear interpolation between order-statistics.
 */

import type { CampaignBenchmark } from "@/lib/contracts/scores";
import type { MetricSnapshot } from "@/lib/contracts/metrics";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/event-bus";

const DEFAULT_WINDOW_HOURS = 14 * 24;

export interface BenchmarkInput {
  /** Per-submission, ordered ascending by capturedAt. */
  snapshotsBySubmission: Map<string, MetricSnapshot[]>;
}

export interface BenchmarkStats {
  velocityP10: number;
  velocityP50: number;
  velocityP90: number;
  likeRatioP50: number;
  likeRatioP90: number;
  commentRatioP50: number;
  commentRatioP90: number;
  sampleSize: number;
}

/** Linear-interpolation percentile. `q` in [0..1]. Returns 0 for empty input. */
export function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const clamped = Math.min(1, Math.max(0, q));
  const idx = clamped * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/** Compute viewsPerHour for a single submission's snapshot series (ascending). */
export function viewsPerHourForSeries(snaps: MetricSnapshot[]): number | null {
  if (snaps.length < 2) return null;
  const first = snaps[0];
  const last = snaps[snaps.length - 1];
  const elapsedMs = last.capturedAt.getTime() - first.capturedAt.getTime();
  if (elapsedMs <= 0) return null;
  const hours = elapsedMs / (1000 * 60 * 60);
  if (hours < 1) return null;
  const delta = Number(last.viewCount) - Number(first.viewCount);
  if (!Number.isFinite(delta) || delta < 0) return null;
  return delta / hours;
}

export function computeBenchmarkStats(input: BenchmarkInput): BenchmarkStats {
  const velocities: number[] = [];
  const likeRatios: number[] = [];
  const commentRatios: number[] = [];

  for (const snaps of input.snapshotsBySubmission.values()) {
    if (snaps.length === 0) continue;
    const v = viewsPerHourForSeries(snaps);
    if (v !== null && Number.isFinite(v)) velocities.push(v);

    const last = snaps[snaps.length - 1];
    const views = Number(last.viewCount);
    if (views > 0) {
      likeRatios.push(last.likeCount / views);
      commentRatios.push(last.commentCount / views);
    }
  }

  velocities.sort((a, b) => a - b);
  likeRatios.sort((a, b) => a - b);
  commentRatios.sort((a, b) => a - b);

  return {
    velocityP10: percentile(velocities, 0.1),
    velocityP50: percentile(velocities, 0.5),
    velocityP90: percentile(velocities, 0.9),
    likeRatioP50: percentile(likeRatios, 0.5),
    likeRatioP90: percentile(likeRatios, 0.9),
    commentRatioP50: percentile(commentRatios, 0.5),
    commentRatioP90: percentile(commentRatios, 0.9),
    sampleSize: velocities.length,
  };
}

/**
 * Load snapshots for all submissions of a campaign within the rolling window
 * and return them grouped by submissionId, each ascending by capturedAt.
 */
export async function loadCampaignSnapshots(
  campaignId: string,
  windowHours = DEFAULT_WINDOW_HOURS
): Promise<Map<string, MetricSnapshot[]>> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const rows = await prisma.metricSnapshot.findMany({
    where: {
      capturedAt: { gte: since },
      submission: { campaignId },
    },
    orderBy: [{ submissionId: "asc" }, { capturedAt: "asc" }],
    select: {
      id: true,
      submissionId: true,
      capturedAt: true,
      source: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      saveCount: true,
      watchTimeSec: true,
      reachCount: true,
    },
  });

  const grouped = new Map<string, MetricSnapshot[]>();
  for (const r of rows) {
    const arr = grouped.get(r.submissionId) ?? [];
    arr.push(r as MetricSnapshot);
    grouped.set(r.submissionId, arr);
  }
  return grouped;
}

/**
 * Compute and persist a `CampaignBenchmark` for a single campaign.
 * Returns the created row (typed against the contract). Publishes
 * `campaign.benchmark.recomputed` on success.
 */
export async function recomputeCampaignBenchmark(
  campaignId: string,
  windowHours = DEFAULT_WINDOW_HOURS
): Promise<CampaignBenchmark | null> {
  const snapshotsBySubmission = await loadCampaignSnapshots(campaignId, windowHours);
  const stats = computeBenchmarkStats({ snapshotsBySubmission });

  // Skip writing benchmarks with no data — saves rows and avoids polluting p10/p90.
  if (stats.sampleSize === 0) return null;

  const row = await prisma.campaignBenchmark.create({
    data: {
      campaignId,
      windowHours,
      velocityP10: stats.velocityP10,
      velocityP50: stats.velocityP50,
      velocityP90: stats.velocityP90,
      likeRatioP50: stats.likeRatioP50,
      likeRatioP90: stats.likeRatioP90,
      commentRatioP50: stats.commentRatioP50,
      commentRatioP90: stats.commentRatioP90,
      sampleSize: stats.sampleSize,
    },
  });

  await publishEvent({
    type: "campaign.benchmark.recomputed",
    campaignId,
    benchmarkId: row.id,
    occurredAt: new Date().toISOString(),
  });

  return {
    id: row.id,
    campaignId: row.campaignId,
    computedAt: row.computedAt,
    velocityP10: row.velocityP10,
    velocityP50: row.velocityP50,
    velocityP90: row.velocityP90,
    likeRatioP50: row.likeRatioP50,
    likeRatioP90: row.likeRatioP90,
    commentRatioP50: row.commentRatioP50,
    commentRatioP90: row.commentRatioP90,
    sampleSize: row.sampleSize,
    windowHours: row.windowHours,
  };
}

/**
 * Recompute benchmarks for every active campaign with submissions.
 * Used by the every-6h cron.
 */
export async function recomputeAllCampaignBenchmarks(
  windowHours = DEFAULT_WINDOW_HOURS
): Promise<{ campaigns: number; written: number; skipped: number }> {
  const campaigns = await prisma.campaign.findMany({
    where: { status: "active" },
    select: { id: true },
  });

  let written = 0;
  let skipped = 0;
  for (const c of campaigns) {
    try {
      const result = await recomputeCampaignBenchmark(c.id, windowHours);
      if (result) written++;
      else skipped++;
    } catch (err) {
      console.error("[campaign-benchmark] failed", { campaignId: c.id, err });
      skipped++;
    }
  }
  return { campaigns: campaigns.length, written, skipped };
}

export const __test__ = { DEFAULT_WINDOW_HOURS };
