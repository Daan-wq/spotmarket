import { prisma } from "@/lib/prisma";
import type { ConnectionType } from "@prisma/client";
import { type Range, withinRange, withinPrevRange, pctDelta } from "./range";
import {
  type PlatformSlug,
  PLATFORM_ALL,
  slugToConnectionType,
  metricSourceToSlug,
} from "./types";
import { aggregateAudience, latestPerConnection } from "./audience";

export interface AdminPlatformAggregate {
  slug: PlatformSlug;
  connectionCount: number;
  followerCount: number;
  windowViews: number;
  windowEngagement: number;
  topCreator: { creatorId: string; displayName: string; views: number } | null;
}

export interface AdminFleetStats {
  fleetViews: { value: number; delta: number | null };
  activeCreators: { value: number; delta: number | null };
  effectiveCpv: { value: number; delta: number | null };
  oauthSuccessRate: { value: number; delta: number | null };
  byPlatform: Record<PlatformSlug, AdminPlatformAggregate>;
}

async function getAllSubmissionIdsByPlatform(
  range: Range,
): Promise<Record<PlatformSlug, string[]>> {
  const cap = withinRange(range);
  const subs = await prisma.campaignSubmission.findMany({
    where: cap.gte ? { createdAt: { lte: cap.lte } } : {},
    select: {
      id: true,
      sourcePlatform: true,
      metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { source: true } },
    },
  });
  const out: Record<PlatformSlug, string[]> = { ig: [], tt: [], yt: [], fb: [] };
  for (const s of subs) {
    const fromSnap = s.metricSnapshots[0]?.source;
    let slug: PlatformSlug | null = fromSnap ? metricSourceToSlug(fromSnap) : null;
    if (!slug && s.sourcePlatform) {
      if (s.sourcePlatform === "INSTAGRAM") slug = "ig";
      else if (s.sourcePlatform === "TIKTOK") slug = "tt";
      else if (s.sourcePlatform === "FACEBOOK") slug = "fb";
    }
    if (slug) out[slug].push(s.id);
  }
  return out;
}

async function sumWindowViewsAndEngagement(
  submissionIds: string[],
  range: Range,
): Promise<{ views: number; engagement: number }> {
  if (submissionIds.length === 0) return { views: 0, engagement: 0 };
  const cap = withinRange(range);
  const where = {
    submissionId: { in: submissionIds },
    ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
  };
  const [earliest, latest] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where,
      orderBy: { capturedAt: "asc" },
      distinct: ["submissionId"],
      select: { submissionId: true, viewCount: true },
    }),
    prisma.metricSnapshot.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      distinct: ["submissionId"],
      select: { submissionId: true, viewCount: true, likeCount: true, commentCount: true, shareCount: true },
    }),
  ]);
  const earliestMap = new Map(earliest.map((s) => [s.submissionId, Number(s.viewCount)]));
  let views = 0;
  let engagement = 0;
  for (const l of latest) {
    const start = earliestMap.get(l.submissionId) ?? 0;
    views += Math.max(0, Number(l.viewCount) - start);
    engagement += (l.likeCount ?? 0) + (l.commentCount ?? 0) + (l.shareCount ?? 0);
  }
  return { views, engagement };
}

async function countActiveCreators(): Promise<number> {
  // Active = creator with ≥1 verified connection on any platform
  const [ig, tt, yt, fb] = await Promise.all([
    prisma.creatorIgConnection.findMany({ where: { isVerified: true }, select: { creatorProfileId: true } }),
    prisma.creatorTikTokConnection.findMany({ where: { isVerified: true }, select: { creatorProfileId: true } }),
    prisma.creatorYtConnection.findMany({ where: { isVerified: true }, select: { creatorProfileId: true } }),
    prisma.creatorFbConnection.findMany({ where: { isVerified: true }, select: { creatorProfileId: true } }),
  ]);
  const set = new Set<string>();
  for (const c of [...ig, ...tt, ...yt, ...fb]) set.add(c.creatorProfileId);
  return set.size;
}

