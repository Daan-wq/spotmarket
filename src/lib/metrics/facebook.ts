/**
 * Facebook OAuth metric fetcher.
 *
 * Pulls a much richer set of metrics than the original v1 implementation:
 *   - Reaction-type breakdown (LIKE / LOVE / WOW / HAHA / SAD / ANGRY / THANKFUL / PRIDE / CARE)
 *   - Facebook Reels-specific counters (blue_reels_play_count, fb_reels_replay_count, fb_reels_total_plays)
 *   - Video-depth metrics (post_video_avg_time_watched, post_video_view_time,
 *     post_video_social_actions, post_video_followers, post_video_likes_by_reaction_type)
 *   - Retention graph (post_video_retention_graph) — stored in `VideoRetentionCurve`
 *   - Page reach via post_impressions_unique
 *
 * Full API responses are archived via `recordRawApiResponse` (Phase 1 escape
 * hatch) so we can re-derive metrics if Meta deprecates fields.
 */

import { Prisma, type CreatorFbConnection } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { metricAvailability } from "@/lib/contracts/metrics";
import { failure, type MetricFetcherResult } from "./router";
import { recordRawApiResponse } from "./raw-storage";
import {
  classifyMetaApiError,
  metaApiErrorFromResponse,
  MetaApiRequestError,
} from "./meta-api-error";

const GRAPH_BASE = "https://graph.facebook.com/v25.0";

const REACTION_TYPES = [
  "LIKE",
  "LOVE",
  "WOW",
  "HAHA",
  "SAD",
  "ANGRY",
  "THANKFUL",
  "PRIDE",
  "CARE",
] as const;

const CORE_VIDEO_INSIGHT_METRICS = [
  "total_video_views",
  "post_impressions_unique",
  "post_video_avg_time_watched",
  "post_video_view_time",
  "blue_reels_play_count",
  "fb_reels_replay_count",
  "fb_reels_total_plays",
].join(",");

const OPTIONAL_VIDEO_INSIGHT_METRICS = [
  "post_video_social_actions",
  "post_video_followers",
  "post_video_likes_by_reaction_type",
  "post_video_retention_graph",
].join(",");

