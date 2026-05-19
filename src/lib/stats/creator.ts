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
import {
  getSocialAccountSummariesForProfile,
  getSocialAccountSummary,
  type SocialAccountSummary,
} from "@/lib/social-account-summary";

export interface PlatformAggregate {
  slug: PlatformSlug;
  connectionCount: number;
  followerCount: number;
  windowViews: number;
  windowEngagement: number;
  topPost: { title: string; views: number; submissionId: string } | null;
}

export interface CreatorTopStats {
  totalViews: { value: number; delta: number | null };
  totalFollowers: { value: number; delta: number | null };
  totalEngagement: { value: number; delta: number | null };
  totalEarnings: { value: number; delta: number | null };
  byPlatform: Record<PlatformSlug, PlatformAggregate>;
}

export interface CreatorStatsScope {
  userId: string;
  creatorProfileId: string;
}

async function getProfileScope(supabaseUserId: string): Promise<CreatorStatsScope | null> {
  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUserId },
    select: { id: true, creatorProfile: { select: { id: true } } },
  });
  if (!user || !user.creatorProfile) return null;
  return { userId: user.id, creatorProfileId: user.creatorProfile.id };
}

async function getConnectionIds(creatorProfileId: string): Promise<Record<PlatformSlug, string[]>> {
  const [igs, tts, yts, fbs] = await Promise.all([
    prisma.creatorIgConnection.findMany({ where: { creatorProfileId }, select: { id: true } }),
    prisma.creatorTikTokConnection.findMany({ where: { creatorProfileId }, select: { id: true } }),
    prisma.creatorYtConnection.findMany({ where: { creatorProfileId }, select: { id: true } }),
    prisma.creatorFbConnection.findMany({ where: { creatorProfileId }, select: { id: true } }),
  ]);
  return {
    ig: igs.map((c) => c.id),
    tt: tts.map((c) => c.id),
    yt: yts.map((c) => c.id),
    fb: fbs.map((c) => c.id),
  };
}

/**
 * Sum the delta of `viewCount` per submission across the window. We pull the
 * earliest-in-window and latest-in-window snapshot per submission and use the
 * difference. This avoids the BigInt overflow from naively summing every
 * snapshot's viewCount.
 */
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

  // For total views: take the latest snapshot per submission within range
  // and subtract the earliest (or 0 if no earlier exists).
  const earliest = await prisma.metricSnapshot.findMany({
    where,
    orderBy: { capturedAt: "asc" },
    distinct: ["submissionId"],
    select: { submissionId: true, viewCount: true },
  });
  const latest = await prisma.metricSnapshot.findMany({
    where,
    orderBy: { capturedAt: "desc" },
    distinct: ["submissionId"],
    select: { submissionId: true, viewCount: true, likeCount: true, commentCount: true, shareCount: true },
  });

  const earliestMap = new Map(earliest.map((s) => [s.submissionId, Number(s.viewCount)]));

  let views = 0;
  let engagement = 0;
  for (const l of latest) {
    const start = earliestMap.get(l.submissionId) ?? 0;
    const lateViews = Number(l.viewCount);
    views += Math.max(0, lateViews - start);
    engagement += (l.likeCount ?? 0) + (l.commentCount ?? 0) + (l.shareCount ?? 0);
  }
  return { views, engagement };
}

