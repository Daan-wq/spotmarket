/**
 * Shared poll-runner used by `poll-metrics-hot` and `poll-metrics-warm` crons.
 *
 * Owner: A. Encapsulates: pick batch by tier → route to OAuth fetcher →
 * persist MetricSnapshot → compute velocity + flags → emit events.
 *
 * Polling is driven by `CampaignSubmission.nextMetricsPollAt`:
 *   - hot     active campaigns, every 15 min
 *   - warm    ended campaigns up to 90 days after deadline, daily
 *   - cold    ended campaigns older than 90 days, weekly
 */

import { prisma } from "@/lib/prisma";
import { Prisma, type $Enums } from "@prisma/client";
import { publishEvent } from "@/lib/event-bus";
import { failure, routeMetric, type MetricFetcherResult } from "./router";
import { fetchTikTokMetricsByVideoIds } from "./tiktok";
import { scoreVelocity, type FlagDraft } from "@/lib/velocity-scorer";
import { reconcileCampaignBudgetCap } from "@/lib/campaign-budget-cap";
import { calculatePaidViews } from "@/lib/paid-views";
import { syncAntiBotSignal } from "./anti-bot-signal";
import { reconcileReferralPayoutForSubmission } from "@/lib/referral-reconciliation";
import { VALID_METRIC_SNAPSHOT_WHERE } from "./valid-snapshots";
import { recordAccountRefreshFailure } from "@/lib/social-account-refresh";

export type Tier = "hot" | "warm" | "cold";

const ACTIVE_POLL_MS = 15 * 60 * 1000;
const ACTIVE_FAILURE_POLL_MS = 60 * 60 * 1000;
const ENDED_POLL_MS = 24 * 60 * 60 * 1000;
const OLD_ENDED_POLL_MS = 7 * 24 * 60 * 60 * 1000;
const OLD_ENDED_AFTER_MS = 90 * 24 * 60 * 60 * 1000;
const POLL_LOCK_TTL_MS = 10 * 60 * 1000;

const HOT_BATCH = 1000;
const WARM_BATCH = 300;
const COLD_BATCH = 100;

const POLLABLE_STATUSES: $Enums.SubmissionStatus[] = [
  "PENDING",
  "APPROVED",
  "NEEDS_REVISION",
  "REJECTED",
  "FLAGGED",
];

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
  rateLimited: number;
  flagged: number;
}

interface PollSubmission {
  id: string;
  postUrl: string;
  normalizedPlatform: string | null;
  platformVideoId: string | null;
  platformApiMediaId: string | null;
  platformMediaProductType: string | null;
  creatorId: string;
  campaignId: string;
  status: $Enums.SubmissionStatus;
  sourceConnectionType: $Enums.ConnectionType | null;
  sourceConnectionId: string | null;
  baselineViews: number | null;
  settledAt: Date | null;
  metricsRefreshFailures: number;
  payoutRunItems: Array<{ id: string }>;
  campaign: {
    status: $Enums.CampaignStatus;
    deadline: Date;
    creatorCpv: number | string | { toString(): string } | null;
    minimumPaidViews: number | null;
    maximumPaidViews: number | null;
  };
}

