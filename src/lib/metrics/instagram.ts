/**
 * Instagram OAuth metric fetcher.
 *
 * Owner: A. Resolves a submission's post URL against the creator's recent
 * media list (Instagram Graph API v25), returning structured metrics or an
 * OAUTH_FAILED result with a reason code.
 */

import type { CreatorIgConnection } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { fetchRecentMedia, getSingleMediaInsights } from "@/lib/instagram";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { failure, type MetricFetcherResult } from "./router";

/**
 * IG media list returns up to 100 recent posts at once. We page until we either
 * find the matching permalink (or postId in URL), or exhaust ~3 pages.
 */
const MAX_PAGES = 3;

export async function fetchInstagramMetric(
  conn: CreatorIgConnection,
  parsed: ParsedClipUrl,
): Promise<MetricFetcherResult> {
  if (!conn.accessToken || !conn.accessTokenIv) {
    return failure("NO_TOKEN", "IG connection missing access token", { type: "IG", id: conn.id });
  }
  if (!conn.igUserId) {
    return failure("NO_TOKEN", "IG connection missing ig_user_id", { type: "IG", id: conn.id });
  }

  let token: string;
  try {
    token = decrypt(conn.accessToken, conn.accessTokenIv);
  } catch (err) {
    return failure(
      "TOKEN_BROKEN",
      `IG token decrypt failed: ${(err as Error).message}`,
      { type: "IG", id: conn.id },
    );
  }

  // Walk recent media looking for a permalink that contains the post id from
  // the parsed URL. IG permalinks look like https://www.instagram.com/reel/<shortcode>/.
  const targetPostId = parsed.postId?.toLowerCase();
  let cursor: string | undefined = undefined;
  let foundMediaId: string | null = null;
  let summary: { likes: number; comments: number } | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    let result: Awaited<ReturnType<typeof fetchRecentMedia>>;
    try {
      result = await fetchRecentMedia(token, conn.igUserId, 50, cursor);
    } catch (err) {
      const msg = (err as Error).message?.toLowerCase() ?? "";
      if (msg.includes("oauth") || msg.includes("token") || msg.includes("expired")) {
        return failure("TOKEN_BROKEN", (err as Error).message, { type: "IG", id: conn.id });
      }
      return failure("PLATFORM_ERROR", (err as Error).message, { type: "IG", id: conn.id });
    }
    for (const media of result.media) {
      const permalink = (media.permalink ?? "").toLowerCase();
      if (
        (targetPostId && permalink.includes(`/${targetPostId}/`)) ||
        (targetPostId && permalink.includes(targetPostId))
      ) {
        foundMediaId = media.id;
        summary = { likes: media.like_count ?? 0, comments: media.comments_count ?? 0 };
        break;
      }
    }
    if (foundMediaId) break;
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }

  if (!foundMediaId || !summary) {
    return failure("POST_NOT_FOUND", `IG post ${parsed.postId} not found in recent media`, {
      type: "IG",
      id: conn.id,
    });
  }

  // Pull video views / reach via insights when available. Non-fatal on failure.
  let viewCount = 0;
  let reachCount: number | null = null;
  try {
    const insights = await getSingleMediaInsights(foundMediaId, token);
    viewCount = insights.videoViews || insights.impressions || 0;
    reachCount = insights.reach || null;
  } catch {
    // Stories/non-video media may not return video_views. Fall back to 0.
  }

  return {
    ok: true,
    source: "OAUTH_IG",
    viewCount: BigInt(viewCount),
    likeCount: summary.likes,
    commentCount: summary.comments,
    shareCount: 0,
    saveCount: null,
    watchTimeSec: null,
    reachCount,
    raw: { mediaId: foundMediaId },
  };
}

