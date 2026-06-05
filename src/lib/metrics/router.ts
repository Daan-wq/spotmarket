/**
 * OAuth-only metric router.
 *
 * Owner: Subsystem A (tracking foundation).
 *
 * Given a CampaignSubmission, locates the creator's OAuth connection on the
 * matching platform and dispatches to the per-platform fetcher. There is **no
 * scraping fallback** — if no verified OAuth connection exists or the token is
 * broken, the result is a structured failure so the caller can persist a
 * MetricPollFailure and emit a `submission.flagged` / `TOKEN_BROKEN` signal.
 *
 * The router never throws — it always returns a structured result so that the
 * cron loop can keep processing the rest of the batch.
 */

import { prisma } from "@/lib/prisma";
import type { ConnectionType, MetricPollFailureReason } from "@prisma/client";
import { parseClipUrl, type ClipPlatform } from "@/lib/parse-clip-url";
import type { MetricAvailability, MetricSource } from "@/lib/contracts/metrics";
import { fetchInstagramMetric } from "./instagram";
import { fetchTikTokMetric } from "./tiktok";
import { fetchYoutubeMetric } from "./youtube";
import { fetchFacebookMetric } from "./facebook";

export interface MetricFetcherSuccess {
  ok: true;
  source: Exclude<MetricSource, "OAUTH_FAILED">;
  connection?: {
    type: "IG" | "TT" | "YT" | "FB";
    id: string;
  } | null;
  viewCount: bigint;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number | null;
  watchTimeSec: number | null;
  reachCount: number | null;
  metricAvailability: MetricAvailability;
  raw?: unknown;
  // Track-everything Phase 1 — per-media breakdowns when the platform exposes them.
  totalInteractions?: number | null;
  followsFromMedia?: number | null;
  profileVisits?: number | null;
  profileActivity?: Record<string, number | null> | null;
  reactionsByType?: Record<string, number> | null;
  resolvedIdentity?: {
    platformApiMediaId: string;
    mediaProductType?: string | null;
  } | null;
}

export interface MetricFetcherFailureDetails {
  httpStatus?: number | null;
  providerCode?: number | null;
  providerSubcode?: number | null;
  providerType?: string | null;
  raw?: unknown;
}

export interface MetricFetcherFailure {
  ok: false;
  source: "OAUTH_FAILED";
  reason: MetricPollFailureReason;
  message: string;
  details?: MetricFetcherFailureDetails | null;
  /**
   * If a specific connection was identified but its token failed,
   * include it so the caller can flag TOKEN_BROKEN with payload.
   */
  connection: {
    type: "IG" | "TT" | "YT" | "FB";
    id: string;
  } | null;
}

export type MetricFetcherResult = MetricFetcherSuccess | MetricFetcherFailure;

export interface RouterSubmissionInput {
  id: string;
  postUrl: string;
  creatorId: string;
  sourceConnectionType?: ConnectionType | null;
  sourceConnectionId?: string | null;
  platformApiMediaId?: string | null;
  platformMediaProductType?: string | null;
}

/**
 * Look up the appropriate OAuth connection for the post URL's platform and
 * fetch metrics. Pure dispatcher — fetchers handle their own decryption.
 */