async function effectiveCpv(range: Range): Promise<number> {
  const cap = withinRange(range);
  const agg = await prisma.campaignSubmission.aggregate({
    where: {
      status: "APPROVED",
      ...(cap.gte ? { reviewedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    _sum: { earnedAmount: true, eligibleViews: true },
  });
  const earned = Number(agg._sum.earnedAmount ?? 0);
  const views = Number(agg._sum.eligibleViews ?? 0);
  return views > 0 ? earned / views : 0;
}

async function oauthSuccessRate(range: Range): Promise<number> {
  const cap = withinRange(range);
  const where = cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {};
  const [success, total] = await Promise.all([
    prisma.metricSnapshot.count({
      where: { ...where, source: { in: ["OAUTH_IG", "OAUTH_TT", "OAUTH_YT", "OAUTH_FB"] } },
    }),
    prisma.metricSnapshot.count({ where }),
  ]);
  return total > 0 ? (success / total) * 100 : 0;
}

async function getFleetFollowers(slug: PlatformSlug): Promise<number> {
  const connType = slugToConnectionType(slug);
  const snaps = await prisma.platformAccountSnapshot.findMany({
    where: { connectionType: connType },
    orderBy: { capturedAt: "desc" },
    distinct: ["connectionId"],
    select: { followerCount: true },
  });
  return snaps.reduce((s, x) => s + (x.followerCount ?? 0), 0);
}

async function getFleetConnectionCount(slug: PlatformSlug): Promise<number> {
  if (slug === "ig") return prisma.creatorIgConnection.count();
  if (slug === "tt") return prisma.creatorTikTokConnection.count();
  if (slug === "yt") return prisma.creatorYtConnection.count();
  return prisma.creatorFbConnection.count();
}

async function findTopCreator(
  submissionIds: string[],
  range: Range,
): Promise<{ creatorId: string; displayName: string; views: number } | null> {
  if (submissionIds.length === 0) return null;
  const cap = withinRange(range);
  const latest = await prisma.metricSnapshot.findMany({
    where: {
      submissionId: { in: submissionIds },
      ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { capturedAt: "desc" },
    distinct: ["submissionId"],
    select: {
      viewCount: true,
      submission: {
        select: {
          creatorId: true,
          creator: { select: { creatorProfile: { select: { displayName: true } } } },
        },
      },
    },
  });

  const totals = new Map<string, { displayName: string; views: number }>();
  for (const l of latest) {
    if (!l.submission) continue;
    const id = l.submission.creatorId;
    const name = l.submission.creator?.creatorProfile?.displayName ?? "Unknown creator";
    const prev = totals.get(id) ?? { displayName: name, views: 0 };
    prev.views += Number(l.viewCount);
    totals.set(id, prev);
  }
  let best: { creatorId: string; displayName: string; views: number } | null = null;
  for (const [id, v] of totals.entries()) {
    if (!best || v.views > best.views) best = { creatorId: id, ...v };
  }
  return best;
}

async function buildAdminPlatformAggregate(
  slug: PlatformSlug,
  subIds: string[],
  range: Range,
): Promise<AdminPlatformAggregate> {
  const [connectionCount, followerCount, windowAgg, topCreator] = await Promise.all([
    getFleetConnectionCount(slug),
    getFleetFollowers(slug),
    sumWindowViewsAndEngagement(subIds, range),
    findTopCreator(subIds, range),
  ]);
  return {
    slug,
    connectionCount,
    followerCount,
    windowViews: windowAgg.views,
    windowEngagement: windowAgg.engagement,
    topCreator,
  };
}

export async function getAdminFleetStats(range: Range): Promise<AdminFleetStats> {
  const subsByPlatform = await getAllSubmissionIdsByPlatform(range);
  const allSubIds = PLATFORM_ALL.flatMap((p) => subsByPlatform[p]);

  const [windowAgg, activeCreators, cpv, oauthRate] = await Promise.all([
    sumWindowViewsAndEngagement(allSubIds, range),
    countActiveCreators(),
    effectiveCpv(range),
    oauthSuccessRate(range),
  ]);

  // Prior period for delta
  const prevCap = withinPrevRange(range);
  let prevWindowAgg = { views: 0, engagement: 0 };
  let prevCpv = 0;
  let prevOauth = 0;
  if (prevCap) {
    const prevRange: Range = { ...range, start: prevCap.gte!, end: prevCap.lte! };
    [prevWindowAgg, prevCpv, prevOauth] = await Promise.all([
      sumWindowViewsAndEngagement(allSubIds, prevRange),
      effectiveCpv(prevRange),
      oauthSuccessRate(prevRange),
    ]);
  }

  const byPlatform: Record<PlatformSlug, AdminPlatformAggregate> = {
    ig: await buildAdminPlatformAggregate("ig", subsByPlatform.ig, range),
    tt: await buildAdminPlatformAggregate("tt", subsByPlatform.tt, range),
    yt: await buildAdminPlatformAggregate("yt", subsByPlatform.yt, range),
    fb: await buildAdminPlatformAggregate("fb", subsByPlatform.fb, range),
  };

  return {
    fleetViews: { value: windowAgg.views, delta: pctDelta(windowAgg.views, prevWindowAgg.views) },
    activeCreators: { value: activeCreators, delta: null }, // count snapshot, no period
    effectiveCpv: { value: cpv, delta: pctDelta(cpv, prevCpv) },
    oauthSuccessRate: { value: oauthRate, delta: pctDelta(oauthRate, prevOauth) },
    byPlatform,
  };
}

// ──────────────────────────────────────────────
// Admin per-platform & per-connection
// ──────────────────────────────────────────────

export async function getAdminFleetPlatformStats(slug: PlatformSlug, range: Range) {
  const subsByPlatform = await getAllSubmissionIdsByPlatform(range);
  const subIds = subsByPlatform[slug];
  const agg = await buildAdminPlatformAggregate(slug, subIds, range);

  // Prior period
  const prevCap = withinPrevRange(range);
  let prev = { views: 0, engagement: 0 };
  if (prevCap) {
    const prevRange: Range = { ...range, start: prevCap.gte!, end: prevCap.lte! };
    prev = await sumWindowViewsAndEngagement(subIds, prevRange);
  }

  const topCreators = await listTopCreators(subIds, range, 10);

  return {
    ...agg,
    viewsDelta: pctDelta(agg.windowViews, prev.views),
    engagementDelta: pctDelta(agg.windowEngagement, prev.engagement),
    topCreators,
  };
}

async function listTopCreators(
  submissionIds: string[],
  range: Range,
  limit: number,
): Promise<Array<{ creatorId: string; displayName: string; views: number }>> {
  if (submissionIds.length === 0) return [];
  const cap = withinRange(range);
  const latest = await prisma.metricSnapshot.findMany({
    where: {
      submissionId: { in: submissionIds },
      ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { capturedAt: "desc" },
    distinct: ["submissionId"],
    select: {
      viewCount: true,
      submission: {
        select: {
          creatorId: true,
          creator: { select: { creatorProfile: { select: { displayName: true } } } },
        },
      },
    },
  });
  const totals = new Map<string, { displayName: string; views: number }>();
  for (const l of latest) {
    if (!l.submission) continue;
    const id = l.submission.creatorId;
    const name = l.submission.creator?.creatorProfile?.displayName ?? "Unknown";
    const prev = totals.get(id) ?? { displayName: name, views: 0 };
    prev.views += Number(l.viewCount);
    totals.set(id, prev);
  }
  return Array.from(totals.entries())
    .map(([id, v]) => ({ creatorId: id, displayName: v.displayName, views: v.views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// ──────────────────────────────────────────────
// Demographics (fleet-wide or per-platform)
// ──────────────────────────────────────────────

export async function getAdminDemographics(slug: PlatformSlug | null, kind?: "FOLLOWER" | "ENGAGED") {
  const filterTypes: ConnectionType[] = slug ? [slugToConnectionType(slug)] : ["IG", "TT", "YT", "FB"];
  const snaps = await prisma.audienceSnapshot.findMany({
    where: { connectionType: { in: filterTypes } },
    orderBy: { capturedAt: "desc" },
    take: 500,
  });
  const latest = latestPerConnection(snaps);
  return aggregateAudience(latest, kind);
}

// ──────────────────────────────────────────────
// Account-growth time series (admin / fleet-wide per platform)
// ──────────────────────────────────────────────

export async function getAdminAccountGrowth(slug: PlatformSlug, range: Range) {
  const cap = withinRange(range);
  const snaps = await prisma.platformAccountSnapshot.findMany({
    where: {
      connectionType: slugToConnectionType(slug),
      ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { capturedAt: "asc" },
  });
  const byDate = new Map<string, { date: string; followers: number; following: number; videoCount: number; totalLikes: number }>();
  for (const s of snaps) {
    const key = s.capturedAt.toISOString().slice(0, 10);
    const e = byDate.get(key) ?? { date: key, followers: 0, following: 0, videoCount: 0, totalLikes: 0 };
    e.followers += s.followerCount ?? 0;
    e.following += s.followingCount ?? 0;
    e.videoCount += s.videoCount ?? 0;
    e.totalLikes += Number(s.totalLikes ?? 0);
    byDate.set(key, e);
  }
  return Array.from(byDate.values());
}

// ──────────────────────────────────────────────
// Admin per-connection (read-only deep view)
// ──────────────────────────────────────────────

export async function getAdminConnectionStats(slug: PlatformSlug, connectionId: string, range: Range) {
  let label = "";
  let handle: string | null = null;
  let followerCount: number | null = null;
  let creatorDisplayName = "";
  let creatorProfileId = "";
  let isVerified = false;
  let tokenExpiresAt: Date | null = null;
  let lastSyncedAt: Date | null = null;

  if (slug === "ig") {
    const c = await prisma.creatorIgConnection.findFirst({
      where: { id: connectionId },
      include: { creatorProfile: { select: { id: true, displayName: true } } },
    });
    if (!c) return null;
    label = c.igUsername;
    handle = `@${c.igUsername}`;
    followerCount = c.followerCount;
    isVerified = c.isVerified;
    tokenExpiresAt = c.tokenExpiresAt;
    lastSyncedAt = c.lastCheckedAt;
    creatorDisplayName = c.creatorProfile.displayName;
    creatorProfileId = c.creatorProfile.id;
  } else if (slug === "tt") {
    const c = await prisma.creatorTikTokConnection.findFirst({
      where: { id: connectionId },
      include: { creatorProfile: { select: { id: true, displayName: true } } },
    });
    if (!c) return null;
    label = c.displayName ?? c.username;
    handle = `@${c.username}`;
    followerCount = c.followerCount;
    isVerified = c.isVerified;
    tokenExpiresAt = c.tokenExpiresAt;
    lastSyncedAt = c.lastCheckedAt;
    creatorDisplayName = c.creatorProfile.displayName;
    creatorProfileId = c.creatorProfile.id;
  } else if (slug === "yt") {
    const c = await prisma.creatorYtConnection.findFirst({
      where: { id: connectionId },
      include: { creatorProfile: { select: { id: true, displayName: true } } },
    });
    if (!c) return null;
    label = c.channelName;
    handle = c.channelName;
    followerCount = c.subscriberCount;
    isVerified = c.isVerified;
    tokenExpiresAt = c.tokenExpiresAt;
    lastSyncedAt = c.updatedAt;
    creatorDisplayName = c.creatorProfile.displayName;
    creatorProfileId = c.creatorProfile.id;
  } else {
    const c = await prisma.creatorFbConnection.findFirst({
      where: { id: connectionId },
      include: { creatorProfile: { select: { id: true, displayName: true } } },
    });
    if (!c) return null;
    label = c.pageName;
    handle = c.pageHandle ? `@${c.pageHandle}` : null;
    followerCount = c.followerCount;
    isVerified = c.isVerified;
    tokenExpiresAt = c.tokenExpiresAt;
    lastSyncedAt = c.lastCheckedAt;
    creatorDisplayName = c.creatorProfile.displayName;
    creatorProfileId = c.creatorProfile.id;
  }

  return { slug, connectionId, label, handle, followerCount, isVerified, tokenExpiresAt, lastSyncedAt, creatorDisplayName, creatorProfileId };
}
