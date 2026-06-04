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
import {
  fetchInstagramMediaMetadata,
  fetchRecentMedia,
  fetchMediaInsights,
  isInstagramInvalidTokenError,
  type MediaInsightType,
} from "@/lib/instagram";
import { withFreshInstagramAccessToken } from "@/lib/token-refresh";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { metricAvailability } from "@/lib/contracts/metrics";
import { failure, type MetricFetcherResult } from "./router";
import { recordRawApiResponse } from "./raw-storage";
import {
  classifyMetaApiError,
  MetaApiRequestError,
} from "./meta-api-error";

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
  identity?: {
    platformApiMediaId?: string | null;
    mediaProductType?: string | null;
  },
): Promise<MetricFetcherResult> {
  if (!conn.accessToken || !conn.accessTokenIv) {
    return failure("NO_TOKEN", "IG connection missing access token", { type: "IG", id: conn.id });
  }
  if (!conn.igUserId) {
    return failure("NO_TOKEN", "IG connection missing ig_user_id", { type: "IG", id: conn.id });
  }

  try {
    const result = await withFreshInstagramAccessToken(conn, (token) =>
      fetchInstagramMetricWithToken(conn, parsed, token, submissionId, identity),
    );
    if (!result) {
      return failure("TOKEN_EXPIRED", "IG token expired and refresh failed", {
        type: "IG",
        id: conn.id,
      });
    }
    return result;
  } catch (err) {
    if (isInstagramInvalidTokenError(err)) {
      return failure("TOKEN_BROKEN", (err as Error).message, { type: "IG", id: conn.id });
    }
    return failure(
      "PLATFORM_ERROR",
      err instanceof Error ? err.message : "Instagram metrics request failed",
      { type: "IG", id: conn.id },
    );
  }
}

