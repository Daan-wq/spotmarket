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
 *                                       but cold rows have lastMetricsRefreshAt > 23h)
 *   - frozen  >30 days  off            (excluded by the runner)
 */

import { prisma } from "@/lib/prisma";
import { Prisma, type $Enums } from "@prisma/client";
import { publishEvent } from "@/lib/event-bus";
import { routeMetric } from "./router";
import { scoreVelocity, type FlagDraft } from "@/lib/velocity-scorer";
import { reconcileCampaignBudgetCap } from "@/lib/campaign-budget-cap";
import { calculatePaidViews } from "@/lib/paid-views";
import { UNAVAILABLE_METRICS } from "@/lib/contracts/metrics";
import { syncAntiBotSignal } from "./anti-bot-signal";
import { reconcileReferralPayoutForSubmission } from "@/lib/referral-reconciliation";

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
        { lastMetricsRefreshAt: null },
        { lastMetricsRefreshAt: { lt: staleBefore } },
      ],
    },
    orderBy: [{ lastMetricsRefreshAt: { sort: "asc", nulls: "first" } }],
    take: opts.limit ?? batchSize(opts.tier),
    select: {
      id: true,
      postUrl: true,
      creatorId: true,
      campaignId: true,
      status: true,
      sourceConnectionType: true,
      sourceConnectionId: true,
      baselineViews: true,
      settledAt: true,
      payoutRunItems: { select: { id: true }, take: 1 },
      campaign: {
        select: {
          creatorCpv: true,
          minimumPaidViews: true,
          maximumPaidViews: true,
        },
      },
    },
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
            metricAvailability: fetched.metricAvailability as unknown as Prisma.InputJsonValue,
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
          orderBy: { capturedAt: "desc" },
          take: 200,
          select: {
            capturedAt: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            shareCount: true,
            saveCount: true,
            metricAvailability: true,
          },
        });
        const recentAsc = [...recent].reverse();

        const [campaignBenchmark, accountSnapshot] = await Promise.all([
          prisma.campaignBenchmark.findFirst({
            where: { campaignId: sub.campaignId },
            orderBy: { computedAt: "desc" },
            select: { velocityP50: true, velocityP90: true },
          }),
          fetched.connection
            ? prisma.platformAccountSnapshot.findFirst({
                where: {
                  connectionType: fetched.connection.type,
                  connectionId: fetched.connection.id,
                },
                orderBy: { capturedAt: "desc" },
                select: { audienceCount: true },
              })
            : Promise.resolve(null),
        ]);

        const scored = scoreVelocity({
          snapshots: recentAsc,
          campaignBenchmark,
          accountSnapshot,
          now: snap.capturedAt,
        });

        const prev = recentAsc.length >= 2 ? recentAsc[recentAsc.length - 2] : null;
        const deltaViews = prev ? Number(snap.viewCount) - Number(prev.viewCount) : Number(snap.viewCount);
        const cumulativeViews = Number(snap.viewCount);
        const shouldRefreshEarnings =
          sub.status === "APPROVED" &&
          !sub.settledAt &&
          sub.payoutRunItems.length === 0;
        const paidViews = shouldRefreshEarnings
          ? calculatePaidViews({
              rawViews: cumulativeViews,
              baselineViews: sub.baselineViews,
              minimumPaidViews: sub.campaign.minimumPaidViews,
              maximumPaidViews: sub.campaign.maximumPaidViews,
              creatorCpv: sub.campaign.creatorCpv,
            })
          : null;

        await prisma.$transaction(async (tx) => {
          await tx.campaignSubmission.update({
            where: { id: sub.id },
            data: {
              lastMetricsRefreshAt: snap.capturedAt,
              metricsRefreshFailures: 0,
              viewCount: Math.min(cumulativeViews, 2_147_483_647),
              likeCount: fetched.metricAvailability.likes ? fetched.likeCount : null,
              commentCount: fetched.metricAvailability.comments ? fetched.commentCount : null,
              shareCount: fetched.metricAvailability.shares ? fetched.shareCount : null,
              velocityScore: scored.velocityScore ?? undefined,
              sourceMethod: "OAUTH",
              ...(paidViews
                ? {
                    eligibleViews: paidViews.payableViews,
                    earnedAmount: paidViews.earnedAmount,
                  }
                : {}),
            },
          });

          if (!paidViews) return;

          const budgetCap = await reconcileCampaignBudgetCap(tx, sub.campaignId);
          const referralSubmissionIds = new Set([
            sub.id,
            ...budgetCap.changedSubmissionIds,
          ]);
          for (const changedSubmissionId of referralSubmissionIds) {
            await reconcileReferralPayoutForSubmission(tx, changedSubmissionId);
          }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        await publishEvent({
          type: "submission.metrics.updated",
          submissionId: sub.id,
          snapshotId: snap.id,
          deltaViews,
          cumulativeViews,
          occurredAt: new Date().toISOString(),
        });

        const antiBotSync = scored.antiBot
          ? await syncAntiBotSignal(sub.id, scored.antiBot)
          : { action: "unchanged" as const };
        if (antiBotSync.action === "created") {
          flagged++;
        }

        for (const flag of scored.flags) {
          if (flag.type === "BOT_SUSPECTED") continue;
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
            metricAvailability: UNAVAILABLE_METRICS as unknown as Prisma.InputJsonValue,
            raw: { reason: fetched.reason, message: fetched.message } as Prisma.InputJsonValue,
          },
        });

        await prisma.campaignSubmission.update({
          where: { id: sub.id },
          data: {
            lastMetricsRefreshAt: new Date(),
            metricsRefreshFailures: { increment: 1 },
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
          data: { lastMetricsRefreshAt: new Date(), metricsRefreshFailures: { increment: 1 } },
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

export async function emitFlag(submissionId: string, flag: FlagDraft): Promise<void> {
  const existingOpenSignal = await prisma.submissionSignal.findFirst({
    where: {
      submissionId,
      type: flag.type,
      resolvedAt: null,
    },
    select: { id: true, severity: true, payload: true },
  });
  if (existingOpenSignal) {
    if (shouldStrengthenSignal(existingOpenSignal, flag)) {
      await prisma.submissionSignal.update({
        where: { id: existingOpenSignal.id },
        data: {
          severity: flag.severity,
          payload: flag.payload as Prisma.InputJsonValue,
        },
      });
    }
    return;
  }

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

function shouldStrengthenSignal(
  existing: { severity?: string; payload?: unknown },
  flag: FlagDraft,
): boolean {
  const existingRank = severityRank(existing.severity);
  const nextRank = severityRank(flag.severity);
  if (existingRank == null || nextRank == null) return false;
  if (nextRank > existingRank) return true;
  if (flag.type !== "BOT_SUSPECTED") return false;

  const existingRisk = payloadRisk(existing.payload);
  const nextRisk = payloadRisk(flag.payload);
  return nextRisk != null && (existingRisk == null || nextRisk > existingRisk);
}

function severityRank(severity: string | undefined): number | null {
  if (severity === "INFO") return 0;
  if (severity === "WARN") return 1;
  if (severity === "CRITICAL") return 2;
  return null;
}

function payloadRisk(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const risk = (payload as { riskScore?: unknown }).riskScore;
  return typeof risk === "number" && Number.isFinite(risk) ? risk : null;
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
