/**
 * YouTube OAuth metric fetcher.
 *
 * Calls YouTube Data API v3 `videos.list?part=statistics,snippet&id=<id>` with
 * the creator's OAuth token. The video must belong to a channel the connection
 * owns — we verify `snippet.channelId === conn.channelId` to prevent metric
 * leakage from other channels (the API will return any public video).
 */

import type { CreatorYtConnection } from "@prisma/client";
import {
  isYoutubeInvalidTokenError,
  withFreshYoutubeAccessToken,
} from "@/lib/token-refresh";
import type { ParsedClipUrl } from "@/lib/parse-clip-url";
import { metricAvailability } from "@/lib/contracts/metrics";
import { failure, type MetricFetcherResult } from "./router";
import { recordRawApiResponse } from "./raw-storage";

const YT_DATA_BASE = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2";
const YT_MIN_ANALYTICS_DATE = "2005-02-14";
const YT_VIDEO_ANALYTICS_METRICS = [
  "views",
  "comments",
  "likes",
  "shares",
  "estimatedMinutesWatched",
  "averageViewDuration",
  "videosAddedToPlaylists",
  "videosRemovedFromPlaylists",
].join(",");

export async function fetchYoutubeMetric(
  conn: CreatorYtConnection,
  parsed: ParsedClipUrl,
  submissionId?: string,
): Promise<MetricFetcherResult> {
  if (!conn.accessToken || !conn.accessTokenIv) {
    return failure("NO_TOKEN", "YT connection missing access token", { type: "YT", id: conn.id });
  }

  const videoId = parsed.postId ?? "";
  if (!videoId) {
    return failure("POST_NOT_FOUND", "YT URL missing video id", { type: "YT", id: conn.id });
  }

  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: videoId,
  });

  let fetched: { token: string; data: Awaited<ReturnType<typeof readYoutubeVideosList>> } | null;
  try {
    fetched = await withFreshYoutubeAccessToken(conn, async (token) => ({
      token,
      data: await readYoutubeVideosList(token, params),
    }));
  } catch (err) {
    if (isYoutubeInvalidTokenError(err)) {
      return failure("TOKEN_BROKEN", (err as Error).message, { type: "YT", id: conn.id });
    }
    return failure("PLATFORM_ERROR", (err as Error).message, { type: "YT", id: conn.id });
  }

  if (!fetched) {
    return failure("TOKEN_EXPIRED", "YT token expired and refresh failed", {
      type: "YT",
      id: conn.id,
    });
  }

  const { token, data } = fetched;

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

  const analytics = await fetchVideoAnalytics({
    accessToken: token,
    channelId: conn.channelId,
    videoId,
    startDate: analyticsStartDate(item.snippet?.publishedAt),
    endDate: new Date().toISOString().slice(0, 10),
  });

  await recordRawApiResponse({
    submissionId: submissionId ?? null,
    connectionType: "YT",
    connectionId: conn.id,
    endpoint: "youtube.video.metrics",
    payload: {
      dataApi: data,
      analytics: { ok: analytics.ok, raw: analytics.raw, error: analytics.error ?? null },
    },
  });

  const dataViews = parseCount(item.statistics?.viewCount);
  const dataLikes = parseCount(item.statistics?.likeCount);
  const dataComments = parseCount(item.statistics?.commentCount);
  const analyticsViews = analytics.metric("views");
  const analyticsLikes = analytics.metric("likes");
  const analyticsComments = analytics.metric("comments");
  const analyticsShares = analytics.metric("shares");
  const estimatedMinutesWatched = analytics.metric("estimatedMinutesWatched");
  const averageViewDuration = analytics.metric("averageViewDuration");
  const watchTimeSec =
    estimatedMinutesWatched != null ? Math.round(estimatedMinutesWatched * 60) : null;
  const likeCount = dataLikes ?? analyticsLikes ?? 0;
  const commentCount = dataComments ?? analyticsComments ?? 0;
  const shareCount = analyticsShares ?? 0;
  const viewCount = dataViews ?? analyticsViews ?? 0;

  return {
    ok: true,
    source: "OAUTH_YT",
    connection: { type: "YT", id: conn.id },
    viewCount: BigInt(viewCount),
    likeCount,
    commentCount,
    shareCount,
    saveCount: null,
    watchTimeSec,
    reachCount: null,
    metricAvailability: metricAvailability({
      views: dataViews != null || analyticsViews != null,
      likes: dataLikes != null || analyticsLikes != null,
      comments: dataComments != null || analyticsComments != null,
      shares: analyticsShares != null,
      watchTime: watchTimeSec != null || averageViewDuration != null,
    }),
    totalInteractions:
      dataLikes != null || dataComments != null || analyticsShares != null
        ? likeCount + commentCount + shareCount
        : null,
    raw: {
      videoId,
      channelId: item.snippet?.channelId ?? null,
      title: item.snippet?.title ?? null,
      publishedAt: item.snippet?.publishedAt ?? null,
      duration: item.contentDetails?.duration ?? null,
      watchTimeKind: estimatedMinutesWatched != null ? "total" : averageViewDuration != null ? "average" : null,
      estimatedMinutesWatched,
      averageViewDuration,
      playlistAdds: analytics.metric("videosAddedToPlaylists"),
      playlistRemoves: analytics.metric("videosRemovedFromPlaylists"),
      analyticsAvailable: analytics.ok,
      analyticsError: analytics.error ?? null,
    },
  };
}