async function fetchInstagramMetricWithToken(
  conn: CreatorIgConnection,
  parsed: ParsedClipUrl,
  token: string,
  submissionId?: string,
  identity?: {
    platformApiMediaId?: string | null;
    mediaProductType?: string | null;
  },
): Promise<MetricFetcherResult> {
  if (!conn.igUserId) {
    return failure("NO_TOKEN", "IG connection missing ig_user_id", { type: "IG", id: conn.id });
  }

  let matched: MatchedMedia | null = null;
  const canonicalMediaId = identity?.platformApiMediaId ?? null;
  const knownProductType = identity?.mediaProductType ?? null;

  if (canonicalMediaId && knownProductType) {
    matched = {
      id: canonicalMediaId,
      mediaType: isVideoProductType(knownProductType) ? "VIDEO" : "",
      mediaProductType: knownProductType,
      permalink: parsed.normalizedUrl,
      timestamp: "",
      caption: null,
      likeCount: 0,
      commentCount: 0,
    };
  } else if (canonicalMediaId) {
    try {
      const media = await fetchInstagramMediaMetadata(canonicalMediaId, token);
      matched = toMatchedMedia(media);
    } catch (err) {
      if (isInstagramInvalidTokenError(err)) throw err;
      return instagramFailure(err, conn.id);
    }
  } else {
    const targetPostId = parsed.postId?.toLowerCase();
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      let result: Awaited<ReturnType<typeof fetchRecentMedia>>;
      try {
        result = await fetchRecentMedia(token, conn.igUserId, 50, cursor);
      } catch (err) {
        if (isInstagramInvalidTokenError(err)) throw err;
        return instagramFailure(err, conn.id);
      }
      for (const media of result.media) {
        const permalink = (media.permalink ?? "").toLowerCase();
        if (
          targetPostId &&
          (permalink.includes(`/${targetPostId}/`) || permalink.includes(targetPostId))
        ) {
          matched = toMatchedMedia(media);
          break;
        }
      }
      if (matched) break;
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
  }

  if (!matched) {
    return failure("POST_NOT_FOUND", `IG post ${parsed.postId} not found in recent media`, {
      type: "IG",
      id: conn.id,
    });
  }

  const mediaType = classifyMedia(matched);
  let insights: Awaited<ReturnType<typeof fetchMediaInsights>>;
  try {
    insights = await fetchMediaInsights(matched.id, token, mediaType);
  } catch (err) {
    if (isInstagramInvalidTokenError(err)) throw err;
    return instagramFailure(err, conn.id);
  }

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
  const watchTimeKind =
    insights.totalWatchTime != null
      ? "total"
      : insights.avgWatchTime != null
        ? "average"
        : null;
  const watchTimeSec =
    insights.totalWatchTime != null
      ? Math.round(insights.totalWatchTime)
      : insights.avgWatchTime != null
        ? Math.round(insights.avgWatchTime)
        : null;

  // Best-effort views — REEL returns real `views`; STORY also returns `views`.
  // For FEED media that isn't a video (IMAGE / CAROUSEL_ALBUM photo posts),
  // IG's `views` insights metric is effectively 0 — only video content gets a
  // views count. Fall back to `reach` (unique accounts that saw the post) so
  // photo/carousel submissions can still earn on view-based campaigns.
  const isVideoLike =
    mediaType === "REEL" || matched.mediaType.toUpperCase() === "VIDEO";
  const reachCount = insights.reach ?? null;
  if (isVideoLike && insights.views == null) {
    return failure(
      "API_SCHEMA_ERROR",
      `Instagram returned no views metric for ${mediaType.toLowerCase()} ${matched.id}`,
      { type: "IG", id: conn.id },
    );
  }
  const viewCount = insights.views ?? reachCount ?? 0;
  const likeCount = insights.likes ?? matched.likeCount;
  const commentCount = insights.comments ?? matched.commentCount;
  const shareCount = insights.shares ?? 0;
  const saveCount = insights.saved ?? null;
  const availability = metricAvailability({
    views: insights.views != null || (!isVideoLike && reachCount != null),
    likes: insights.likes != null || (mediaType !== "STORY" && matched.likeCount != null),
    comments: insights.comments != null || (mediaType !== "STORY" && matched.commentCount != null),
    shares: insights.shares != null,
    saves: insights.saved != null,
    watchTime: watchTimeSec != null,
    reach: reachCount != null,
    totalInteractions: insights.totalInteractions != null,
    follows: insights.follows != null,
    profileVisits: insights.profileVisits != null,
  });

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
    connection: { type: "IG", id: conn.id },
    resolvedIdentity: {
      platformApiMediaId: matched.id,
      mediaProductType: matched.mediaProductType || null,
    },
    viewCount: BigInt(viewCount),
    likeCount,
    commentCount,
    shareCount,
    saveCount,
    watchTimeSec,
    reachCount,
    metricAvailability: availability,
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
      watchTimeKind,
      totalWatchTimeSec: insights.totalWatchTime ?? null,
      averageWatchTimeSec: insights.avgWatchTime ?? null,
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

function toMatchedMedia(media: {
  id: string;
  media_type?: string | null;
  media_product_type?: string | null;
  permalink?: string | null;
  timestamp?: string | null;
  caption?: string | null;
  like_count?: number | null;
  comments_count?: number | null;
}): MatchedMedia {
  return {
    id: media.id,
    mediaType: media.media_type ?? "",
    mediaProductType: media.media_product_type ?? "",
    permalink: media.permalink ?? "",
    timestamp: media.timestamp ?? "",
    caption: media.caption ?? null,
    likeCount: media.like_count ?? 0,
    commentCount: media.comments_count ?? 0,
  };
}

function isVideoProductType(mediaProductType: string): boolean {
  const value = mediaProductType.toUpperCase();
  return value === "REEL" || value === "REELS" || value === "STORY";
}

function instagramFailure(error: unknown, connectionId: string): MetricFetcherResult {
  if (error instanceof MetaApiRequestError) {
    return failure(
      classifyMetaApiError(error.details),
      error.message,
      { type: "IG", id: connectionId },
      {
        httpStatus: error.details.httpStatus,
        providerCode: error.details.providerCode,
        providerSubcode: error.details.providerSubcode,
        providerType: error.details.providerType,
        raw: error.details.raw,
      },
    );
  }

  return failure(
    "PLATFORM_ERROR",
    error instanceof Error ? error.message : "Instagram metrics request failed",
    { type: "IG", id: connectionId },
  );
}
