/**
 * Shared poll-runner used by `poll-metrics-hot` and `poll-metrics-warm` crons.
 *
 * Owner: A. Encapsulates: pick batch by tier → route to OAuth fetcher →
 * persist MetricSnapshot → compute velocity + flags → emit events.
 *
 * Polling tiers (driven by `submission.createdAt` age):
 *   - hot     <  24h    every 15 min   (handled by /api/cron/poll-metrics-hot)
 *   - warm    1–7 days  hourly         (handled by /api/cron/poll-metrics-warm)
 *   - cold    >7 days   daily          (folded into warm; warm cron runs once/hour
 *                                       but cold rows have lastScrapedAt > 23h)
 *   - frozen  >30 days  off            (excluded by the runner)
 */

import { prisma } from "@/lib/prisma";
import { Prisma, type $Enums } from "@prisma/client";
import { publishEvent } from "@/lib/event-bus";
import { routeMetric } from "./router";
import { scoreVelocity, type FlagDraft } from "@/lib/velocity-scorer";

export type Tier = "hot" | "warm" | "cold";

const HOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const WARM_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const COLD_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const HOT_STALE_MS = 14 * 60 * 1000;     // < 15 min freshness
const WARM_STALE_MS = 55 * 60 * 1000;    // < 1 hour freshness
const COLD_STALE_MS = 23 * 60 * 60 * 1000; // < 24 hour freshness

const HOT_BATCH = 100;
const WARM_BATCH = 200;
const COLD_BATCH = 50;

const ACTIVE_STATUSES: $Enums.SubmissionStatus[] = ["PENDING", "APPROVED", "FLAGGED"];

interface RunOptions {
  tier: Tier;
  /** Override batch size (test/admin). */
  limit?: number;
}

export interface PollResult {
  tier: Tier;
  processed: number;
  succeeded: number;
  failed: number;
  flagged: number;
}

