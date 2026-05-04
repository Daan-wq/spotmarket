/**
 * OAuth-only metric router.
 *
 * Owner: Subsystem A (tracking foundation).
 *
 * Given a CampaignSubmission, locates the creator's OAuth connection on the
 * matching platform and dispatches to the per-platform fetcher. There is **no
 * scraping fallback** — if no verified OAuth connection exists or the token is
 * broken, the result is `OAUTH_FAILED` with `tokenBroken` populated so the
 * caller can persist `MetricSnapshot.source = OAUTH_FAILED` and emit a
 * `submission.flagged` / `TOKEN_BROKEN` signal.
 *
 * The router never throws — it always returns a structured result so that the
 * cron loop can keep processing the rest of the batch.
 */

import { prisma } from "@/lib/prisma";
import { parseClipUrl, type ClipPlatform } from "@/lib/parse-clip-url";
import type { MetricSource } from "@/lib/contracts/metrics";
import { fetchInstagramMetric } from "./instagram";
import { fetchTikTokMetric } from "./tiktok";
import { fetchYoutubeMetric } from "./youtube";
import { fetchFacebookMetric } from "./facebook";

export interface MetricFetcherSuccess {
  ok: true;
  source: Exclude<MetricSource, "OAUTH_FAILED">;
  viewCount: bigint;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number | null;
  watchTimeSec: number | null;
  reachCount: number | null;
  raw?: unknown;
  // Track-everything Phase 1 — per-media breakdowns when the platform exposes them.
  totalInteractions?: number | null;
  followsFromMedia?: number | null;
  profileVisits?: number | null;
  profileActivity?: Record<string, number | null> | null;
  reactionsByType?: Record<string, number> | null;
}

export interface MetricFetcherFailure {
  ok: false;
  source: "OAUTH_FAILED";
  reason:
    | "NO_CONNECTION"
    | "NO_TOKEN"
    | "TOKEN_EXPIRED"
    | "TOKEN_BROKEN"
    | "PLATFORM_ERROR"
    | "UNSUPPORTED_PLATFORM"
    | "POST_NOT_FOUND";
  message: string;
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
      const conn = await pickConnection(parsed, async () =>
        prisma.creatorIgConnection.findMany({
          where: {
            creatorProfileId: profile.id,
            isVerified: true,
            accessToken: { not: null },
          },
          orderBy: { updatedAt: "desc" },
        }),
        (c) => (c.igUsername ?? "").toLowerCase(),
      );
      if (!conn) return failure("NO_CONNECTION", "No verified IG OAuth connection", null);
      return await fetchInstagramMetric(conn, parsed, submission.id);
    }
    case "TIKTOK": {
      const conn = await pickConnection(parsed, async () =>
        prisma.creatorTikTokConnection.findMany({
          where: {
            creatorProfileId: profile.id,
            isVerified: true,
            accessToken: { not: null },
          },
          orderBy: { updatedAt: "desc" },
        }),
        (c) => (c.username ?? "").toLowerCase(),
      );
      if (!conn) return failure("NO_CONNECTION", "No verified TT OAuth connection", null);
      return await fetchTikTokMetric(conn, parsed, submission.id);
    }
    case "YOUTUBE": {
      const conns = await prisma.creatorYtConnection.findMany({
        where: {
          creatorProfileId: profile.id,
          isVerified: true,
          accessToken: { not: null },
        },
        orderBy: { updatedAt: "desc" },
      });
      if (conns.length === 0) {
        return failure("NO_CONNECTION", "No verified YT OAuth connection", null);
      }
      // YouTube post URLs don't carry the channel handle reliably; use first connection.
      // The fetcher itself can verify ownership via videos.list (channelId match).
      return await fetchYoutubeMetric(conns[0], parsed);
    }
    case "FACEBOOK": {
      const conn = await pickConnection(parsed, async () =>
        prisma.creatorFbConnection.findMany({
          where: {
            creatorProfileId: profile.id,
            isVerified: true,
            accessToken: { not: null },
          },
          orderBy: { updatedAt: "desc" },
        }),
        (c) => [(c.pageHandle ?? "").toLowerCase(), (c.pageName ?? "").toLowerCase()].filter(Boolean).join("|"),
      );
      if (!conn) return failure("NO_CONNECTION", "No verified FB OAuth connection", null);
      return await fetchFacebookMetric(conn, parsed, submission.id);
    }
  }
}

async function pickConnection<T>(
  parsed: { platform: ClipPlatform; authorHandle: string | null },
  loader: () => Promise<T[]>,
  handleOf: (c: T) => string,
): Promise<T | null> {
  const all = await loader();
  if (all.length === 0) return null;
  if (parsed.authorHandle) {
    const h = parsed.authorHandle.toLowerCase();
    const match = all.find((c) => handleOf(c).split("|").includes(h));
    if (match) return match;
  }
  return all[0];
}

export function failure(
  reason: MetricFetcherFailure["reason"],
  message: string,
  connection: MetricFetcherFailure["connection"],
): MetricFetcherFailure {
  return { ok: false, source: "OAUTH_FAILED", reason, message, connection };
}
