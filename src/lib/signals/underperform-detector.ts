/**
 * Underperform detector — periodic + event-driven.
 *
 * After a submission has had 48h to perform, if its observed metrics fall
 * below campaign p10 across one or more dimensions, publish
 * `submission.underperform` with `weakDimensions[]`.
 *
 * Dimensions checked: views (viewsPerHour), likeRatio, commentRatio.
 * (`watchTime` is in the contract for forward-compatibility but A doesn't
 * yet expose a campaign benchmark for it; we omit it from this v1 detector
 * unless a future schema addition lands.)
 *
 * Owner: Subsystem B.
 */

import { on, publishEvent } from "@/lib/event-bus";
import { prisma } from "@/lib/prisma";
import type {
  SubmissionMetricsUpdatedEvent,
  SubmissionUnderperformEvent,
} from "@/lib/contracts/events";
import { viewsPerHourFromSnapshots } from "./viral-detector";

export const UNDERPERFORM_AFTER_HOURS = 48;
/** Cap on how old a submission can be before we stop scanning it. */
export const UNDERPERFORM_MAX_AGE_HOURS = 30 * 24;

export type WeakDimension = "views" | "likeRatio" | "commentRatio" | "watchTime";

export interface UnderperformInputs {
  submissionCreatedAt: Date;
  now: Date;
  observedViewsPerHour: number | null;
  observedLikeRatio: number | null;
  observedCommentRatio: number | null;
  campaignVelocityP10: number;
  campaignLikeRatioP50: number;
  campaignCommentRatioP50: number;
}

/**
 * Pure decision function. Returns the list of weak dimensions, or [] if the
 * submission performs at or above thresholds, or null if it's outside the
 * scanning window.
 *
 * Note: we use p10 for views (lower-bound) but p50 for engagement ratios —
 * engagement ratios cluster much tighter than view velocity, so p10 there is
 * usually meaninglessly close to zero. p50 gives us a useful weak-signal.
 */
export function evaluateUnderperform(
  args: UnderperformInputs
): WeakDimension[] | null {
  const ageHours =
    (args.now.getTime() - args.submissionCreatedAt.getTime()) /
    (1000 * 60 * 60);
  if (ageHours < UNDERPERFORM_AFTER_HOURS) return null;
  if (ageHours > UNDERPERFORM_MAX_AGE_HOURS) return null;

  const weak: WeakDimension[] = [];
  if (
    args.observedViewsPerHour !== null &&
    args.campaignVelocityP10 > 0 &&
    args.observedViewsPerHour < args.campaignVelocityP10
  ) {
    weak.push("views");
  }
  if (
    args.observedLikeRatio !== null &&
    args.campaignLikeRatioP50 > 0 &&
    args.observedLikeRatio < args.campaignLikeRatioP50 * 0.5
  ) {
    weak.push("likeRatio");
  }
  if (
    args.observedCommentRatio !== null &&
    args.campaignCommentRatioP50 > 0 &&
    args.observedCommentRatio < args.campaignCommentRatioP50 * 0.5
  ) {
    weak.push("commentRatio");
  }
  return weak;
}

interface ScanResult {
  published: boolean;
  reason?: string;
  weakDimensions?: WeakDimension[];
}

/** Inspect a single submission and publish if it underperforms. */
export async function scanSubmission(
  submissionId: string,
  now: Date = new Date()
): Promise<ScanResult> {
  const submission = await prisma.campaignSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      createdAt: true,
      campaignId: true,
      creatorId: true,
    },
  });
  if (!submission) return { published: false, reason: "submission-missing" };

  const benchmark = await prisma.campaignBenchmark.findFirst({
    where: { campaignId: submission.campaignId },
    orderBy: { computedAt: "desc" },
    select: {
      velocityP10: true,
      likeRatioP50: true,
      commentRatioP50: true,
    },
  });
  if (!benchmark) return { published: false, reason: "no-benchmark" };

  const snaps = await prisma.metricSnapshot.findMany({
    where: { submissionId: submission.id },
    orderBy: { capturedAt: "asc" },
    select: {
      capturedAt: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
    },
  });

  const observedViewsPerHour = viewsPerHourFromSnapshots(snaps);
  const last = snaps[snaps.length - 1];
  const lastViews = last ? Number(last.viewCount) : 0;
  const observedLikeRatio = last && lastViews > 0 ? last.likeCount / lastViews : null;
  const observedCommentRatio =
    last && lastViews > 0 ? last.commentCount / lastViews : null;

  const weak = evaluateUnderperform({
    submissionCreatedAt: submission.createdAt,
    now,
    observedViewsPerHour,
    observedLikeRatio,
    observedCommentRatio,
    campaignVelocityP10: benchmark.velocityP10,
    campaignLikeRatioP50: benchmark.likeRatioP50,
    campaignCommentRatioP50: benchmark.commentRatioP50,
  });
  if (weak === null) return { published: false, reason: "outside-window" };
  if (weak.length === 0) return { published: false, reason: "performing-ok" };

  const event: SubmissionUnderperformEvent = {
    type: "submission.underperform",
    submissionId: submission.id,
    campaignId: submission.campaignId,
    creatorId: submission.creatorId,
    weakDimensions: weak,
    occurredAt: now.toISOString(),
  };
  await publishEvent(event);
  return { published: true, weakDimensions: weak };
}

/**
 * Periodic scan — runs nightly via the recompute-scores cron.
 * Looks at submissions older than 48h but newer than the max age,
 * with status APPROVED or PENDING.
 */
export async function scanAllRecentSubmissions(
  now: Date = new Date()
): Promise<{ scanned: number; published: number }> {
  const minAge = new Date(
    now.getTime() - UNDERPERFORM_MAX_AGE_HOURS * 60 * 60 * 1000
  );
  const maxAge = new Date(now.getTime() - UNDERPERFORM_AFTER_HOURS * 60 * 60 * 1000);

  const subs = await prisma.campaignSubmission.findMany({
    where: {
      createdAt: { gte: minAge, lte: maxAge },
      status: { in: ["APPROVED", "PENDING"] },
    },
    select: { id: true },
  });

  let published = 0;
  for (const s of subs) {
    try {
      const r = await scanSubmission(s.id, now);
      if (r.published) published++;
    } catch (err) {
      console.error("[underperform-detector] scan failed", { id: s.id, err });
    }
  }
  return { scanned: subs.length, published };
}

/** Wire bus subscriber — also reacts to metric updates after the 48h mark. */
export function registerUnderperformDetector(): void {
  on("submission.metrics.updated", async (event: SubmissionMetricsUpdatedEvent) => {
    try {
      await scanSubmission(event.submissionId);
    } catch (err) {
      console.error("[underperform-detector] handler error", err);
    }
  });
}
