/**
 * Raw API payload archival.
 *
 * Owner: A. Every metric/audience fetcher should call `recordRawApiResponse`
 * with the unmodified API payload so we have an escape hatch when Meta/YT/TT
 * rename or deprecate fields. Rows are pruned by `/api/cron/prune-raw-responses`
 * after 90 days.
 *
 * Failures are swallowed and logged — raw archival must never break a poll.
 */

import { Prisma, type ConnectionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RecordRawArgs {
  /** Optional submission link. Null for connection-level audience/profile snapshots. */
  submissionId?: string | null;
  connectionType: ConnectionType;
  connectionId: string;
  /**
   * Logical endpoint identifier. Examples:
   *   "instagram.media.insights"
   *   "instagram.account.insights"
   *   "instagram.user.demographics.followers"
   *   "instagram.user.demographics.engaged"
   *   "facebook.page.insights"
   *   "facebook.post.insights"
   *   "tiktok.video.list"
   *   "tiktok.user.info"
   *   "youtube.videos.list"
   *   "youtube.analytics.daily"
   *   "youtube.analytics.demographics"
   */
  endpoint: string;
  payload: unknown;
}

export async function recordRawApiResponse(args: RecordRawArgs): Promise<void> {
  if (args.payload == null) return;
  try {
    await prisma.rawApiResponse.create({
      data: {
        submissionId: args.submissionId ?? null,
        connectionType: args.connectionType,
        connectionId: args.connectionId,
        endpoint: args.endpoint,
        payload: args.payload as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error(
      `[raw-storage] failed to archive ${args.endpoint} for ${args.connectionType}:${args.connectionId}`,
      err,
    );
  }
}

/**
 * Prune raw API responses older than the given threshold (default 90 days).
 * Returns the number of rows deleted.
 */
export async function pruneRawApiResponses(olderThanDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await prisma.rawApiResponse.deleteMany({
    where: { capturedAt: { lt: cutoff } },
  });
  return result.count;
}