async function sumEarnings(
  userId: string,
  range: Range,
): Promise<number> {
  const cap = withinRange(range);
  const result = await prisma.campaignSubmission.aggregate({
    where: {
      creatorId: userId,
      status: "APPROVED",
      ...(cap.gte ? { reviewedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    _sum: { earnedAmount: true },
  });
  return Number(result._sum.earnedAmount ?? 0);
}

async function getTotalFollowers(
  connIds: Record<PlatformSlug, string[]>,
): Promise<number> {
  let total = 0;
  for (const slug of PLATFORM_ALL) {
    const ids = connIds[slug];
    if (ids.length === 0) continue;
    const snaps = await prisma.platformAccountSnapshot.findMany({
      where: { connectionType: slugToConnectionType(slug), connectionId: { in: ids } },
      orderBy: { capturedAt: "desc" },
      distinct: ["connectionId"],
      select: { audienceCount: true },
    });
    for (const s of snaps) total += s.audienceCount ?? 0;
  }
  return total;
}

/**
 * Find submissions that belong to a given platform for this creator.
 * Strategy: a submission's platform = the platform of the latest MetricSnapshot
 * for that submission (falls back to BioPlatform.sourcePlatform for IG/TT/FB).
 */
export async function getCreatorSubmissionIdsByPlatform(
  supabaseUserId: string,
  range: Range,
): Promise<Record<PlatformSlug, string[]> | null> {
  const scope = await getProfileScope(supabaseUserId);
  if (!scope) return null;
  return getCreatorSubmissionIdsByPlatformForScope(scope, range);
}

export async function getCreatorSubmissionIdsByPlatformForScope(
  scope: CreatorStatsScope,
  range: Range,
): Promise<Record<PlatformSlug, string[]>> {
  return getSubmissionIdsByPlatform(scope.userId, range);
}

async function getSubmissionIdsByPlatform(
  userId: string,
  range: Range,
): Promise<Record<PlatformSlug, string[]>> {
  const cap = withinRange(range);
  const subs = await prisma.campaignSubmission.findMany({
    where: {
      creatorId: userId,
      ...(cap.gte ? { createdAt: { lte: cap.lte } } : {}),
    },
    select: {
      id: true,
      sourcePlatform: true,
      metricSnapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { source: true },
      },
    },
  });

  const out: Record<PlatformSlug, string[]> = { ig: [], tt: [], yt: [], fb: [] };
  for (const s of subs) {
    const fromSnapshot = s.metricSnapshots[0]?.source;
    let slug: PlatformSlug | null = fromSnapshot ? metricSourceToSlug(fromSnapshot) : null;
    if (!slug && s.sourcePlatform) {
      if (s.sourcePlatform === "INSTAGRAM") slug = "ig";
      else if (s.sourcePlatform === "TIKTOK") slug = "tt";
      else if (s.sourcePlatform === "FACEBOOK") slug = "fb";
    }
    if (slug) out[slug].push(s.id);
  }
  return out;
}

export async function getCreatorTopStats(
  supabaseUserId: string,
  range: Range,
): Promise<CreatorTopStats | null> {
  const scope = await getProfileScope(supabaseUserId);
  if (!scope) return null;
  return getCreatorTopStatsForScope(scope, range);
}

export async function getCreatorTopStatsForScope(
  scope: CreatorStatsScope,
  range: Range,
): Promise<CreatorTopStats> {
  const connIds = await getConnectionIds(scope.creatorProfileId);
  const subsByPlatform = await getSubmissionIdsByPlatform(scope.userId, range);
  const allSubIds = PLATFORM_ALL.flatMap((p) => subsByPlatform[p]);

  const [windowAgg, earnings, followers] = await Promise.all([
    sumWindowViewsAndEngagement(allSubIds, range),
    sumEarnings(scope.userId, range),
    getTotalFollowers(connIds),
  ]);

  // Prior period for delta
  const prevCap = withinPrevRange(range);
  let prevWindowAgg = { views: 0, engagement: 0 };
  let prevEarnings = 0;
  if (prevCap) {
    const prevRange: Range = { ...range, start: prevCap.gte!, end: prevCap.lte! };
    prevWindowAgg = await sumWindowViewsAndEngagement(allSubIds, prevRange);
    prevEarnings = await sumEarningsForPrev(scope.userId, prevCap.gte!, prevCap.lte!);
  }

  // Per-platform aggregates
  const byPlatform: Record<PlatformSlug, PlatformAggregate> = {
    ig: await buildPlatformAggregate("ig", connIds.ig, subsByPlatform.ig, range),
    tt: await buildPlatformAggregate("tt", connIds.tt, subsByPlatform.tt, range),
    yt: await buildPlatformAggregate("yt", connIds.yt, subsByPlatform.yt, range),
    fb: await buildPlatformAggregate("fb", connIds.fb, subsByPlatform.fb, range),
  };

  return {
    totalViews: { value: windowAgg.views, delta: pctDelta(windowAgg.views, prevWindowAgg.views) },
    totalFollowers: { value: followers, delta: null }, // followers is a snapshot, not a window
    totalEngagement: { value: windowAgg.engagement, delta: pctDelta(windowAgg.engagement, prevWindowAgg.engagement) },
    totalEarnings: { value: earnings, delta: pctDelta(earnings, prevEarnings) },
    byPlatform,
  };
}

async function sumEarningsForPrev(userId: string, gte: Date, lte: Date): Promise<number> {
  const result = await prisma.campaignSubmission.aggregate({
    where: { creatorId: userId, status: "APPROVED", reviewedAt: { gte, lte } },
    _sum: { earnedAmount: true },
  });
  return Number(result._sum.earnedAmount ?? 0);
}

async function buildPlatformAggregate(
  slug: PlatformSlug,
  connIds: string[],
  subIds: string[],
  range: Range,
): Promise<PlatformAggregate> {
  const connType: ConnectionType = slugToConnectionType(slug);
  const [audienceSnaps, viewsAgg, topPost] = await Promise.all([
    connIds.length > 0
      ? prisma.platformAccountSnapshot.findMany({
          where: { connectionType: connType, connectionId: { in: connIds } },
          orderBy: { capturedAt: "desc" },
          distinct: ["connectionId"],
          select: { audienceCount: true },
        })
      : Promise.resolve([] as { audienceCount: number | null }[]),
    sumWindowViewsAndEngagement(subIds, range),
    findTopPost(subIds, range),
  ]);

  const followerCount = audienceSnaps.reduce((s, x) => s + (x.audienceCount ?? 0), 0);

  return {
    slug,
    connectionCount: connIds.length,
    followerCount,
    windowViews: viewsAgg.views,
    windowEngagement: viewsAgg.engagement,
    topPost,
  };
}

async function findTopPost(
  submissionIds: string[],
  range: Range,
): Promise<{ title: string; views: number; submissionId: string } | null> {
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
      submissionId: true,
      viewCount: true,
      submission: { select: { postUrl: true, campaign: { select: { name: true } } } },
    },
  });
  if (latest.length === 0) return null;
  let best: typeof latest[number] | null = null;
  for (const l of latest) {
    if (!best || l.viewCount > best.viewCount) best = l;
  }
  if (!best) return null;
  return {
    title: best.submission?.campaign?.name ?? best.submission?.postUrl ?? "Untitled",
    views: Number(best.viewCount),
    submissionId: best.submissionId,
  };
}