export async function pollSubmissions(opts: RunOptions): Promise<PollResult> {
  const now = Date.now();
  const minCreatedAt = ageWindow(opts.tier).minCreatedAt;
  const maxCreatedAt = ageWindow(opts.tier).maxCreatedAt;
  const staleBefore = new Date(now - ageWindow(opts.tier).staleMs);

  const submissions = await prisma.campaignSubmission.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      createdAt: { gt: minCreatedAt, lte: maxCreatedAt },
      OR: [
        { lastScrapedAt: null },
        { lastScrapedAt: { lt: staleBefore } },
      ],
    },
    orderBy: [{ lastScrapedAt: { sort: "asc", nulls: "first" } }],
    take: opts.limit ?? batchSize(opts.tier),
    select: { id: true, postUrl: true, creatorId: true },
  });

  let succeeded = 0;
  let failed = 0;
  let flagged = 0;

  for (const sub of submissions) {
    try {
      const fetched = await routeMetric(sub);

      if (fetched.ok) {
        const snap = await prisma.metricSnapshot.create({
          data: {
            submissionId: sub.id,
            source: fetched.source,
            viewCount: fetched.viewCount,
            likeCount: fetched.likeCount,
            commentCount: fetched.commentCount,
            shareCount: fetched.shareCount,
            saveCount: fetched.saveCount,
            watchTimeSec: fetched.watchTimeSec,
            reachCount: fetched.reachCount,
            raw: fetched.raw == null ? Prisma.JsonNull : (fetched.raw as Prisma.InputJsonValue),
            totalInteractions: fetched.totalInteractions ?? null,
            followsFromMedia: fetched.followsFromMedia ?? null,
            profileVisits: fetched.profileVisits ?? null,
            profileActivity:
              fetched.profileActivity == null
                ? Prisma.JsonNull
                : (fetched.profileActivity as Prisma.InputJsonValue),
            reactionsByType:
              fetched.reactionsByType == null
                ? Prisma.JsonNull
                : (fetched.reactionsByType as Prisma.InputJsonValue),
          },
          select: { id: true, viewCount: true, capturedAt: true },
        });

        const recent = await prisma.metricSnapshot.findMany({
          where: { submissionId: sub.id },
          orderBy: { capturedAt: "asc" },
          take: 200,
          select: {
            capturedAt: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            shareCount: true,
          },
        });

        const scored = scoreVelocity({ snapshots: recent });

        const prev = recent.length >= 2 ? recent[recent.length - 2] : null;
        const deltaViews = prev ? Number(snap.viewCount) - Number(prev.viewCount) : Number(snap.viewCount);
        const cumulativeViews = Number(snap.viewCount);

        await prisma.campaignSubmission.update({
          where: { id: sub.id },
          data: {
            lastScrapedAt: snap.capturedAt,
            scrapeFailures: 0,
            viewCount: Math.min(cumulativeViews, 2_147_483_647),
            likeCount: fetched.likeCount,
            commentCount: fetched.commentCount,
            shareCount: fetched.shareCount,
            velocityScore: scored.velocityScore ?? undefined,
            sourceMethod: "OAUTH",
          },
        });

        await publishEvent({
          type: "submission.metrics.updated",
          submissionId: sub.id,
          snapshotId: snap.id,
          deltaViews,
          cumulativeViews,
          occurredAt: new Date().toISOString(),
        });

        for (const flag of scored.flags) {
          await emitFlag(sub.id, flag);
          flagged++;
        }
        succeeded++;
      } else {
        await prisma.metricSnapshot.create({
          data: {
            submissionId: sub.id,
            source: "OAUTH_FAILED",
            viewCount: BigInt(0),
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            raw: { reason: fetched.reason, message: fetched.message } as Prisma.InputJsonValue,
          },
        });

        await prisma.campaignSubmission.update({
          where: { id: sub.id },
          data: {
            lastScrapedAt: new Date(),
            scrapeFailures: { increment: 1 },
          },
        });

        if (fetched.reason === "TOKEN_BROKEN" || fetched.reason === "TOKEN_EXPIRED") {
          await emitFlag(sub.id, {
            type: "TOKEN_BROKEN",
            severity: "WARN",
            payload: {
              reason: fetched.message,
              connectionType: fetched.connection?.type ?? "IG",
              connectionId: fetched.connection?.id ?? "",
            },
          });
          flagged++;
        }
        failed++;
      }
    } catch (err) {
      console.error(`[poll-runner] ${sub.id}`, err);
      failed++;
      await prisma.campaignSubmission
        .update({
          where: { id: sub.id },
          data: { lastScrapedAt: new Date(), scrapeFailures: { increment: 1 } },
        })
        .catch(() => undefined);
    }
  }

  return {
    tier: opts.tier,
    processed: submissions.length,
    succeeded,
    failed,
    flagged,
  };
}

async function emitFlag(submissionId: string, flag: FlagDraft): Promise<void> {
  const signal = await prisma.submissionSignal.create({
    data: {
      submissionId,
      type: flag.type,
      severity: flag.severity,
      payload: flag.payload as Prisma.InputJsonValue,
    },
    select: { id: true, createdAt: true },
  });
  await publishEvent({
    type: "submission.flagged",
    submissionId,
    signalId: signal.id,
    signal: flag.type,
    severity: flag.severity,
    occurredAt: signal.createdAt.toISOString(),
  });
}

function ageWindow(tier: Tier): { minCreatedAt: Date; maxCreatedAt: Date; staleMs: number } {
  const now = Date.now();
  switch (tier) {
    case "hot":
      return {
        minCreatedAt: new Date(now - HOT_MAX_AGE_MS),
        maxCreatedAt: new Date(now + 1),
        staleMs: HOT_STALE_MS,
      };
    case "warm":
      return {
        minCreatedAt: new Date(now - WARM_MAX_AGE_MS),
        maxCreatedAt: new Date(now - HOT_MAX_AGE_MS),
        staleMs: WARM_STALE_MS,
      };
    case "cold":
      return {
        minCreatedAt: new Date(now - COLD_MAX_AGE_MS),
        maxCreatedAt: new Date(now - WARM_MAX_AGE_MS),
        staleMs: COLD_STALE_MS,
      };
  }
}

function batchSize(tier: Tier): number {
  return tier === "hot" ? HOT_BATCH : tier === "warm" ? WARM_BATCH : COLD_BATCH;
}
