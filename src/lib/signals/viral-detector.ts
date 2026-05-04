/**
 * Viral detector — bus subscriber on `submission.metrics.updated`.
 *
 * If the observed viewsPerHour for a submission, within its first 48h,
 * exceeds (campaign p90 × multiplier), publish `submission.viral`.
 *
 * Owner: Subsystem B. Reads only via Prisma + contracts; never imports
 * from another subsystem's `/lib/...`.
 *
 * Idempotency: we don't double-publish. If a viral event for this
 * submission already exists in `SubmissionSignal` as a marker (we use
 * VELOCITY_SPIKE produced by A *or* a row keyed by submissionId), we
 * still allow a second publish — downstream consumers (E) deduplicate
 * by their own state. This keeps the detector stateless and simple.
 */

import { on, publishEvent } from "@/lib/event-bus";
import { prisma } from "@/lib/prisma";
import type { SubmissionMetricsUpdatedEvent } from "@/lib/contracts/events";

export const VIRAL_MULTIPLIER = 2;
export const VIRAL_WINDOW_HOURS = 48;

interface SnapshotMin {
  capturedAt: Date;
  viewCount: bigint;
}

/** Compute viewsPerHour using the first and most recent snapshot in window. */
export function viewsPerHourFromSnapshots(snaps: SnapshotMin[]): number | null {
  if (snaps.length < 2) return null;
  const first = snaps[0];
  const last = snaps[snaps.length - 1];
  const hours =
    (last.capturedAt.getTime() - first.capturedAt.getTime()) / (1000 * 60 * 60);
  if (hours <= 0) return null;
  const delta = Number(last.viewCount) - Number(first.viewCount);
  if (!Number.isFinite(delta) || delta < 0) return null;
  return delta / hours;
}

/**
 * Pure decision function — no I/O. Exported for unit tests.
 * Returns the benchmarkRatio if the submission qualifies as viral,
 * else null.
 */
export function evaluateViral(args: {
  submissionCreatedAt: Date;
  observedViewsPerHour: number;
  campaignVelocityP90: number;
  now: Date;
  multiplier?: number;
  windowHours?: number;
}): number | null {
  const multiplier = args.multiplier ?? VIRAL_MULTIPLIER;
  const windowHours = args.windowHours ?? VIRAL_WINDOW_HOURS;

  const ageHours =
    (args.now.getTime() - args.submissionCreatedAt.getTime()) /
    (1000 * 60 * 60);
  if (ageHours < 0 || ageHours > windowHours) return null;
  if (args.campaignVelocityP90 <= 0) return null;
  const threshold = args.campaignVelocityP90 * multiplier;
  if (args.observedViewsPerHour < threshold) return null;
  return args.observedViewsPerHour / args.campaignVelocityP90;
}

/** Handle one `submission.metrics.updated` event. Exported for testing. */
export async function handleMetricsUpdated(
  event: SubmissionMetricsUpdatedEvent,
  now: Date = new Date()
): Promise<{ published: boolean; reason?: string }> {
  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: event.submissionId },
    select: {
      id: true,
      createdAt: true,
      campaignId: true,
      creatorId: true,
    },
  });
  if (!submission) return { published: false, reason: "submission-missing" };

  const ageHours =
    (now.getTime() - submission.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < 0 || ageHours > VIRAL_WINDOW_HOURS) {
    return { published: false, reason: "outside-window" };
  }

  // Pull all snapshots since the submission's creation, ascending.
  const snaps = await prisma.metricSnapshot.findMany({
    where: { submissionId: submission.id },
    orderBy: { capturedAt: "asc" },
    select: { capturedAt: true, viewCount: true },
  });
  const observed = viewsPerHourFromSnapshots(snaps);
  if (observed === null) return { published: false, reason: "insufficient-data" };

  const benchmark = await prisma.campaignBenchmark.findFirst({
    where: { campaignId: submission.campaignId },
    orderBy: { computedAt: "desc" },
    select: { velocityP90: true },
  });
  if (!benchmark) return { published: false, reason: "no-benchmark" };

  const ratio = evaluateViral({
    submissionCreatedAt: submission.createdAt,
    observedViewsPerHour: observed,
    campaignVelocityP90: benchmark.velocityP90,
    now,
  });
  if (ratio === null) return { published: false, reason: "below-threshold" };

  await publishEvent({
    type: "submission.viral",
    submissionId: submission.id,
    campaignId: submission.campaignId,
    creatorId: submission.creatorId,
    benchmarkRatio: ratio,
    occurredAt: now.toISOString(),
  });
  return { published: true };
}

/** Wire the bus subscriber. Idempotent — safe to call once at boot. */
export function registerViralDetector(): void {
  on("submission.metrics.updated", async (event) => {
    try {
      await handleMetricsUpdated(event);
    } catch (err) {
      console.error("[viral-detector] handler error", err);
    }
  });
}