// ──────────────────────────────────────────────
// Per-platform page aggregator
// ──────────────────────────────────────────────

export interface CreatorPlatformStats {
  slug: PlatformSlug;
  connectionCount: number;
  followerCount: number;
  windowViews: number;
  windowEngagement: number;
  topPost: { title: string; views: number; submissionId: string } | null;
  followerDelta: number | null;
  viewsDelta: number | null;
  engagementDelta: number | null;
  // detailed lists
  connections: Array<{
    id: string;
    label: string;
    followerCount: number | null;
    lastSyncedAt: Date | null;
    accountRefreshStatus: string;
    lastRefreshErrorMessage: string | null;
    countLabel: "followers" | "subscribers";
  }>;
}

export async function getCreatorPlatformStats(
  supabaseUserId: string,
  slug: PlatformSlug,
  range: Range,
): Promise<CreatorPlatformStats | null> {
  const scope = await getProfileScope(supabaseUserId);
  if (!scope) return null;
  return getCreatorPlatformStatsForScope(scope, slug, range);
}

export async function getCreatorPlatformStatsForScope(
  scope: CreatorStatsScope,
  slug: PlatformSlug,
  range: Range,
): Promise<CreatorPlatformStats> {
  const connIds = await getConnectionIds(scope.creatorProfileId);
  const subsByPlatform = await getSubmissionIdsByPlatform(scope.userId, range);
  const subIds = subsByPlatform[slug];
  const ids = connIds[slug];

  const [agg, prev, connections] = await Promise.all([
    buildPlatformAggregate(slug, ids, subIds, range),
    (async () => {
      const prevCap = withinPrevRange(range);
      if (!prevCap) return { views: 0, engagement: 0 };
      const prevRange: Range = { ...range, start: prevCap.gte!, end: prevCap.lte! };
      return sumWindowViewsAndEngagement(subIds, prevRange);
    })(),
    listConnections(scope.creatorProfileId, slug, ids),
  ]);

  return {
    slug,
    connectionCount: agg.connectionCount,
    followerCount: agg.followerCount,
    windowViews: agg.windowViews,
    windowEngagement: agg.windowEngagement,
    topPost: agg.topPost,
    followerDelta: null,
    viewsDelta: pctDelta(agg.windowViews, prev.views),
    engagementDelta: pctDelta(agg.windowEngagement, prev.engagement),
    connections,
  };
}