export async function pollSubmissions(opts: RunOptions): Promise<PollResult> {
  const runStartedAt = new Date();
  const submissions = await claimDueSubmissions(opts, runStartedAt);
  const prefetchedMetrics = await prefetchTikTokMetrics(submissions);

  let succeeded = 0;
  let failed = 0;
  let rateLimited = 0;
  let flagged = 0;

  for (const sub of submissions) {
    try {
      const fetched = prefetchedMetrics.get(sub.id) ?? await routeMetric(sub);

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
          where: {
            ...VALID_METRIC_SNAPSHOT_WHERE,
            submissionId: sub.id,
          },
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
              lastMetricsPollAttemptAt: snap.capturedAt,
              nextMetricsPollAt: computeNextMetricsPollAt(sub, fetched, snap.capturedAt),
              metricsPollLockedAt: null,
              metricsRefreshFailures: 0,
              viewCount: Math.min(cumulativeViews, 2_147_483_647),
              likeCount: fetched.metricAvailability.likes ? fetched.likeCount : null,
              commentCount: fetched.metricAvailability.comments ? fetched.commentCount : null,
              shareCount: fetched.metricAvailability.shares ? fetched.shareCount : null,
              velocityScore: scored.velocityScore ?? undefined,
              sourceMethod: "OAUTH",
              lastMetricsErrorCode: null,
              lastMetricsErrorMessage: null,
              lastMetricsErrorAt: null,
              ...(fetched.connection
                ? {
                    sourceConnectionType: fetched.connection.type,
                    sourceConnectionId: fetched.connection.id,
                  }
                : {}),
              ...(fetched.resolvedIdentity
                ? {
                    platformApiMediaId: fetched.resolvedIdentity.platformApiMediaId,
                    platformMediaProductType:
                      fetched.resolvedIdentity.mediaProductType ??
                      sub.platformMediaProductType,
                  }
                : {}),
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
        const failedAt = new Date();
        await prisma.metricPollFailure.create({
          data: {
            submissionId: sub.id,
            attemptedAt: failedAt,
            reason: fetched.reason,
            httpStatus: fetched.details?.httpStatus ?? null,
            providerCode: fetched.details?.providerCode ?? null,
            providerSubcode: fetched.details?.providerSubcode ?? null,
            providerType: fetched.details?.providerType ?? null,
            connectionType: fetched.connection?.type ?? null,
            connectionId: fetched.connection?.id ?? null,
            message: fetched.message,
            ...(fetched.details?.raw == null
              ? {}
              : { raw: fetched.details.raw as Prisma.InputJsonValue }),
          },
        });

        await prisma.campaignSubmission.update({
          where: { id: sub.id },
          data: {
            lastMetricsPollAttemptAt: failedAt,
            nextMetricsPollAt: computeNextMetricsPollAt(sub, fetched, failedAt),
            metricsPollLockedAt: null,
            lastMetricsErrorCode: fetched.reason,
            lastMetricsErrorMessage: fetched.message,
            lastMetricsErrorAt: failedAt,
            ...(fetched.reason === "RATE_LIMITED"
              ? {}
              : { metricsRefreshFailures: { increment: 1 } }),
          },
        });

        if (fetched.reason === "RATE_LIMITED") rateLimited++;
        if (
          fetched.reason === "TOKEN_BROKEN" ||
          fetched.reason === "TOKEN_EXPIRED" ||
          fetched.reason === "NO_TOKEN"
        ) {
          if (fetched.connection?.id) {
            const authError = Object.assign(new Error(fetched.message), {
              details: fetched.details
                ? {
                    providerCode: fetched.details.providerCode,
                    providerSubcode: fetched.details.providerSubcode,
                    providerType: fetched.details.providerType,
                    message: fetched.message,
                  }
                : undefined,
            });
            await recordAccountRefreshFailure({
              connectionType: fetched.connection.type,
              connectionId: fetched.connection.id,
              error: authError,
              code: fetched.reason,
              attemptedAt: failedAt,
            });
          }
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
      const erroredAt = new Date();
      const message = err instanceof Error ? err.message : "Unexpected metrics polling failure";
      failed++;
      await prisma.metricPollFailure
        .create({
          data: {
            submissionId: sub.id,
            attemptedAt: erroredAt,
            reason: "PLATFORM_ERROR",
            connectionType: sub.sourceConnectionType,
            connectionId: sub.sourceConnectionId,
            message,
          },
        })
        .catch(() => undefined);
      await prisma.campaignSubmission
        .update({
          where: { id: sub.id },
          data: {
            lastMetricsPollAttemptAt: erroredAt,
            nextMetricsPollAt: computeNextMetricsPollAt(sub, null, erroredAt),
            metricsPollLockedAt: null,
            metricsRefreshFailures: { increment: 1 },
            lastMetricsErrorCode: "PLATFORM_ERROR",
            lastMetricsErrorMessage: message,
            lastMetricsErrorAt: erroredAt,
          },
        })
        .catch(() => undefined);
    }
  }

  return {
    tier: opts.tier,
    processed: submissions.length,
    succeeded,
    failed,
    rateLimited,
    flagged,
  };
}

async function claimDueSubmissions(opts: RunOptions, runStartedAt: Date): Promise<PollSubmission[]> {
  const lockExpiresBefore = new Date(runStartedAt.getTime() - POLL_LOCK_TTL_MS);
  const candidates = await prisma.campaignSubmission.findMany({
    where: dueWhere(opts.tier, runStartedAt, lockExpiresBefore),
    orderBy: [
      { nextMetricsPollAt: { sort: "asc", nulls: "first" } },
      { lastMetricsRefreshAt: { sort: "asc", nulls: "first" } },
    ],
    take: opts.limit ?? batchSize(opts.tier),
    select: {
      id: true,
      postUrl: true,
      normalizedPlatform: true,
      platformVideoId: true,
      platformApiMediaId: true,
      platformMediaProductType: true,
      creatorId: true,
      campaignId: true,
      status: true,
      sourceConnectionType: true,
      sourceConnectionId: true,
      baselineViews: true,
      settledAt: true,
      metricsRefreshFailures: true,
      payoutRunItems: { select: { id: true }, take: 1 },
      campaign: {
        select: {
          status: true,
          deadline: true,
          creatorCpv: true,
          minimumPaidViews: true,
          maximumPaidViews: true,
        },
      },
    },
  });

  const claimed: PollSubmission[] = [];
  for (const candidate of candidates) {
    const claim = await prisma.campaignSubmission.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { metricsPollLockedAt: null },
          { metricsPollLockedAt: { lt: lockExpiresBefore } },
        ],
      },
      data: {
        metricsPollLockedAt: runStartedAt,
        lastMetricsPollAttemptAt: runStartedAt,
      },
    });
    if (claim.count === 1) claimed.push(candidate as PollSubmission);
  }
  return claimed;
}

