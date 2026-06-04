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
import { getFreshTikTokAccessToken } from "@/lib/token-refresh";
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
): Promise<MetricFetcherResult> {
  const videoId = parsed.platformVideoId ?? parsed.postId;
  if (!videoId) {
    return failure("POST_NOT_FOUND", "TT URL does not contain a stable video ID", {
      type: "TT",
      id: conn.id,
    });
  }

  const results = await fetchTikTokMetricsByVideoIds(conn, [
    { submissionId: submissionId ?? "single", videoId },
  ]);

  return results.get(submissionId ?? "single") ??
    failure("POST_NOT_FOUND", `TT video ${videoId} not returned by video.query`, {
      type: "TT",
      id: conn.id,
    });
}

export async function fetchTikTokMetricsByVideoIds(
  conn: CreatorTikTokConnection,
  targets: TikTokMetricTarget[],
): Promise<Map<string, MetricFetcherResult>> {
  const results = new Map<string, MetricFetcherResult>();
  const validTargets = targets.filter((target) => target.videoId);
  if (validTargets.length === 0) return results;

  if (!conn.accessToken || !conn.accessTokenIv) {
    return failAll(validTargets, "NO_TOKEN", "TT connection missing access token", conn.id);
  }

  let token: string | null;
  try {
    token = await getFreshTikTokAccessToken(conn);
  } catch (err) {
    return failAll(
      validTargets,
      "TOKEN_BROKEN",
      `TT token refresh failed: ${(err as Error).message}`,
      conn.id,
    );
  }
  if (!token) {
    return failAll(validTargets, "TOKEN_EXPIRED", "TT token expired and refresh failed", conn.id);
  }

  for (const chunk of chunks(validTargets, 20)) {
    const videoIds = chunk.map((target) => target.videoId);
    let response: Awaited<ReturnType<typeof fetchTikTokVideosByIds>>;
    try {
      response = await fetchTikTokVideosByIds(token, videoIds);
    } catch (err) {
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

function classifyTikTokError(err: unknown): "TOKEN_BROKEN" | "PLATFORM_ERROR" | "RATE_LIMITED" {
  if (err instanceof TikTokRateLimitError) return "RATE_LIMITED";
  const msg = (err as Error).message?.toLowerCase() ?? "";
  if (msg.includes("token") || msg.includes("oauth") || msg.includes("invalid_token")) {
    return "TOKEN_BROKEN";
  }
  if (msg.includes("rate_limit") || msg.includes("rate limited")) return "RATE_LIMITED";
  return "PLATFORM_ERROR";
}

function failAll(
  targets: TikTokMetricTarget[],
  reason: "NO_TOKEN" | "TOKEN_BROKEN" | "TOKEN_EXPIRED",
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
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function buildSuccess(match: TikTokVideo, connectionId: string): MetricFetcherResult {
  return {
    ok: true,
    source: "OAUTH_TT",
    connection: { type: "TT", id: connectionId },
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
