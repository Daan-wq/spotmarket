/**
 * YouTube OAuth metric fetcher.
 *
 * Calls YouTube Data API v3 `videos.list?part=statistics,snippet&id=<id>` with
 * the creator's OAuth token. The video must belong to a channel the connection
 * owns — we verify `snippet.channelId === conn.channelId` to prevent metric
 * leakage from other channels (the API will return any public video).
 */

import type { CreatorYtConnection } from "@prisma/client";
import { getFreshYoutubeAccessToken } from "@/lib/token-refresh";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { failure, type MetricFetcherResult } from "./router";

const YT_DATA_BASE = "https://www.googleapis.com/youtube/v3";

export async function fetchYoutubeMetric(
  conn: CreatorYtConnection,
  parsed: ParsedClipUrl,
): Promise<MetricFetcherResult> {
  if (!conn.accessToken || !conn.accessTokenIv) {
    return failure("NO_TOKEN", "YT connection missing access token", { type: "YT", id: conn.id });
  }

  let token: string | null;
  try {
    token = await getFreshYoutubeAccessToken(conn);
  } catch (err) {
    return failure(
      "TOKEN_BROKEN",
      `YT token refresh failed: ${(err as Error).message}`,
      { type: "YT", id: conn.id },
    );
  }
  if (!token) {
    return failure("TOKEN_EXPIRED", "YT token expired and refresh failed", {
      type: "YT",
      id: conn.id,
    });
  }

  const videoId = parsed.postId ?? "";
  if (!videoId) {
    return failure("POST_NOT_FOUND", "YT URL missing video id", { type: "YT", id: conn.id });
  }

  const params = new URLSearchParams({
    part: "snippet,statistics",
    id: videoId,
  });

  const res = await fetch(`${YT_DATA_BASE}/videos?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    return failure("TOKEN_BROKEN", `YT videos.list returned ${res.status}`, {
      type: "YT",
      id: conn.id,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return failure(
      "PLATFORM_ERROR",
      `YT videos.list ${res.status}: ${text.slice(0, 200)}`,
      { type: "YT", id: conn.id },
    );
  }

  const data = (await res.json()) as {
    items?: {
      id: string;
      snippet?: { channelId?: string };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }[];
  };

  const item = data.items?.[0];
  if (!item) {
    return failure("POST_NOT_FOUND", `YT video ${videoId} not found`, { type: "YT", id: conn.id });
  }

  if (item.snippet?.channelId && item.snippet.channelId !== conn.channelId) {
    return failure(
      "POST_NOT_FOUND",
      `YT video ${videoId} belongs to ${item.snippet.channelId}, not ${conn.channelId}`,
      { type: "YT", id: conn.id },
    );
  }

  return {
    ok: true,
    source: "OAUTH_YT",
    viewCount: BigInt(item.statistics?.viewCount ?? "0"),
    likeCount: parseInt(item.statistics?.likeCount ?? "0") || 0,
    commentCount: parseInt(item.statistics?.commentCount ?? "0") || 0,
    shareCount: 0,
    saveCount: null,
    watchTimeSec: null,
    reachCount: null,
    raw: { videoId, channelId: item.snippet?.channelId ?? null },
  };
}
