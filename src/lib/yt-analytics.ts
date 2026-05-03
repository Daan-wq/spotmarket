/**
 * YouTube Channel Analytics persistence (Phase 6 of track-everything).
 *
 * Owner: A. Stops the biggest single data loss in the system: previously the
 * `fetchChannelAnalytics` daily series was computed on-demand for the creator
 * dashboard and then discarded. Now we run a daily cron that fetches the last
 * 7 days of analytics for each verified YT connection plus the extra
 * dimension breakdowns (traffic source, playback location, device type,
 * creator content type, subscribed status) and upserts into
 * `YtDailyChannelInsight`. Window slides daily so we get backfill for any
 * data Google delays.
 */

import { Prisma, type CreatorYtConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFreshYoutubeAccessToken } from "@/lib/token-refresh";
import { recordRawApiResponse } from "@/lib/metrics/raw-storage";

const YT_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2";

const DAILY_METRICS = [
  "views",
  "estimatedMinutesWatched",
  "averageViewDuration",
  "averageViewPercentage",
  "subscribersGained",
  "subscribersLost",
  "likes",
  "comments",
  "shares",
  "redViews",
  "estimatedRedMinutesWatched",
].join(",");

interface AnalyticsRow {
  date: string;
  views: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  averageViewPercentage: number | null;
  subscribersGained: number;
  subscribersLost: number;
  likes: number;
  comments: number;
  shares: number;
  redViews: number | null;
  estimatedRedMinutesWatched: number | null;
}

interface BreakdownMap {
  trafficSource: Record<string, number>;
  playbackLocation: Record<string, number>;
  deviceType: Record<string, number>;
  contentType: Record<string, number>;
  subscribedStatus: Record<string, number>;
}

export interface YtAnalyticsRunResult {
  connectionId: string;
  ok: boolean;
  rowsUpserted: number;
  reason?: string;
}

export async function pollYtAnalyticsForConnection(
  conn: CreatorYtConnection,
  windowDays = 7,
): Promise<YtAnalyticsRunResult> {
  const result: YtAnalyticsRunResult = {
    connectionId: conn.id,
    ok: false,
    rowsUpserted: 0,
  };

  const token = await getFreshYoutubeAccessToken(conn).catch(() => null);
  if (!token) {
    result.reason = "no token";
    return result;
  }

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const startStr = toIsoDate(startDate);
  const endStr = toIsoDate(endDate);

  const dailyRows = await fetchDailyRows(token, conn.channelId, startStr, endStr);
  if (dailyRows.length === 0) {
    result.reason = "no analytics rows";
    return result;
  }

  const breakdowns = await fetchBreakdowns(token, conn.channelId, startStr, endStr);

  await recordRawApiResponse({
    connectionType: "YT",
    connectionId: conn.id,
    endpoint: "youtube.analytics.daily",
    payload: { window: { startDate: startStr, endDate: endStr }, dailyRows, breakdowns },
  });

  for (const row of dailyRows) {
    const data = {
      connectionId: conn.id,
      date: new Date(`${row.date}T00:00:00.000Z`),
      views: BigInt(row.views),
      estimatedMinutesWatched: row.estimatedMinutesWatched,
      averageViewDuration: Math.round(row.averageViewDuration),
      averageViewPercentage: row.averageViewPercentage,
      subscribersGained: row.subscribersGained,
      subscribersLost: row.subscribersLost,
      likes: row.likes,
      comments: row.comments,
      shares: row.shares,
      redViews: row.redViews != null ? BigInt(row.redViews) : null,
      estimatedRedMinutesWatched: row.estimatedRedMinutesWatched,
      trafficSourceBreakdown: emptyToNull(breakdowns.trafficSource),
      playbackLocationBreakdown: emptyToNull(breakdowns.playbackLocation),
      deviceTypeBreakdown: emptyToNull(breakdowns.deviceType),
      contentTypeBreakdown: emptyToNull(breakdowns.contentType),
      subscribedStatusBreakdown: emptyToNull(breakdowns.subscribedStatus),
      raw: { row, breakdowns } as unknown as Prisma.InputJsonValue,
    };

    await prisma.ytDailyChannelInsight.upsert({
      where: { connectionId_date: { connectionId: conn.id, date: data.date } },
      create: data,
      update: data,
    });
    result.rowsUpserted++;
  }

  result.ok = true;
  return result;
}

async function fetchDailyRows(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<AnalyticsRow[]> {
  const params = new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: DAILY_METRICS,
    dimensions: "day",
    sort: "day",
  });

  const res = await fetch(`${YT_ANALYTICS_BASE}/reports?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.warn(`[yt-analytics] reports failed ${res.status}: ${(await res.text()).slice(0, 120)}`);
    return [];
  }
  const json = await res.json();
  const rows: unknown[][] = json.rows ?? [];

  return rows.map((row) => ({
    date: String(row[0] ?? ""),
    views: numberAt(row, 1),
    estimatedMinutesWatched: numberAt(row, 2),
    averageViewDuration: numberAt(row, 3),
    averageViewPercentage: row[4] != null ? Number(row[4]) : null,
    subscribersGained: numberAt(row, 5),
    subscribersLost: numberAt(row, 6),
    likes: numberAt(row, 7),
    comments: numberAt(row, 8),
    shares: numberAt(row, 9),
    redViews: row[10] != null ? Number(row[10]) : null,
    estimatedRedMinutesWatched: row[11] != null ? Number(row[11]) : null,
  }));
}

async function fetchBreakdowns(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<BreakdownMap> {
  const out: BreakdownMap = {
    trafficSource: {},
    playbackLocation: {},
    deviceType: {},
    contentType: {},
    subscribedStatus: {},
  };

  const dimensions: Array<{ key: keyof BreakdownMap; dimension: string; metric?: string }> = [
    { key: "trafficSource", dimension: "insightTrafficSourceType" },
    { key: "playbackLocation", dimension: "insightPlaybackLocationType" },
    { key: "deviceType", dimension: "deviceType" },
    { key: "contentType", dimension: "creatorContentType" },
    { key: "subscribedStatus", dimension: "subscribedStatus" },
  ];

  await Promise.all(
    dimensions.map(async ({ key, dimension, metric }) => {
      try {
        const params = new URLSearchParams({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: metric ?? "views",
          dimensions: dimension,
          sort: `-${metric ?? "views"}`,
          maxResults: "25",
        });
        const res = await fetch(`${YT_ANALYTICS_BASE}/reports?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const rows: unknown[][] = json.rows ?? [];
        const total = rows.reduce((s, r) => s + numberAt(r, 1), 0);
        if (total <= 0) return;
        for (const r of rows) {
          const label = String(r[0] ?? "");
          const value = numberAt(r, 1);
          if (label) out[key][label] = value / total;
        }
      } catch {
        // dimension may be unsupported on a given channel; ignore.
      }
    }),
  );

  return out;
}

function numberAt(row: unknown[], idx: number): number {
  const v = row[idx];
  if (typeof v === "number") return v;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyToNull(map: Record<string, number>): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (Object.keys(map).length === 0) return Prisma.JsonNull;
  return map as Prisma.InputJsonValue;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