async function readYoutubeVideosList(accessToken: string, params: URLSearchParams): Promise<{
  items?: {
    id: string;
    snippet?: { channelId?: string; title?: string; publishedAt?: string };
    contentDetails?: { duration?: string };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
      favoriteCount?: string;
    };
  }[];
}> {
  const res = await fetch(`${YT_DATA_BASE}/videos?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`YT videos.list returned ${res.status}: ${await res.text().catch(() => "")}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YT videos.list ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as {
    items?: {
      id: string;
      snippet?: { channelId?: string; title?: string; publishedAt?: string };
      contentDetails?: { duration?: string };
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
        favoriteCount?: string;
      };
    }[];
  };
}

interface FetchVideoAnalyticsArgs {
  accessToken: string;
  channelId: string;
  videoId: string;
  startDate: string;
  endDate: string;
}

type AnalyticsMetricLookup = {
  ok: boolean;
  raw: unknown;
  error?: string;
  metric: (name: string) => number | null;
};

async function fetchVideoAnalytics(args: FetchVideoAnalyticsArgs): Promise<AnalyticsMetricLookup> {
  const params = new URLSearchParams({
    ids: `channel==${args.channelId}`,
    startDate: args.startDate,
    endDate: args.endDate,
    metrics: YT_VIDEO_ANALYTICS_METRICS,
    filters: `video==${args.videoId}`,
    maxResults: "1",
  });

  try {
    const res = await fetch(`${YT_ANALYTICS_BASE}/reports?${params}`, {
      headers: { Authorization: `Bearer ${args.accessToken}` },
    });
    const text = await res.text();
    const raw = safeJson(text);
    if (!res.ok) {
      return analyticsLookup(false, raw ?? text.slice(0, 500), `YT Analytics ${res.status}`);
    }
    return analyticsLookup(true, raw ?? {});
  } catch (err) {
    return analyticsLookup(false, null, (err as Error).message);
  }
}

function analyticsLookup(ok: boolean, raw: unknown, error?: string): AnalyticsMetricLookup {
  const metrics = new Map<string, number>();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as {
      columnHeaders?: { name?: string }[];
      rows?: unknown[][];
    };
    const row = record.rows?.[0];
    if (row) {
      record.columnHeaders?.forEach((header, index) => {
        const name = header.name;
        const value = row[index];
        const numeric = typeof value === "number" ? value : Number(value);
        if (name && Number.isFinite(numeric)) {
          metrics.set(name, numeric);
        }
      });
    }
  }
  return {
    ok,
    raw,
    error,
    metric: (name) => metrics.get(name) ?? null,
  };
}

function parseCount(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function analyticsStartDate(publishedAt: string | undefined): string {
  if (!publishedAt) return YT_MIN_ANALYTICS_DATE;
  const published = new Date(publishedAt);
  if (!Number.isFinite(published.getTime())) return YT_MIN_ANALYTICS_DATE;
  const min = new Date(`${YT_MIN_ANALYTICS_DATE}T00:00:00.000Z`);
  return (published < min ? min : published).toISOString().slice(0, 10);
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