export async function routeMetric(
  submission: RouterSubmissionInput,
): Promise<MetricFetcherResult> {
  const parsed = parseClipUrl(submission.postUrl);
  if (parsed.platform === "UNKNOWN") {
    return failure("UNSUPPORTED_PLATFORM", `Cannot parse URL: ${submission.postUrl}`, null);
  }

  const profile = await prisma.creatorProfile.findFirst({
    where: { user: { id: submission.creatorId } },
    select: { id: true },
  });
  if (!profile) {
    return failure("NO_CONNECTION", "Creator profile not found", null);
  }

  switch (parsed.platform) {
    case "INSTAGRAM": {
      if (hasStoredSource(submission, "IG")) {
        const conn = await prisma.creatorIgConnection.findFirst({
          where: {
            id: submission.sourceConnectionId,
            creatorProfileId: profile.id,
            isVerified: true,
            accessToken: { not: null },
          },
        });
        if (!conn) {
          return failure("NO_CONNECTION", "Stored IG account connection is no longer available", {
            type: "IG",
            id: submission.sourceConnectionId,
          });
        }
        return await fetchInstagramMetric(conn, parsed, submission.id, {
          platformApiMediaId: submission.platformApiMediaId ?? null,
          mediaProductType: submission.platformMediaProductType ?? null,
        });
      }
      if (hasMismatchedStoredSource(submission, "IG")) {
        return storedPlatformMismatch(submission, parsed.platform);
      }

      const conns = await prisma.creatorIgConnection.findMany({
        where: {
          creatorProfileId: profile.id,
          isVerified: true,
          accessToken: { not: null },
        },
        orderBy: { updatedAt: "desc" },
      });
      const byHandle = pickConnectionByHandle(parsed, conns, (c) => c.igUsername ?? "");
      if (parsed.authorHandle && !byHandle) {
        return failure("NO_CONNECTION", "No verified IG account connection", null);
      }
      return await tryConnections(byHandle ? [byHandle] : conns, (conn) =>
        fetchInstagramMetric(conn, parsed, submission.id, {
          platformApiMediaId: submission.platformApiMediaId ?? null,
          mediaProductType: submission.platformMediaProductType ?? null,
        }),
      );
    }
    case "TIKTOK": {
      if (hasStoredSource(submission, "TT")) {
        const conn = await prisma.creatorTikTokConnection.findFirst({
          where: {
            id: submission.sourceConnectionId,
            creatorProfileId: profile.id,
            isVerified: true,
            accessToken: { not: null },
          },
        });
        if (!conn) {
          return failure("NO_CONNECTION", "Stored TT account connection is no longer available", {
            type: "TT",
            id: submission.sourceConnectionId,
          });
        }
        return await fetchTikTokMetric(conn, parsed, submission.id, {
          platformApiMediaId: submission.platformApiMediaId ?? null,
        });
      }
      if (hasMismatchedStoredSource(submission, "TT")) {
        return storedPlatformMismatch(submission, parsed.platform);
      }

      const conns = await prisma.creatorTikTokConnection.findMany({
        where: {
          creatorProfileId: profile.id,
          isVerified: true,
          accessToken: { not: null },
        },
        orderBy: { updatedAt: "desc" },
      });
      const byHandle = pickConnectionByHandle(parsed, conns, (c) => c.username ?? "");
      if (parsed.authorHandle && !byHandle) {
        return failure("NO_CONNECTION", "No verified TT account connection", null);
      }
      return await tryConnections(byHandle ? [byHandle] : conns, (conn) =>
        fetchTikTokMetric(conn, parsed, submission.id, {
          platformApiMediaId: submission.platformApiMediaId ?? null,
        }),
      );
    }
    case "YOUTUBE": {
      if (hasStoredSource(submission, "YT")) {
        const conn = await prisma.creatorYtConnection.findFirst({
          where: {
            id: submission.sourceConnectionId,
            creatorProfileId: profile.id,
            isVerified: true,
            accessToken: { not: null },
          },
        });
        if (!conn) {
          return failure("NO_CONNECTION", "Stored YT account connection is no longer available", {
            type: "YT",
            id: submission.sourceConnectionId,
          });
        }
        return await fetchYoutubeMetric(conn, parsed, submission.id, {
          platformApiMediaId: submission.platformApiMediaId ?? null,
        });
      }
      if (hasMismatchedStoredSource(submission, "YT")) {
        return storedPlatformMismatch(submission, parsed.platform);
      }

      const conns = await prisma.creatorYtConnection.findMany({
        where: {
          creatorProfileId: profile.id,
          isVerified: true,
          accessToken: { not: null },
        },
        orderBy: { updatedAt: "desc" },
      });
      if (conns.length === 0) {
        return failure("NO_CONNECTION", "No verified YT account connection", null);
      }
      return await tryConnections(conns, (conn) =>
        fetchYoutubeMetric(conn, parsed, submission.id, {
          platformApiMediaId: submission.platformApiMediaId ?? null,
        }),
      );
    }
    case "FACEBOOK": {
      if (hasStoredSource(submission, "FB")) {
        const conn = await prisma.creatorFbConnection.findFirst({
          where: {
            id: submission.sourceConnectionId,
            creatorProfileId: profile.id,
            isVerified: true,
            accessToken: { not: null },
          },
        });
        if (!conn) {
          return failure("NO_CONNECTION", "Stored FB account connection is no longer available", {
            type: "FB",
            id: submission.sourceConnectionId,
          });
        }
        return await fetchFacebookMetric(conn, parsed, submission.id, {
          platformApiMediaId: submission.platformApiMediaId ?? null,
        });
      }
      if (hasMismatchedStoredSource(submission, "FB")) {
        return storedPlatformMismatch(submission, parsed.platform);
      }

      const conns = await prisma.creatorFbConnection.findMany({
        where: {
          creatorProfileId: profile.id,
          isVerified: true,
          accessToken: { not: null },
        },
        orderBy: { updatedAt: "desc" },
      });
      const byHandle = pickConnectionByHandle(parsed, conns, (c) =>
        [(c.pageHandle ?? "").toLowerCase(), (c.pageName ?? "").toLowerCase()]
          .filter(Boolean)
          .join("|"),
      );
      if (parsed.authorHandle && !byHandle) {
        return failure("NO_CONNECTION", "No verified FB account connection", null);
      }
      return await tryConnections(byHandle ? [byHandle] : conns, (conn) =>
        fetchFacebookMetric(conn, parsed, submission.id, {
          platformApiMediaId: submission.platformApiMediaId ?? null,
        }),
      );
    }
  }
}