async function listConnections(
  creatorProfileId: string,
  slug: PlatformSlug,
  ids: string[],
): Promise<CreatorPlatformStats["connections"]> {
  if (ids.length === 0) return [];
  const accounts = await getSocialAccountSummariesForProfile(creatorProfileId);
  const rowById = new Map(accounts[slug].map((account) => [account.id, account]));
  const rows = ids.map((id) => rowById.get(id)).filter((account): account is SocialAccountSummary => Boolean(account));
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    followerCount: r.audienceCount,
    lastSyncedAt: r.lastSuccessfulRefreshAt,
    accountRefreshStatus: r.accountRefreshStatus,
    lastRefreshErrorMessage: r.lastRefreshErrorMessage,
    countLabel: r.countLabel,
  }));
}

// ──────────────────────────────────────────────
// Per-connection page
// ──────────────────────────────────────────────

export interface CreatorConnectionStats {
  slug: PlatformSlug;
  connectionId: string;
  label: string;
  handle: string | null;
  followerCount: number | null;
  isVerified: boolean;
  tokenExpiresAt: Date | null;
  lastSyncedAt: Date | null;
  windowViews: number;
  windowEngagement: number;
  topPost: { title: string; views: number; submissionId: string } | null;
}

export async function getCreatorConnectionStats(
  supabaseUserId: string,
  slug: PlatformSlug,
  connectionId: string,
  range: Range,
): Promise<CreatorConnectionStats | null> {
  const scope = await getProfileScope(supabaseUserId);
  if (!scope) return null;
  return getCreatorConnectionStatsForScope(scope, slug, connectionId, range);
}

export async function getCreatorConnectionStatsForScope(
  scope: CreatorStatsScope,
  slug: PlatformSlug,
  connectionId: string,
  range: Range,
): Promise<CreatorConnectionStats | null> {
  const meta = await resolveConnectionMeta(slug, connectionId, scope.creatorProfileId);
  if (!meta) return null;

  // Strict scoping by authorHandle (configured per-connection).
  // YT lacks a creator-side "handle" field, so we fall back to channelName.
  const subIds = await findCreatorSubmissionsByHandle(scope.userId, slug, meta.matchHandle);

  const [agg, top] = await Promise.all([
    sumWindowViewsAndEngagement(subIds, range),
    findTopPost(subIds, range),
  ]);

  return {
    slug,
    connectionId,
    label: meta.label,
    handle: meta.handle,
    followerCount: meta.followerCount,
    isVerified: meta.isVerified,
    tokenExpiresAt: meta.tokenExpiresAt,
    lastSyncedAt: meta.lastSyncedAt,
    windowViews: agg.views,
    windowEngagement: agg.engagement,
    topPost: top,
  };
}