export async function fetchFacebookMetric(
  conn: CreatorFbConnection,
  parsed: ParsedClipUrl,
  submissionId?: string,
  identity?: {
    platformApiMediaId?: string | null;
  },
): Promise<MetricFetcherResult> {
  if (!conn.accessToken || !conn.accessTokenIv) {
    return failure("NO_TOKEN", "FB connection missing access token", { type: "FB", id: conn.id });
  }
  if (!conn.fbPageId) {
    return failure("NO_TOKEN", "FB connection missing page id", { type: "FB", id: conn.id });
  }

  let token: string;
  try {
    token = decrypt(conn.accessToken, conn.accessTokenIv);
  } catch (err) {
    return failure(
      "TOKEN_BROKEN",
      `FB token decrypt failed: ${(err as Error).message}`,
      { type: "FB", id: conn.id },
    );
  }

  const parsedVideoId = parsed.postId;
  if (!parsedVideoId) {
    return failure("POST_NOT_FOUND", "FB URL missing video id", { type: "FB", id: conn.id });
  }

  const reactionFields = REACTION_TYPES.map(
    (t) => `reactions.type(${t}).summary(total_count).limit(0).as(reactions_${t.toLowerCase()})`,
  ).join(",");

  const fields = [
    "id",
    "likes.summary(true).limit(0)",
    "comments.summary(true).limit(0)",
    "shares",
    "reactions.summary(true).limit(0)",
    "attachments{target{id}}",
    reactionFields,
  ].join(",");

  const postTargets = [`${conn.fbPageId}_${parsedVideoId}`, parsedVideoId];
  let postData: Record<string, unknown> | null = null;
  let postTarget: string | null = null;
  for (const target of postTargets) {
    try {
      postData = await fetchMetaJson(
        `${GRAPH_BASE}/${target}?${new URLSearchParams({ fields, access_token: token })}`,
      );
      postTarget = target;
      break;
    } catch (err) {
      if (err instanceof MetaApiRequestError && classifyMetaApiError(err.details) === "POST_NOT_FOUND") {
        continue;
      }
      return facebookFailure(err, conn.id);
    }
  }

  if (!postData || !postTarget) {
    return failure(
      "POST_NOT_FOUND",
      `FB post ${parsedVideoId} not found on page ${conn.fbPageId}`,
      { type: "FB", id: conn.id },
    );
  }

  const videoId =
    identity?.platformApiMediaId ??
    extractAttachmentTargetId(postData) ??
    parsedVideoId;

  let coreInsights: Record<string, unknown>;
  try {
    coreInsights = await fetchVideoInsights(videoId, CORE_VIDEO_INSIGHT_METRICS, token);
  } catch (err) {
    return facebookFailure(err, conn.id);
  }

  let optionalInsights: Record<string, unknown> = { data: [] };
  let optionalInsightsError: unknown = null;
  try {
    optionalInsights = await fetchVideoInsights(videoId, OPTIONAL_VIDEO_INSIGHT_METRICS, token);
  } catch (err) {
    optionalInsightsError =
      err instanceof MetaApiRequestError ? err.details : String(err);
  }

  const views =
    extractInsight(coreInsights, "fb_reels_total_plays") ??
    extractInsight(coreInsights, "blue_reels_play_count") ??
    extractInsight(coreInsights, "total_video_views");
  if (views == null) {
    return failure(
      "API_SCHEMA_ERROR",
      `Facebook returned no views metric for video ${videoId}`,
      { type: "FB", id: conn.id },
    );
  }

  const reach = extractInsight(coreInsights, "post_impressions_unique");
  const reelPlays =
    extractInsight(coreInsights, "fb_reels_total_plays") ??
    extractInsight(coreInsights, "blue_reels_play_count");
  const replays = extractInsight(coreInsights, "fb_reels_replay_count");
  const avgTimeWatched = extractInsight(coreInsights, "post_video_avg_time_watched");
  const viewTime = extractInsight(coreInsights, "post_video_view_time");
  const watchTimeSec =
    viewTime != null
      ? Math.round(viewTime / 1000)
      : avgTimeWatched != null
        ? Math.round(avgTimeWatched / 1000)
        : null;

  const reactionsByType = extractReactionsByType(postData);
  const totalReactions = summaryCount(postData.reactions);
  const summaryLikes = summaryCount(postData.likes);
  const comments = summaryCount(postData.comments);
  const shares = shareCount(postData.shares);
  const likeCount = reactionsByType?.LIKE ?? summaryLikes ?? 0;

  const retentionGraph = extractRetentionGraph(optionalInsights);
  if (retentionGraph && submissionId) {
    try {
      await prisma.videoRetentionCurve.create({
        data: {
          submissionId,
          source: "OAUTH_FB",
          curve: retentionGraph as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      console.warn(`[fb-metric] retention curve persist failed: ${(err as Error).message}`);
    }
  }

  const rawPayload = {
    post: postData,
    coreVideoInsights: coreInsights,
    optionalVideoInsights: optionalInsights,
    optionalVideoInsightsError: optionalInsightsError,
  };
  await recordRawApiResponse({
    submissionId: submissionId ?? null,
    connectionType: "FB",
    connectionId: conn.id,
    endpoint: "facebook.video.insights",
    payload: rawPayload,
  });

  const reelMeta = {
    reelPlays,
    replays,
    avgTimeWatched,
    viewTime,
    watchTimeKind: viewTime != null ? "total" : avgTimeWatched != null ? "average" : null,
    socialActions: extractInsight(optionalInsights, "post_video_social_actions"),
    videoFollowers: extractInsight(optionalInsights, "post_video_followers"),
  };
  const availability = metricAvailability({
    views: true,
    likes: reactionsByType?.LIKE != null || summaryLikes != null,
    comments: comments != null,
    shares: shares != null,
    watchTime: watchTimeSec != null,
    reach: reach != null,
    totalInteractions: totalReactions != null,
    follows: reelMeta.videoFollowers != null,
    reactions: reactionsByType != null,
  });

  return {
    ok: true,
    source: "OAUTH_FB",
    connection: { type: "FB", id: conn.id },
    resolvedIdentity: { platformApiMediaId: videoId },
    viewCount: BigInt(views),
    likeCount,
    commentCount: comments ?? 0,
    shareCount: shares ?? 0,
    saveCount: null,
    watchTimeSec,
    reachCount: reach,
    metricAvailability: availability,
    totalInteractions: totalReactions,
    followsFromMedia: reelMeta.videoFollowers,
    profileVisits: null,
    profileActivity: null,
    reactionsByType,
    raw: {
      postId: postTarget,
      videoId,
      reel: reelMeta,
    },
  };
}

async function fetchMetaJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  if (!res.ok) throw await metaApiErrorFromResponse(res);
  return await res.json() as Record<string, unknown>;
}

async function fetchVideoInsights(
  videoId: string,
  metrics: string,
  accessToken: string,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ metric: metrics, access_token: accessToken });
  return fetchMetaJson(`${GRAPH_BASE}/${videoId}/video_insights?${params}`);
}

