import { prisma } from "@/lib/prisma";
import { type Range, withinRange } from "./range";

// ──────────────────────────────────────────────
// YouTube dimensional breakdowns
// ──────────────────────────────────────────────

export type YtDimension =
  | "trafficSourceBreakdown"
  | "playbackLocationBreakdown"
  | "deviceTypeBreakdown"
  | "contentTypeBreakdown"
  | "subscribedStatusBreakdown";

export interface YtBreakdownPoint {
  date: string;
  buckets: Record<string, number>;
}

export async function getYtBreakdowns(
  connectionIds: string[],
  range: Range,
): Promise<Record<YtDimension, YtBreakdownPoint[]>> {
  const empty: Record<YtDimension, YtBreakdownPoint[]> = {
    trafficSourceBreakdown: [],
    playbackLocationBreakdown: [],
    deviceTypeBreakdown: [],
    contentTypeBreakdown: [],
    subscribedStatusBreakdown: [],
  };
  if (connectionIds.length === 0) return empty;
  const cap = withinRange(range);
  const rows = await prisma.ytDailyChannelInsight.findMany({
    where: {
      connectionId: { in: connectionIds },
      ...(cap.gte ? { date: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      trafficSourceBreakdown: true,
      playbackLocationBreakdown: true,
      deviceTypeBreakdown: true,
      contentTypeBreakdown: true,
      subscribedStatusBreakdown: true,
    },
  });

  const dims: YtDimension[] = [
    "trafficSourceBreakdown",
    "playbackLocationBreakdown",
    "deviceTypeBreakdown",
    "contentTypeBreakdown",
    "subscribedStatusBreakdown",
  ];

  const out = { ...empty };
  for (const dim of dims) {
    const byDate = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const key = r.date.toISOString().slice(0, 10);
      const data = (r[dim] as Record<string, number> | null) ?? {};
      const acc = byDate.get(key) ?? {};
      for (const [bucket, value] of Object.entries(data)) {
        acc[bucket] = (acc[bucket] ?? 0) + (Number(value) || 0);
      }
      byDate.set(key, acc);
    }
    out[dim] = Array.from(byDate.entries())
      .map(([date, buckets]) => ({ date, buckets }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
}

// ──────────────────────────────────────────────
// Facebook retention curve (averaged across submissions in window)
// ──────────────────────────────────────────────

export interface RetentionPoint {
  tSec: number;
  retentionPct: number;
}

export async function getAggregateRetentionCurve(
  submissionIds: string[],
  range: Range,
): Promise<RetentionPoint[]> {
  if (submissionIds.length === 0) return [];
  const cap = withinRange(range);
  const curves = await prisma.videoRetentionCurve.findMany({
    where: {
      submissionId: { in: submissionIds },
      source: "OAUTH_FB",
      ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { capturedAt: "desc" },
    distinct: ["submissionId"],
    select: { curve: true },
  });

  const sumByT = new Map<number, { sum: number; count: number }>();
  for (const c of curves) {
    const arr = (c.curve as RetentionPoint[] | null) ?? [];
    for (const p of arr) {
      const t = Math.round(p.tSec);
      const existing = sumByT.get(t) ?? { sum: 0, count: 0 };
      existing.sum += Number(p.retentionPct) || 0;
      existing.count += 1;
      sumByT.set(t, existing);
    }
  }
  return Array.from(sumByT.entries())
    .map(([tSec, v]) => ({ tSec, retentionPct: v.count > 0 ? v.sum / v.count : 0 }))
    .sort((a, b) => a.tSec - b.tSec);
}

// ──────────────────────────────────────────────
// Instagram Stories — feed + reel correlations
// ──────────────────────────────────────────────

export async function getStoriesActivity(
  connectionIds: string[],
  range: Range,
) {
  if (connectionIds.length === 0) return [];
  const cap = withinRange(range);
  return prisma.storyPost.findMany({
    where: {
      connectionId: { in: connectionIds },
      ...(cap.gte ? { postedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { postedAt: "desc" },
    take: 50,
    select: {
      id: true,
      mediaId: true,
      postedAt: true,
      mediaType: true,
      mediaProductType: true,
      permalink: true,
      reach: true,
      views: true,
      replies: true,
      follows: true,
      profileVisits: true,
      totalInteractions: true,
      tapsForward: true,
      tapsBack: true,
      tapsExit: true,
      correlations: {
        select: { submissionId: true, deltaMinutes: true },
      },
    },
  });
}

export async function getStoryReelCorrelations(submissionIds: string[]) {
  if (submissionIds.length === 0) return [];
  return prisma.storyReelCorrelation.findMany({
    where: { submissionId: { in: submissionIds } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      submissionId: true,
      deltaMinutes: true,
      createdAt: true,
      story: {
        select: {
          id: true,
          mediaId: true,
          postedAt: true,
          permalink: true,
          views: true,
          reach: true,
        },
      },
    },
  });
}

// ──────────────────────────────────────────────
// FB reaction-mix-over-time
// ──────────────────────────────────────────────

export interface FbReactionPoint {
  date: string;
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
  care: number;
  thankful: number;
  pride: number;
}

const FB_REACTION_KEYS = [
  "like", "love", "haha", "wow", "sad", "angry", "care", "thankful", "pride",
] as const;

export async function getFbReactionsOverTime(
  submissionIds: string[],
  range: Range,
): Promise<FbReactionPoint[]> {
  if (submissionIds.length === 0) return [];
  const cap = withinRange(range);
  const snaps = await prisma.metricSnapshot.findMany({
    where: {
      submissionId: { in: submissionIds },
      source: "OAUTH_FB",
      ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { capturedAt: "asc" },
    select: { capturedAt: true, reactionsByType: true },
  });

  const byDate = new Map<string, FbReactionPoint>();
  for (const s of snaps) {
    const key = s.capturedAt.toISOString().slice(0, 10);
    const existing =
      byDate.get(key) ??
      ({ date: key, like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0, care: 0, thankful: 0, pride: 0 } as FbReactionPoint);
    const data = (s.reactionsByType as Record<string, number> | null) ?? {};
    for (const k of FB_REACTION_KEYS) {
      existing[k] += Number(data[k] ?? 0);
    }
    byDate.set(key, existing);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ──────────────────────────────────────────────
// Daily views series (used for Overview chart on every platform)
// ──────────────────────────────────────────────

export async function getDailyViewsSeries(
  submissionIds: string[],
  range: Range,
): Promise<Array<{ date: string; views: number; likes: number; comments: number; shares: number }>> {
  if (submissionIds.length === 0) return [];
  const cap = withinRange(range);
  const snaps = await prisma.metricSnapshot.findMany({
    where: {
      submissionId: { in: submissionIds },
      ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { capturedAt: "asc" },
    select: {
      submissionId: true,
      capturedAt: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
    },
  });

  // For each submission, compute per-day deltas (latest snapshot of day - previous-day-latest).
  const bySub = new Map<string, typeof snaps>();
  for (const s of snaps) {
    const arr = bySub.get(s.submissionId) ?? [];
    arr.push(s);
    bySub.set(s.submissionId, arr);
  }
  const byDate = new Map<string, { date: string; views: number; likes: number; comments: number; shares: number }>();
  for (const arr of bySub.values()) {
    let prevView = 0;
    let prevLike = 0;
    let prevComment = 0;
    let prevShare = 0;
    // last snapshot per day
    const perDay = new Map<string, typeof snaps[number]>();
    for (const s of arr) {
      const key = s.capturedAt.toISOString().slice(0, 10);
      const existing = perDay.get(key);
      if (!existing || s.capturedAt > existing.capturedAt) perDay.set(key, s);
    }
    const days = Array.from(perDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [date, snap] of days) {
      const v = Number(snap.viewCount);
      const l = snap.likeCount ?? 0;
      const c = snap.commentCount ?? 0;
      const sh = snap.shareCount ?? 0;
      const dayDelta = {
        views: Math.max(0, v - prevView),
        likes: Math.max(0, l - prevLike),
        comments: Math.max(0, c - prevComment),
        shares: Math.max(0, sh - prevShare),
      };
      prevView = v;
      prevLike = l;
      prevComment = c;
      prevShare = sh;
      const acc = byDate.get(date) ?? { date, views: 0, likes: 0, comments: 0, shares: 0 };
      acc.views += dayDelta.views;
      acc.likes += dayDelta.likes;
      acc.comments += dayDelta.comments;
      acc.shares += dayDelta.shares;
      byDate.set(date, acc);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
