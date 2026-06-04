/**
 * TikTok OAuth metric fetcher.
 *
 * Known submissions are resolved through Display API `video.query` using the
 * stored TikTok video ID. `video.list` remains for creator media discovery, not
 * for metrics polling, because recent-feed paging can miss older submissions.
 */

import type { CreatorTikTokConnection } from "@prisma/client";
import {
  fetchTikTokVideosByIds,
  TikTokRateLimitError,
  type TikTokVideo,
} from "@/lib/tiktok";
import {
  isTikTokInvalidTokenError,
  withFreshTikTokAccessToken,
} from "@/lib/token-refresh";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { metricAvailability } from "@/lib/contracts/metrics";
import { failure, type MetricFetcherResult } from "./router";
import { recordRawApiResponse } from "./raw-storage";

export interface TikTokMetricTarget {
  submissionId: string;
  videoId: string;
}

export async function fetchTikTokMetric(
  conn: CreatorTikTokConnection,
  parsed: ParsedClipUrl,
  submissionId?: string,
  identity?: { platformApiMediaId?: string | null },
): Promise<MetricFetcherResult> {
  const videoId = identity?.platformApiMediaId ?? parsed.platformVideoId ?? parsed.postId;
  if (!videoId) {
    return failure("POST_NOT_FOUND", "TT URL does not contain a stable video ID", {
      type: "TT",
      id: conn.id,
    });
  }

  const resultId = submissionId ?? "single";
  const results = await fetchTikTokMetricsByVideoIds(conn, [
    { submissionId: resultId, videoId },
  ]);

  return results.get(resultId) ??
    failure("POST_NOT_FOUND", `TT video ${videoId} not returned by video.query`, {
      type: "TT",
      id: conn.id,
    });
}

export async function fetchTikTokMetricsByVideoIds(
  conn: CreatorTikTokConnection,
  targets: TikTokMetricTarget[],
): Promise<Map<string, MetricFetcherResult>> {
  const validTargets = targets.filter((target) => target.videoId);
  if (validTargets.length === 0) return new Map();

  if (!conn.accessToken || !conn.accessTokenIv) {
    return failAll(validTargets, "NO_TOKEN", "TT connection missing access token", conn.id);
  }

  try {
    const results = await withFreshTikTokAccessToken(conn, (token) =>
      fetchTikTokMetricsWithToken(conn, validTargets, token),
    );
    if (!results) {
      return failAll(
        validTargets,
        "TOKEN_EXPIRED",
        "TT token expired and refresh failed",
        conn.id,
      );
    }
    return results;
  } catch (err) {
    const reason = classifyTikTokError(err);
    return failAll(
      validTargets,
      reason,
      `TT video query failed: ${(err as Error).message}`,
      conn.id,
    );
  }
}

async function fetchTikTokMetricsWithToken(
  conn: CreatorTikTokConnection,
  targets: TikTokMetricTarget[],
  token: string,
): Promise<Map<string, MetricFetcherResult>> {
  const results = new Map<string, MetricFetcherResult>();

  for (const chunk of chunks(targets, 20)) {
    const videoIds = chunk.map((target) => target.videoId);
    let response: Awaited<ReturnType<typeof fetchTikTokVideosByIds>>;
    try {
      response = await fetchTikTokVideosByIds(token, videoIds);
    } catch (err) {
      if (isTikTokInvalidTokenError(err)) throw err;

      const reason = classifyTikTokError(err);
      for (const target of chunk) {
        results.set(
          target.submissionId,
          failure(reason, `TT video query failed: ${(err as Error).message}`, {
            type: "TT",
            id: conn.id,
          }),
        );
      }
      continue;
    }

    await recordRawApiResponse({
      submissionId: null,
      connectionType: "TT",
      connectionId: conn.id,
      endpoint: "tiktok.video.query",
      payload: { request: { videoIds }, response },
    });

    const byId = new Map(response.videos.map((video) => [video.id, video]));
    for (const target of chunk) {
      const match = byId.get(target.videoId);
      results.set(
        target.submissionId,
        match
          ? buildSuccess(match, conn.id)
          : failure("POST_NOT_FOUND", `TT video ${target.videoId} not returned by video.query`, {
              type: "TT",
              id: conn.id,
            }),
      );
    }
  }

  return results;
}

function classifyTikTokError(
  err: unknown,
): "TOKEN_BROKEN" | "PLATFORM_ERROR" | "RATE_LIMITED" {
  if (err instanceof TikTokRateLimitError) return "RATE_LIMITED";
  if (isTikTokInvalidTokenError(err)) return "TOKEN_BROKEN";

  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (message.includes("token") || message.includes("oauth")) return "TOKEN_BROKEN";
  if (message.includes("rate_limit") || message.includes("rate limited")) return "RATE_LIMITED";
  return "PLATFORM_ERROR";
}

function failAll(
  targets: TikTokMetricTarget[],
  reason: "NO_TOKEN" | "TOKEN_BROKEN" | "TOKEN_EXPIRED" | "PLATFORM_ERROR" | "RATE_LIMITED",
  message: string,
  connectionId: string,
): Map<string, MetricFetcherResult> {
  return new Map(
    targets.map((target) => [
      target.submissionId,
      failure(reason, message, { type: "TT", id: connectionId }),
    ]),
  );
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function buildSuccess(match: TikTokVideo, connectionId: string): MetricFetcherResult {
  return {
    ok: true,
    source: "OAUTH_TT",
    connection: { type: "TT", id: connectionId },
    resolvedIdentity: { platformApiMediaId: match.id },
    viewCount: BigInt(match.viewCount ?? 0),
    likeCount: match.likeCount ?? 0,
    commentCount: match.commentCount ?? 0,
    shareCount: match.shareCount ?? 0,
    saveCount: null,
    watchTimeSec: null,
    reachCount: null,
    metricAvailability: metricAvailability({
      views: true,
      likes: true,
      comments: true,
      shares: true,
    }),
    raw: {
      videoId: match.id,
      title: match.title,
      videoDescription: match.videoDescription,
      coverImageUrl: match.coverImageUrl,
      shareUrl: match.shareUrl,
      embedLink: match.embedLink,
      duration: match.duration,
      height: match.height,
      width: match.width,
      createTime: match.createTime,
    },
  };
}