function facebookFailure(error: unknown, connectionId: string): MetricFetcherResult {
  if (error instanceof MetaApiRequestError) {
    return failure(
      classifyMetaApiError(error.details),
      error.message,
      { type: "FB", id: connectionId },
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
    error instanceof Error ? error.message : "Facebook metrics request failed",
    { type: "FB", id: connectionId },
  );
}

function extractAttachmentTargetId(data: Record<string, unknown>): string | null {
  const attachments = data.attachments as
    | { data?: Array<{ target?: { id?: unknown } }> }
    | undefined;
  const id = attachments?.data?.[0]?.target?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function summaryCount(field: unknown): number | null {
  if (!field || typeof field !== "object") return null;
  const summary = (field as { summary?: { total_count?: number } }).summary;
  return typeof summary?.total_count === "number" ? summary.total_count : null;
}

function shareCount(field: unknown): number | null {
  if (!field || typeof field !== "object") return null;
  const count = (field as { count?: number }).count;
  return typeof count === "number" ? count : null;
}

function extractInsight(data: Record<string, unknown>, name: string): number | null {
  const row = insightRows(data).find((d) => d.name === name);
  const v = row?.values?.[0]?.value;
  if (typeof v === "number") return v;
  return null;
}

function extractReactionsByType(data: Record<string, unknown>): Record<string, number> | null {
  const out: Record<string, number> = {};
  let any = false;
  for (const t of REACTION_TYPES) {
    const key = `reactions_${t.toLowerCase()}`;
    const field = data[key];
    if (field && typeof field === "object") {
      const summary = (field as { summary?: { total_count?: number } }).summary;
      const n = summary?.total_count;
      if (typeof n === "number") {
        out[t] = n;
        any = true;
      }
    }
  }
  return any ? out : null;
}

interface RetentionPoint {
  tSec: number;
  retentionPct: number;
}

function extractRetentionGraph(data: Record<string, unknown>): RetentionPoint[] | null {
  const row = insightRows(data).find((d) => d.name === "post_video_retention_graph");
  const value = row?.values?.[0]?.value;
  if (!value || typeof value !== "object") return null;

  // Meta returns this as { "0": 1.0, "1": 0.93, "2": 0.85, ... } where the
  // key is the second-bucket and the value is the retention fraction.
  const points: RetentionPoint[] = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const tSec = Number(k);
    const retentionPct = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(tSec) && Number.isFinite(retentionPct)) {
      points.push({ tSec, retentionPct });
    }
  }
  if (points.length === 0) return null;
  points.sort((a, b) => a.tSec - b.tSec);
  return points;
}

function insightRows(
  data: Record<string, unknown>,
): Array<{ name: string; values?: Array<{ value: unknown }> }> {
  if (Array.isArray(data.data)) {
    return data.data as Array<{ name: string; values?: Array<{ value: unknown }> }>;
  }
  const nested = data.video_insights as
    | { data?: Array<{ name: string; values?: Array<{ value: unknown }> }> }
    | undefined;
  return nested?.data ?? [];
}
