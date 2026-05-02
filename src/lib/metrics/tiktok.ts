/**
 * TikTok OAuth metric fetcher.
 *
 * Resolves a submission via the creator's video list (Display API) — we page
 * up to MAX_PAGES looking for a video whose share URL contains the parsed
 * post id. Returns OAUTH_FAILED with a reason code on miss.
 */

import type { CreatorTikTokConnection } from "@prisma/client";
import { fetchTikTokVideos } from "@/lib/tiktok";
import { getFreshTikTokAccessToken } from "@/lib/token-refresh";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { failure, type MetricFetcherResult } from "./router";

const MAX_PAGES = 4; // ~80 most-recent videos

export async function fetchTikTokMetric(
  conn: CreatorTikTokConnection,
  parsed: ParsedClipUrl,
): Promise<MetricFetcherResult> {
  if (!conn.accessToken || !conn.accessTokenIv) {
    return failure("NO_TOKEN", "TT connection missing access token", { type: "TT", id: conn.id });
  }

  let token: string | null;
  try {
    token = await getFreshTikTokAccessToken(conn);
  } catch (err) {
    return failure(
      "TOKEN_BROKEN",
      `TT token refresh failed: ${(err as Error).message}`,
      { type: "TT", id: conn.id },
    );
  }
  if (!token) {
    return failure("TOKEN_EXPIRED", "TT token expired and refresh failed", {
      type: "TT",
      id: conn.id,
    });
  }

  const targetId = parsed.postId ?? "";
  let cursor: number | undefined = undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    let chunk;
    try {
      chunk = await fetchTikTokVideos(token, 20, cursor);
    } catch (err) {
      const msg = (err as Error).message?.toLowerCase() ?? "";
      if (msg.includes("token") || msg.includes("oauth") || msg.includes("invalid_token")) {
        return failure("TOKEN_BROKEN", `TT video list failed: ${(err as Error).message}`, {
          type: "TT",
          id: conn.id,
        });
      }
      return failure("PLATFORM_ERROR", (err as Error).message, { type: "TT", id: conn.id });
    }

    const match = chunk.videos.find(
      (v) =>
        v.id === targetId ||
        (v.shareUrl ?? "").includes(targetId),
    );

    if (match) {
      return {
        ok: true,
        source: "OAUTH_TT",
        viewCount: BigInt(match.viewCount ?? 0),
        likeCount: match.likeCount ?? 0,
        commentCount: match.commentCount ?? 0,
        shareCount: match.shareCount ?? 0,
        saveCount: null,
        watchTimeSec: null,
        reachCount: null,
        raw: { videoId: match.id },
      };
    }

    if (!chunk.hasMore || chunk.nextCursor == null) break;
    cursor = chunk.nextCursor;
  }

  return failure("POST_NOT_FOUND", `TT video ${targetId} not in recent feed`, {
    type: "TT",
    id: conn.id,
  });
}