function pickConnectionByHandle<T>(
  parsed: { platform: ClipPlatform; authorHandle: string | null },
  all: T[],
  handleOf: (c: T) => string,
): T | null {
  if (parsed.authorHandle) {
    const h = parsed.authorHandle.toLowerCase();
    const match = all.find((c) => handleOf(c).split("|").includes(h));
    if (match) return match;
  }
  return null;
}

async function tryConnections<T>(
  conns: T[],
  fetcher: (conn: T) => Promise<MetricFetcherResult>,
): Promise<MetricFetcherResult> {
  if (conns.length === 0) {
    return failure("NO_CONNECTION", "No verified account connection", null);
  }

  let lastPostNotFound: MetricFetcherResult | null = null;
  for (const conn of conns) {
    const result = await fetcher(conn);
    if (result.ok) return result;
    if (result.reason !== "POST_NOT_FOUND") return result;
    lastPostNotFound = result;
  }

  return lastPostNotFound ?? failure("POST_NOT_FOUND", "Post not found", null);
}

function hasStoredSource(
  submission: RouterSubmissionInput,
  expected: ConnectionType,
): submission is RouterSubmissionInput & {
  sourceConnectionType: ConnectionType;
  sourceConnectionId: string;
} {
  return submission.sourceConnectionType === expected && Boolean(submission.sourceConnectionId);
}

function hasMismatchedStoredSource(
  submission: RouterSubmissionInput,
  expected: ConnectionType,
): submission is RouterSubmissionInput & {
  sourceConnectionType: ConnectionType;
  sourceConnectionId: string;
} {
  return Boolean(submission.sourceConnectionType && submission.sourceConnectionId) &&
    submission.sourceConnectionType !== expected;
}

function storedPlatformMismatch(
  submission: RouterSubmissionInput & { sourceConnectionType: ConnectionType; sourceConnectionId: string },
  platform: ClipPlatform,
): MetricFetcherFailure {
  return failure(
    "NO_CONNECTION",
    `Stored ${submission.sourceConnectionType} account connection does not match ${platform} URL`,
    { type: submission.sourceConnectionType, id: submission.sourceConnectionId },
  );
}

export function failure(
  reason: MetricFetcherFailure["reason"],
  message: string,
  connection: MetricFetcherFailure["connection"],
  details?: MetricFetcherFailureDetails | null,
): MetricFetcherFailure {
  return { ok: false, source: "OAUTH_FAILED", reason, message, connection, details };
}
