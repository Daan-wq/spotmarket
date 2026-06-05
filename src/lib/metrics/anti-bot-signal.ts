import { Prisma } from "@prisma/client";
import { publishEvent } from "@/lib/event-bus";
import { prisma } from "@/lib/prisma";
import type { AntiBotPayload, SignalSeverity } from "@/lib/contracts/signals";
import { scoreVelocity } from "@/lib/velocity-scorer";
import { VALID_METRIC_SNAPSHOT_WHERE } from "./valid-snapshots";

export const AUTO_ANTIBOT_RESOLVED_BY = "system:auto-antibot-recompute";

export type AntiBotSignalAction =
  | "created"
  | "updated"
  | "downgraded"
  | "resolved"
  | "unchanged";

export interface AntiBotSignalSyncResult {
  action: AntiBotSignalAction;
  signalId?: string;
}

export interface RecomputeAntiBotSignalsResult {
  processed: number;
  updated: number;
  downgraded: number;
  resolved: number;
  unchanged: number;
  failed: number;
}

interface SyncOptions {
  now?: Date;
}

interface RecomputeOptions {
  limit?: number;
}

export async function syncAntiBotSignal(
  submissionId: string,
  antiBot: AntiBotPayload,
  opts: SyncOptions = {},
): Promise<AntiBotSignalSyncResult> {
  const existingOpenSignal = await prisma.submissionSignal.findFirst({
    where: {
      submissionId,
      type: "BOT_SUSPECTED",
      resolvedAt: null,
    },
    select: { id: true, severity: true, payload: true },
  });

  const nextSeverity = antiBotSeverity(antiBot);
  const payload = antiBot as unknown as Prisma.InputJsonValue;

  if (nextSeverity == null) {
    if (!existingOpenSignal) {
      return { action: "unchanged" };
    }
    await prisma.submissionSignal.update({
      where: { id: existingOpenSignal.id },
      data: {
        severity: "INFO",
        payload,
        resolvedAt: opts.now ?? new Date(),
        resolvedBy: AUTO_ANTIBOT_RESOLVED_BY,
      },
    });
    return { action: "resolved", signalId: existingOpenSignal.id };
  }

  if (existingOpenSignal) {
    const action =
      severityRank(existingOpenSignal.severity) > severityRank(nextSeverity)
        ? "downgraded"
        : "updated";
    await prisma.submissionSignal.update({
      where: { id: existingOpenSignal.id },
      data: {
        severity: nextSeverity,
        payload,
      },
    });
    return { action, signalId: existingOpenSignal.id };
  }

  const signal = await prisma.submissionSignal.create({
    data: {
      submissionId,
      type: "BOT_SUSPECTED",
      severity: nextSeverity,
      payload,
    },
    select: { id: true, createdAt: true },
  });

  await publishEvent({
    type: "submission.flagged",
    submissionId,
    signalId: signal.id,
    signal: "BOT_SUSPECTED",
    severity: nextSeverity,
    occurredAt: signal.createdAt.toISOString(),
  });

  return { action: "created", signalId: signal.id };
}

export async function recomputeOpenAntiBotSignals(
  opts: RecomputeOptions = {},
): Promise<RecomputeAntiBotSignalsResult> {
  const result: RecomputeAntiBotSignalsResult = {
    processed: 0,
    updated: 0,
    downgraded: 0,
    resolved: 0,
    unchanged: 0,
    failed: 0,
  };
  const limit = clampLimit(opts.limit);

  const signals = await prisma.submissionSignal.findMany({
    where: {
      type: "BOT_SUSPECTED",
      resolvedAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      submissionId: true,
      submission: {
        select: {
          campaignId: true,
          sourceConnectionType: true,
          sourceConnectionId: true,
          metricSnapshots: {
            where: VALID_METRIC_SNAPSHOT_WHERE,
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
          },
        },
      },
    },
  });

  for (const signal of signals) {
    result.processed++;
    try {
      const snapshots = [...signal.submission.metricSnapshots].reverse();
      if (snapshots.length < 2) {
        result.unchanged++;
        continue;
      }

      const [campaignBenchmark, accountSnapshot] = await Promise.all([
        prisma.campaignBenchmark.findFirst({
          where: { campaignId: signal.submission.campaignId },
          orderBy: { computedAt: "desc" },
          select: { velocityP50: true, velocityP90: true },
        }),
        signal.submission.sourceConnectionType && signal.submission.sourceConnectionId
          ? prisma.platformAccountSnapshot.findFirst({
              where: {
                connectionType: signal.submission.sourceConnectionType,
                connectionId: signal.submission.sourceConnectionId,
              },
              orderBy: { capturedAt: "desc" },
              select: { audienceCount: true },
            })
          : Promise.resolve(null),
      ]);

      const scored = scoreVelocity({
        snapshots,
        campaignBenchmark,
        accountSnapshot,
        now: snapshots[snapshots.length - 1].capturedAt,
      });

      if (!scored.antiBot) {
        result.unchanged++;
        continue;
      }

      const sync = await syncAntiBotSignal(signal.submissionId, scored.antiBot);
      incrementResult(result, sync.action);
    } catch (err) {
      console.error(`[anti-bot-recompute] ${signal.id}`, err);
      result.failed++;
    }
  }

  return result;
}

function antiBotSeverity(antiBot: AntiBotPayload): Exclude<SignalSeverity, "INFO"> | null {
  if (antiBot.riskScore >= 70) return "CRITICAL";
  if (antiBot.riskScore >= 40) return "WARN";
  return null;
}

function severityRank(severity: string | undefined): number {
  if (severity === "CRITICAL") return 2;
  if (severity === "WARN") return 1;
  if (severity === "INFO") return 0;
  return -1;
}

function incrementResult(result: RecomputeAntiBotSignalsResult, action: AntiBotSignalAction) {
  if (action === "updated") result.updated++;
  else if (action === "downgraded") result.downgraded++;
  else if (action === "resolved") result.resolved++;
  else if (action === "unchanged") result.unchanged++;
  else result.updated++;
}

function clampLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 200;
  return Math.max(1, Math.min(1000, Math.floor(value)));
}