function dueWhere(
  tier: Tier,
  now: Date,
  lockExpiresBefore: Date,
): Prisma.CampaignSubmissionWhereInput {
  return {
    AND: [
      { status: { in: POLLABLE_STATUSES } },
      tierScope(tier, now),
      {
        OR: [
          { nextMetricsPollAt: null },
          { nextMetricsPollAt: { lte: now } },
        ],
      },
      {
        OR: [
          { metricsPollLockedAt: null },
          { metricsPollLockedAt: { lt: lockExpiresBefore } },
        ],
      },
    ],
  };
}

function tierScope(tier: Tier, now: Date): Prisma.CampaignSubmissionWhereInput {
  const today = startOfLocalDay(now);
  const oldEndedCutoff = new Date(today.getTime() - OLD_ENDED_AFTER_MS);
  switch (tier) {
    case "hot":
      return { campaign: { status: "active", deadline: { gte: today } } };
    case "warm":
      return {
        campaign: {
          deadline: { gte: oldEndedCutoff },
          OR: [
            { status: { not: "active" } },
            { status: "active", deadline: { lt: today } },
          ],
        },
      };
    case "cold":
      return { campaign: { deadline: { lt: oldEndedCutoff } } };
  }
}

async function prefetchTikTokMetrics(
  submissions: PollSubmission[],
): Promise<Map<string, MetricFetcherResult>> {
  const results = new Map<string, MetricFetcherResult>();
  const byConnection = new Map<string, Array<{ submissionId: string; videoId: string }>>();

  for (const sub of submissions) {
    if (
      sub.normalizedPlatform !== "TIKTOK" ||
      sub.sourceConnectionType !== "TT" ||
      !sub.sourceConnectionId ||
      !(sub.platformApiMediaId ?? sub.platformVideoId)
    ) {
      continue;
    }
    const bucket = byConnection.get(sub.sourceConnectionId) ?? [];
    bucket.push({
      submissionId: sub.id,
      videoId: sub.platformApiMediaId ?? sub.platformVideoId!,
    });
    byConnection.set(sub.sourceConnectionId, bucket);
  }

  for (const [connectionId, targets] of byConnection) {
    const conn = await prisma.creatorTikTokConnection.findFirst({
      where: {
        id: connectionId,
        isVerified: true,
        accessToken: { not: null },
      },
    });
    if (!conn) {
      for (const target of targets) {
        results.set(
          target.submissionId,
          failure("NO_CONNECTION", "Stored TT account connection is no longer available", {
            type: "TT",
            id: connectionId,
          }),
        );
      }
      continue;
    }

    const fetched = await fetchTikTokMetricsByVideoIds(conn, targets);
    for (const [submissionId, result] of fetched) results.set(submissionId, result);
  }

  return results;
}

function computeNextMetricsPollAt(
  sub: PollSubmission,
  fetched: MetricFetcherResult | null,
  now: Date,
): Date {
  const active = isActiveCampaign(sub.campaign, now);
  const failed = fetched == null || !fetched.ok;
  if (fetched && !fetched.ok && fetched.reason === "RATE_LIMITED") {
    return new Date(now.getTime() + ACTIVE_POLL_MS);
  }
  if (active) {
    if (failed) {
      return new Date(now.getTime() + ACTIVE_FAILURE_POLL_MS);
    }
    return new Date(now.getTime() + ACTIVE_POLL_MS);
  }

  if (failed) return new Date(now.getTime() + OLD_ENDED_POLL_MS);
  const deadline = sub.campaign.deadline instanceof Date ? sub.campaign.deadline : now;
  const endedAgeMs = now.getTime() - deadline.getTime();
  return new Date(now.getTime() + (endedAgeMs > OLD_ENDED_AFTER_MS ? OLD_ENDED_POLL_MS : ENDED_POLL_MS));
}

function isActiveCampaign(
  campaign: { status: $Enums.CampaignStatus; deadline: Date },
  now: Date,
): boolean {
  return campaign.status === "active" &&
    campaign.deadline instanceof Date &&
    campaign.deadline >= startOfLocalDay(now);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

function batchSize(tier: Tier): number {
  return tier === "hot" ? HOT_BATCH : tier === "warm" ? WARM_BATCH : COLD_BATCH;
}