interface ConnectionMeta {
  label: string;
  handle: string | null;
  matchHandle: string;
  followerCount: number | null;
  isVerified: boolean;
  tokenExpiresAt: Date | null;
  lastSyncedAt: Date | null;
}

async function resolveConnectionMeta(
  slug: PlatformSlug,
  connectionId: string,
  creatorProfileId: string,
): Promise<ConnectionMeta | null> {
  if (slug === "ig") {
    const c = await getSocialAccountSummary(creatorProfileId, slug, connectionId);
    if (!c) return null;
    return {
      label: c.label,
      handle: c.handle,
      matchHandle: c.matchHandle,
      followerCount: c.audienceCount,
      isVerified: c.isVerified,
      tokenExpiresAt: c.tokenExpiresAt,
      lastSyncedAt: c.lastSuccessfulRefreshAt,
    };
  }
  if (slug === "tt") {
    const c = await getSocialAccountSummary(creatorProfileId, slug, connectionId);
    if (!c) return null;
    return {
      label: c.label,
      handle: c.handle,
      matchHandle: c.matchHandle,
      followerCount: c.audienceCount,
      isVerified: c.isVerified,
      tokenExpiresAt: c.tokenExpiresAt,
      lastSyncedAt: c.lastSuccessfulRefreshAt,
    };
  }
  if (slug === "yt") {
    const c = await getSocialAccountSummary(creatorProfileId, slug, connectionId);
    if (!c) return null;
    return {
      label: c.label,
      handle: c.handle,
      matchHandle: c.matchHandle,
      followerCount: c.audienceCount,
      isVerified: c.isVerified,
      tokenExpiresAt: c.tokenExpiresAt,
      lastSyncedAt: c.lastSuccessfulRefreshAt,
    };
  }
  const c = await getSocialAccountSummary(creatorProfileId, slug, connectionId);
  if (!c) return null;
  return {
    label: c.label,
    handle: c.handle,
    matchHandle: c.matchHandle,
    followerCount: c.audienceCount,
    isVerified: c.isVerified,
    tokenExpiresAt: c.tokenExpiresAt,
    lastSyncedAt: c.lastSuccessfulRefreshAt,
  };
}

export async function findCreatorSubmissionsByHandle(
  userId: string,
  slug: PlatformSlug,
  matchHandle: string,
): Promise<string[]> {
  // Match by authorHandle exactly. Falls back to platform-only filter if
  // authorHandle is null on a row (older submissions).
  const subs = await prisma.campaignSubmission.findMany({
    where: {
      creatorId: userId,
      OR: [
        { authorHandle: matchHandle },
        { authorHandle: `@${matchHandle}` },
      ],
    },
    select: {
      id: true,
      metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { source: true } },
      sourcePlatform: true,
    },
  });
  const out: string[] = [];
  for (const s of subs) {
    const fromSnapshot = s.metricSnapshots[0]?.source;
    let inferred: PlatformSlug | null = fromSnapshot ? metricSourceToSlug(fromSnapshot) : null;
    if (!inferred && s.sourcePlatform) {
      if (s.sourcePlatform === "INSTAGRAM") inferred = "ig";
      else if (s.sourcePlatform === "TIKTOK") inferred = "tt";
      else if (s.sourcePlatform === "FACEBOOK") inferred = "fb";
    }
    if (inferred === slug) out.push(s.id);
  }
  return out;
}

// ──────────────────────────────────────────────
// Demographics for creator (used in Audience tab)
// ──────────────────────────────────────────────

export async function getCreatorDemographics(
  supabaseUserId: string,
  slug: PlatformSlug | null,
  kind?: "FOLLOWER" | "ENGAGED",
  connectionId?: string,
) {
  const scope = await getProfileScope(supabaseUserId);
  if (!scope) return null;
  return getCreatorDemographicsForScope(scope, slug, kind, connectionId);
}

