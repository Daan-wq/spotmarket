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
import { failure, type MetricFetcherResult } from "./router";
import { recordRawApiResponse } from "./raw-storage";

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

const VIDEO_INSIGHT_METRICS = [
  "total_video_views",
  "total_video_impressions",
  "post_impressions_unique",
  "post_video_avg_time_watched",
  "post_video_view_time",
  "post_video_social_actions",
  "post_video_followers",
  "post_video_likes_by_reaction_type",
  "post_video_retention_graph",
  "blue_reels_play_count",
  "fb_reels_replay_count",
  "fb_reels_total_plays",
].join(",");

export async function fetchFacebookMetric(
  conn: CreatorFbConnection,
  parsed: ParsedClipUrl,
  submissionId?: string,
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

  const videoId = parsed.postId;
  if (!videoId) {
    return failure("POST_NOT_FOUND", "FB URL missing video id", { type: "FB", id: conn.id });
  }

  const reactionFields = REACTION_TYPES.map(
    (t) => `reactions_${t.toLowerCase()}:reactions.type(${t}).summary(true).limit(0)`,
  ).join(",");

  const fields = [
    "id",
    "views",
    `video_insights.metric(${VIDEO_INSIGHT_METRICS})`,
    "likes.summary(true).limit(0)",
    "comments.summary(true).limit(0)",
    "shares",
    "reactions.summary(true).limit(0)",
    reactionFields,
  ].join(",");

  const compositeId = `${conn.fbPageId}_${videoId}`;
  for (const target of [compositeId, videoId]) {
    const params = new URLSearchParams({ fields, access_token: token });
    const res = await fetch(`${GRAPH_BASE}/${target}?${params}`);

    if (res.status === 401 || res.status === 403) {
      return failure("TOKEN_BROKEN", `FB Graph returned ${res.status}`, {
        type: "FB",
        id: conn.id,
      });
    }

    if (res.status === 404) continue;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (text.includes("OAuthException") || text.includes("access token")) {
        return failure("TOKEN_BROKEN", text.slice(0, 200), { type: "FB", id: conn.id });
      }
      return failure("PLATFORM_ERROR", `FB Graph ${res.status}: ${text.slice(0, 200)}`, {
        type: "FB",
        id: conn.id,
      });
    }

    const data = (await res.json()) as Record<string, unknown>;

    const views = (data.views as number | undefined) ?? extractInsight(data, "total_video_views");
    const reach = extractInsight(data, "post_impressions_unique");
    const reelPlays =
      extractInsight(data, "fb_reels_total_plays") ??
      extractInsight(data, "blue_reels_play_count");
    const replays = extractInsight(data, "fb_reels_replay_count");
    const avgTimeWatched = extractInsight(data, "post_video_avg_time_watched");
    const viewTime = extractInsight(data, "post_video_view_time");

    // Watch time in seconds. avgTimeWatched is in ms per Meta docs; viewTime is
    // total time in ms across all viewers. Prefer total view_time when available.
    const watchTimeSec =
      viewTime != null
        ? Math.round(viewTime / 1000)
        : avgTimeWatched != null
          ? Math.round(avgTimeWatched / 1000)
          : null;

    const reactionsByType = extractReactionsByType(data);
    const totalReactions = sumOf(data.reactions);
    const summaryLikes = sumOf(data.likes);
    const comments = sumOf(data.comments);
    const shares = (data.shares as { count?: number } | undefined)?.count ?? 0;

    // Use the concrete LIKE breakdown when present (more accurate than the
    // legacy `likes` summary), but fall back to summary count.
    const likeCount = reactionsByType?.LIKE ?? summaryLikes ?? 0;

    // Persist retention curve in its own table when the API returned one.
    const retentionGraph = extractRetentionGraph(data);
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

    await recordRawApiResponse({
      submissionId: submissionId ?? null,
      connectionType: "FB",
      connectionId: conn.id,
      endpoint: "facebook.post.insights",
      payload: data,
    });

    const reelMeta = {
      reelPlays,
      replays,
      avgTimeWatched,
      viewTime,
      socialActions: extractInsight(data, "post_video_social_actions"),
      videoFollowers: extractInsight(data, "post_video_followers"),
    };

    return {
      ok: true,
      source: "OAUTH_FB",
      viewCount: BigInt(views ?? reelPlays ?? 0),
      likeCount,
      commentCount: comments,
      shareCount: shares,
      saveCount: null,
      watchTimeSec,
      reachCount: reach,
      totalInteractions: totalReactions || null,
      followsFromMedia: reelMeta.videoFollowers,
      profileVisits: null,
      profileActivity: null,
      reactionsByType: reactionsByType,
      raw: {
        id: target,
        reel: reelMeta,
      },
    };
  }

  return failure("POST_NOT_FOUND", `FB video ${videoId} not found on page ${conn.fbPageId}`, {
    type: "FB",
    id: conn.id,
  });
}

function sumOf(field: unknown): number {
  if (!field || typeof field !== "object") return 0;
  const summary = (field as { summary?: { total_count?: number } }).summary;
  return summary?.total_count ?? 0;
}

function extractInsight(data: Record<string, unknown>, name: string): number | null {
  const insights = data.video_insights as
    | { data?: { name: string; values?: { value: unknown }[] }[] }
    | undefined;
  const row = insights?.data?.find((d) => d.name === name);
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
  const insights = data.video_insights as
    | { data?: { name: string; values?: { value: unknown }[] }[] }
    | undefined;
  const row = insights?.data?.find((d) => d.name === "post_video_retention_graph");
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
