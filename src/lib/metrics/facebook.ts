/**
 * Facebook OAuth metric fetcher.
 *
 * The submission URL gives us a numeric video / reel id. We hit the page-scoped
 * Graph endpoint `GET /<pageId>_<videoId>?fields=...` (or a fallback to
 * `GET /<videoId>` with the page access token) to read view, like, comment and
 * share counts.
 *
 * For reels we fall back to `GET /<videoId>?fields=video_insights.metric(...)`.
 */

import type { CreatorFbConnection } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { failure, type MetricFetcherResult } from "./router";

const GRAPH_BASE = "https://graph.facebook.com/v25.0";

export async function fetchFacebookMetric(
  conn: CreatorFbConnection,
  parsed: ParsedClipUrl,
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

  // Composite id (pageId_videoId) targets the page-owned post; if the URL
  // already encoded the page (handle path), we still try both forms.
  const compositeId = `${conn.fbPageId}_${videoId}`;
  const fields =
    "id,views,video_insights.metric(total_video_views,post_impressions_unique),likes.summary(true).limit(0),comments.summary(true).limit(0),shares,reactions.summary(true).limit(0)";

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
      // OAuthException from FB Graph usually surfaces here.
      if (text.includes("OAuthException") || text.includes("access token")) {
        return failure("TOKEN_BROKEN", text.slice(0, 200), { type: "FB", id: conn.id });
      }
      return failure("PLATFORM_ERROR", `FB Graph ${res.status}: ${text.slice(0, 200)}`, {
        type: "FB",
        id: conn.id,
      });
    }

    const data = (await res.json()) as Record<string, unknown>;
    const views = (data.views as number | undefined) ?? extractInsightView(data);
    const likes = sumOf(data.likes);
    const reactions = sumOf(data.reactions);
    const comments = sumOf(data.comments);
    const shares = (data.shares as { count?: number } | undefined)?.count ?? 0;

    return {
      ok: true,
      source: "OAUTH_FB",
      viewCount: BigInt(views ?? 0),
      likeCount: reactions || likes || 0,
      commentCount: comments,
      shareCount: shares,
      saveCount: null,
      watchTimeSec: null,
      reachCount: extractReach(data),
      raw: { id: target },
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

function extractInsightView(data: Record<string, unknown>): number | undefined {
  const insights = data.video_insights as { data?: { name: string; values?: { value: number }[] }[] } | undefined;
  const row = insights?.data?.find((d) => d.name === "total_video_views");
  return row?.values?.[0]?.value;
}

function extractReach(data: Record<string, unknown>): number | null {
  const insights = data.video_insights as { data?: { name: string; values?: { value: number }[] }[] } | undefined;
  const row = insights?.data?.find((d) => d.name === "post_impressions_unique");
  return row?.values?.[0]?.value ?? null;
}