export async function getCreatorDemographicsForScope(
  scope: CreatorStatsScope,
  slug: PlatformSlug | null,
  kind?: "FOLLOWER" | "ENGAGED",
  connectionId?: string,
) {
  const connIds = await getConnectionIds(scope.creatorProfileId);

  let filterIds: string[];
  if (connectionId) {
    if (!slug) return null;
    if (!connIds[slug].includes(connectionId)) return null;
    filterIds = [connectionId];
  } else {
    filterIds = slug ? connIds[slug] : [...connIds.ig, ...connIds.tt, ...connIds.yt, ...connIds.fb];
  }

  if (filterIds.length === 0) {
    return aggregateAudience([]);
  }

  const filterTypes = slug
    ? [slugToConnectionType(slug)]
    : ["IG", "TT", "YT", "FB"] as ConnectionType[];

  const snaps = await prisma.audienceSnapshot.findMany({
    where: {
      connectionType: { in: filterTypes },
      connectionId: { in: filterIds },
    },
    orderBy: { capturedAt: "desc" },
  });
  const latest = latestPerConnection(snaps);
  return aggregateAudience(latest, kind);
}

/**
 * Convenience: resolve a connection's match-handle and return its submission ids.
 * Used by the Accounts Workspace's account-scoped sub-tab loaders.
 */
export async function getConnectionSubmissionIds(
  supabaseUserId: string,
  slug: PlatformSlug,
  connectionId: string,
): Promise<string[]> {
  const scope = await getProfileScope(supabaseUserId);
  if (!scope) return [];
  return getConnectionSubmissionIdsForScope(scope, slug, connectionId);
}

export async function getConnectionSubmissionIdsForScope(
  scope: CreatorStatsScope,
  slug: PlatformSlug,
  connectionId: string,
): Promise<string[]> {
  const meta = await resolveConnectionMeta(slug, connectionId, scope.creatorProfileId);
  if (!meta) return [];
  return findCreatorSubmissionsByHandle(scope.userId, slug, meta.matchHandle);
}

// ──────────────────────────────────────────────
// Account-growth time series
// ──────────────────────────────────────────────

export interface AccountGrowthPoint {
  date: string;
  followers: number | null;
  following: number | null;
  videoCount: number | null;
  totalLikes: number | null;
}

export async function getAccountGrowth(
  supabaseUserId: string,
  slug: PlatformSlug,
  range: Range,
  connectionId?: string,
): Promise<AccountGrowthPoint[]> {
  const scope = await getProfileScope(supabaseUserId);
  if (!scope) return [];
  return getAccountGrowthForScope(scope, slug, range, connectionId);
}

export async function getAccountGrowthForScope(
  scope: CreatorStatsScope,
  slug: PlatformSlug,
  range: Range,
  connectionId?: string,
): Promise<AccountGrowthPoint[]> {
  const connIds = await getConnectionIds(scope.creatorProfileId);
  const ids = connectionId ? [connectionId] : connIds[slug];
  if (ids.length === 0) return [];

  // Verify ownership if a single connectionId was passed
  if (connectionId) {
    if (!connIds[slug].includes(connectionId)) return [];
  }

  const cap = withinRange(range);
  const snaps = await prisma.platformAccountSnapshot.findMany({
    where: {
      connectionType: slugToConnectionType(slug),
      connectionId: { in: ids },
      ...(cap.gte ? { capturedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { capturedAt: "asc" },
  });

  // Group by date string, sum across connections per day
  const byDate = new Map<string, AccountGrowthPoint>();
  for (const s of snaps) {
    const key = s.capturedAt.toISOString().slice(0, 10);
    const existing = byDate.get(key) ?? {
      date: key,
      followers: 0,
      following: 0,
      videoCount: 0,
      totalLikes: 0,
    };
    existing.followers = (existing.followers ?? 0) + (s.audienceCount ?? 0);
    existing.following = (existing.following ?? 0) + (s.followingCount ?? 0);
    existing.videoCount = (existing.videoCount ?? 0) + (s.videoCount ?? 0);
    existing.totalLikes = (existing.totalLikes ?? 0) + Number(s.totalLikes ?? 0);
    byDate.set(key, existing);
  }
  return Array.from(byDate.values());
}
