/**
 * Instagram OAuth metric fetcher.
 *
 * Owner: A. Resolves a submission's post URL against the creator's recent
 * media list (Instagram Graph API v25), classifies the media (FEED / REEL /
 * STORY), pulls the media-type-aware lifetime insights via `fetchMediaInsights`,
 * archives the full payload via `recordRawApiResponse`, and returns structured
 * metrics including the per-media breakdowns (`total_interactions`, `follows`,
 * `profile_visits`, `profile_activity`).
 *
 * The legacy `getSingleMediaInsights` path used `impressions` + `video_views`,
 * both deprecated 2025-04-21 for v22.0+. Do not reintroduce it.
 */

import type { CreatorIgConnection } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import {
  fetchRecentMedia,
  fetchMediaInsights,
  type MediaInsightType,
} from "@/lib/instagram";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { failure, type MetricFetcherResult } from "./router";
import { recordRawApiResponse } from "./raw-storage";

/**
 * IG media list returns up to 100 recent posts at once. We page until we either
 * find the matching permalink (or postId in URL), or exhaust ~3 pages.
 */
const MAX_PAGES = 3;

interface MatchedMedia {
  id: string;
  mediaType: string;
  mediaProductType: string;
  permalink: string;
  timestamp: string;
  caption: string | null;
  likeCount: number;
  commentCount: number;
}

function classifyMedia(m: { mediaType: string; mediaProductType: string }): MediaInsightType {
  const product = (m.mediaProductType ?? "").toUpperCase();
  if (product === "REELS" || product === "REEL") return "REEL";
  if (product === "STORY") return "STORY";
  return "FEED";
}

export async function fetchInstagramMetric(
  conn: CreatorIgConnection,
  parsed: ParsedClipUrl,
  submissionId?: string,
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
  let matched: MatchedMedia | null = null;

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
        targetPostId &&
        (permalink.includes(`/${targetPostId}/`) || permalink.includes(targetPostId))
      ) {
        matched = {
          id: media.id,
          mediaType: media.media_type ?? "",
          mediaProductType: media.media_product_type ?? "",
          permalink: media.permalink ?? "",
          timestamp: media.timestamp ?? "",
          caption: media.caption ?? null,
          likeCount: media.like_count ?? 0,
          commentCount: media.comments_count ?? 0,
        };
        break;
      }
    }
    if (matched) break;
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }

  if (!matched) {
    return failure("POST_NOT_FOUND", `IG post ${parsed.postId} not found in recent media`, {
      type: "IG",
      id: conn.id,
    });
  }

  const mediaType = classifyMedia(matched);
  const insights = await fetchMediaInsights(matched.id, token, mediaType);

  // Build the profile_activity breakdown only when at least one bucket is non-null,
  // so we don't bloat MetricSnapshot rows with empty `{}` for REEL media.
  const profileActivity =
    insights.profileActivityBioLink == null &&
    insights.profileActivityCall == null &&
    insights.profileActivityDirection == null &&
    insights.profileActivityEmail == null &&
    insights.profileActivityText == null
      ? null
      : {
          BIO_LINK_CLICKED: insights.profileActivityBioLink,
          CALL: insights.profileActivityCall,
          DIRECTION: insights.profileActivityDirection,
          EMAIL: insights.profileActivityEmail,
          TEXT: insights.profileActivityText,
        };

  // Watch time seconds — prefer total_watch_time, fall back to avg_watch_time
  const watchTimeSec =
    insights.totalWatchTime != null
      ? Math.round(insights.totalWatchTime)
      : insights.avgWatchTime != null
        ? Math.round(insights.avgWatchTime)
        : null;

  // Best-effort views — REEL/FEED return `views`; STORY also returns `views`.
  const viewCount = insights.views ?? 0;
  const likeCount = insights.likes ?? matched.likeCount;
  const commentCount = insights.comments ?? matched.commentCount;
  const shareCount = insights.shares ?? 0;
  const saveCount = insights.saved ?? null;
  const reachCount = insights.reach ?? null;

  const rawPayload = {
    media: matched,
    mediaType,
    insights,
  };

  // Fire-and-forget archival; failures are logged but never block the poll.
  await recordRawApiResponse({
    submissionId: submissionId ?? null,
    connectionType: "IG",
    connectionId: conn.id,
    endpoint: "instagram.media.insights",
    payload: rawPayload,
  });

  return {
    ok: true,
    source: "OAUTH_IG",
    viewCount: BigInt(viewCount),
    likeCount,
    commentCount,
    shareCount,
    saveCount,
    watchTimeSec,
    reachCount,
    totalInteractions: insights.totalInteractions ?? null,
    followsFromMedia: insights.follows ?? null,
    profileVisits: insights.profileVisits ?? null,
    profileActivity,
    reactionsByType: null,
    // Keep `raw` lightweight — full payload lives in RawApiResponse.
    raw: {
      mediaId: matched.id,
      mediaType,
      mediaProductType: matched.mediaProductType,
      permalink: matched.permalink,
      timestamp: matched.timestamp,
      navigation:
        mediaType === "STORY"
          ? {
              TAP_FORWARD: insights.navigationForward,
              TAP_BACK: insights.navigationBack,
              TAP_EXIT: insights.navigationExit,
              SWIPE_FORWARD: insights.navigationNextStory,
            }
          : null,
      replies: insights.replies ?? null,
    },
  };
}
