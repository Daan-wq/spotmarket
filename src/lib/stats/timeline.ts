import { prisma } from "@/lib/prisma";
import {
  type PlatformSlug,
  PLATFORM_ALL,
  metricSourceToSlug,
  slugToConnectionType,
} from "./types";
import { type Range, withinRange } from "./range";
import { computeDayDeltas } from "./trends";
import { findCreatorSubmissionsByHandle } from "./creator";

export type TimelineEventKind = "submission" | "story";

/**
 * Visual marker shape categorisation. Driven from the platform + media metadata
 * so the chart can pick a distinct shape per content type.
 */
export type TimelineContentType = "reel" | "post" | "story" | "video" | "short";

export interface TimelineEvent {
  /** Stable id: "sub:<id>" for submissions, "story:<id>" for stories. */
  id: string;
  kind: TimelineEventKind;
  platform: PlatformSlug;
  contentType: TimelineContentType;
  /** Canonical post timestamp (story.postedAt or earliest MetricSnapshot.capturedAt). */
  postedAt: Date;
  title: string;
  permalink: string | null;
  thumbnailUrl: string | null;
  views: number | null;
  engagement: number | null;
  /** Views delta on `postedAt`'s date — Y coord for the marker on the daily-views chart. */
  dayDelta: number;
  /** Present iff kind === "submission"; key into getPostLifts7d output. */
  submissionId?: string;
}

export type TimelineScope =
  | { kind: "all"; supabaseUserId: string }
  | { kind: "platform"; supabaseUserId: string; platform: PlatformSlug }
  | { kind: "account"; supabaseUserId: string; platform: PlatformSlug; connectionId: string };

interface ProfileScope {
  userId: string;
  creatorProfileId: string;
}

async function loadProfile(supabaseUserId: string): Promise<ProfileScope | null> {
  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUserId },
    select: { id: true, creatorProfile: { select: { id: true } } },
  });
  if (!user || !user.creatorProfile) return null;
  return { userId: user.id, creatorProfileId: user.creatorProfile.id };
}

async function getIgConnectionIds(creatorProfileId: string, scope: TimelineScope): Promise<string[]> {
  if (scope.kind === "account") {
    return scope.platform === "ig" ? [scope.connectionId] : [];
  }
  if (scope.kind === "platform" && scope.platform !== "ig") return [];
  const rows = await prisma.creatorIgConnection.findMany({
    where: { creatorProfileId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Resolve the list of submission ids in the given scope.
 *
 * - all: every submission for the creator (mirrors getCreatorTopStats logic).
 * - platform: submissions whose latest MetricSnapshot.source maps to that slug, falling back to
 *   sourcePlatform for legacy rows.
 * - account: submissions matched by the connection's authorHandle.
 */
async function getSubmissionIds(profile: ProfileScope, scope: TimelineScope): Promise<string[]> {
  if (scope.kind === "account") {
    return getAccountSubmissionIds(profile, scope.platform, scope.connectionId);
  }
  const subs = await prisma.campaignSubmission.findMany({
    where: { creatorId: profile.userId },
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
  const out: string[] = [];
  for (const s of subs) {
    const fromSnapshot = s.metricSnapshots[0]?.source;
    let slug: PlatformSlug | null = fromSnapshot ? metricSourceToSlug(fromSnapshot) : null;
    if (!slug && s.sourcePlatform) {
      if (s.sourcePlatform === "INSTAGRAM") slug = "ig";
      else if (s.sourcePlatform === "TIKTOK") slug = "tt";
      else if (s.sourcePlatform === "FACEBOOK") slug = "fb";
    }
    if (!slug) continue;
    if (scope.kind === "all" || slug === scope.platform) out.push(s.id);
  }
  return out;
}

async function getAccountSubmissionIds(
  profile: ProfileScope,
  slug: PlatformSlug,
  connectionId: string,
): Promise<string[]> {
  const matchHandle = await resolveMatchHandle(slug, connectionId);
  if (!matchHandle) return [];
  return findCreatorSubmissionsByHandle(profile.userId, slug, matchHandle);
}

async function resolveMatchHandle(slug: PlatformSlug, connectionId: string): Promise<string | null> {
  if (slug === "ig") {
    const c = await prisma.creatorIgConnection.findUnique({
      where: { id: connectionId },
      select: { igUsername: true },
    });
    return c?.igUsername ?? null;
  }
  if (slug === "tt") {
    const c = await prisma.creatorTikTokConnection.findUnique({
      where: { id: connectionId },
      select: { username: true },
    });
    return c?.username ?? null;
  }
  if (slug === "yt") {
    const c = await prisma.creatorYtConnection.findUnique({
      where: { id: connectionId },
      select: { channelName: true },
    });
    return c?.channelName ?? null;
  }
  const c = await prisma.creatorFbConnection.findUnique({
    where: { id: connectionId },
    select: { pageHandle: true, pageName: true },
  });
  return c?.pageHandle ?? c?.pageName ?? null;
}

/** Map a CampaignSubmission's mediaType + platform into a marker-shape bucket. */
function classifySubmission(platform: PlatformSlug, mediaType: string | null | undefined): TimelineContentType {
  const mt = (mediaType ?? "").toLowerCase();
  if (platform === "yt") return mt.includes("short") ? "short" : "video";
  if (platform === "tt") return "video";
  if (mt.includes("reel")) return "reel";
  if (mt.includes("video")) return "video";
  return "post";
}

/**
 * Build a unified, chronological list of post events for the scope. Submissions become one event
 * each (kind="submission"); IG stories become one event each (kind="story"). Sorted desc by postedAt.
 */
export async function getTimelineEvents(scope: TimelineScope, range: Range): Promise<TimelineEvent[]> {
  const profile = await loadProfile(scope.supabaseUserId);
  if (!profile) return [];

  const cap = withinRange(range);

  const [submissionIds, igConnectionIds] = await Promise.all([
    getSubmissionIds(profile, scope),
    getIgConnectionIds(profile.creatorProfileId, scope),
  ]);

  const [submissionEvents, storyEvents] = await Promise.all([
    buildSubmissionEvents(submissionIds, scope, range),
    igConnectionIds.length > 0 ? buildStoryEvents(igConnectionIds, cap) : Promise.resolve([] as TimelineEvent[]),
  ]);

  const merged = [...submissionEvents, ...storyEvents];
  merged.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  return merged;
}

async function buildSubmissionEvents(
  submissionIds: string[],
  scope: TimelineScope,
  range: Range,
): Promise<TimelineEvent[]> {
  if (submissionIds.length === 0) return [];
  const cap = withinRange(range);

  // Earliest snapshot per submission = postedAt proxy.
  const earliest = await prisma.metricSnapshot.findMany({
    where: { submissionId: { in: submissionIds } },
    orderBy: { capturedAt: "asc" },
    distinct: ["submissionId"],
    select: { submissionId: true, capturedAt: true, source: true },
  });

  const earliestMap = new Map(earliest.map((s) => [s.submissionId, s]));

  // Latest snapshot per submission for views/engagement totals.
  const latest = await prisma.metricSnapshot.findMany({
    where: { submissionId: { in: submissionIds } },
    orderBy: { capturedAt: "desc" },
    distinct: ["submissionId"],
    select: {
      submissionId: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      source: true,
    },
  });
  const latestMap = new Map(latest.map((s) => [s.submissionId, s]));

  // For dayDelta on the postedAt date: use the day's view total from any snapshot on that day.
  // Cheaper approach: dayDelta = latest snapshot's viewCount on the postedAt date - 0
  // (i.e. that submission's day-1 views). Pull all snapshots in [postedAt..postedAt+1d] per sub.
  // Single query bounded by the existing range.
  const subsForDayDelta = await prisma.metricSnapshot.findMany({
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

  const dayDeltaBySub = new Map<string, Map<string, number>>();
  const groupedSnaps = new Map<string, typeof subsForDayDelta>();
  for (const s of subsForDayDelta) {
    const arr = groupedSnaps.get(s.submissionId) ?? [];
    arr.push(s);
    groupedSnaps.set(s.submissionId, arr);
  }
  for (const [subId, arr] of groupedSnaps) {
    const deltas = computeDayDeltas(arr);
    const dayMap = new Map<string, number>();
    for (const d of deltas) dayMap.set(d.date, d.views);
    dayDeltaBySub.set(subId, dayMap);
  }

  // Submission metadata
  const subs = await prisma.campaignSubmission.findMany({
    where: { id: { in: submissionIds } },
    select: {
      id: true,
      postUrl: true,
      thumbnailUrl: true,
      mediaType: true,
      sourcePlatform: true,
      campaign: { select: { name: true } },
    },
  });
  const subMap = new Map(subs.map((s) => [s.id, s]));

  const events: TimelineEvent[] = [];
  for (const id of submissionIds) {
    const earliestSnap = earliestMap.get(id);
    const latestSnap = latestMap.get(id);
    const meta = subMap.get(id);
    if (!earliestSnap || !meta) continue;

    const postedAt = earliestSnap.capturedAt;
    if (cap.gte && (postedAt < cap.gte || postedAt > (cap.lte ?? new Date()))) continue;

    const platform = inferPlatform(latestSnap?.source ?? earliestSnap.source, meta.sourcePlatform);
    if (!platform) continue;

    // Apply scope filter (in case getSubmissionIds was wider than scope)
    if (scope.kind === "platform" && platform !== scope.platform) continue;
    if (scope.kind === "account" && platform !== scope.platform) continue;

    const dateKey = postedAt.toISOString().slice(0, 10);
    const dayDelta = dayDeltaBySub.get(id)?.get(dateKey) ?? 0;

    const views = latestSnap ? Number(latestSnap.viewCount) : null;
    const engagement = latestSnap
      ? (latestSnap.likeCount ?? 0) + (latestSnap.commentCount ?? 0) + (latestSnap.shareCount ?? 0)
      : null;

    events.push({
      id: `sub:${id}`,
      kind: "submission",
      platform,
      contentType: classifySubmission(platform, meta.mediaType),
      postedAt,
      title: meta.campaign?.name ?? meta.postUrl ?? "Untitled",
      permalink: meta.postUrl || null,
      thumbnailUrl: meta.thumbnailUrl ?? null,
      views,
      engagement,
      dayDelta,
      submissionId: id,
    });
  }
  return events;
}

function inferPlatform(
  source: string | null | undefined,
  sourcePlatform: string | null | undefined,
): PlatformSlug | null {
  if (source) {
    const slug = metricSourceToSlug(source);
    if (slug) return slug;
  }
  if (sourcePlatform === "INSTAGRAM") return "ig";
  if (sourcePlatform === "TIKTOK") return "tt";
  if (sourcePlatform === "FACEBOOK") return "fb";
  return null;
}

async function buildStoryEvents(
  igConnectionIds: string[],
  cap: { gte?: Date; lte?: Date },
): Promise<TimelineEvent[]> {
  const stories = await prisma.storyPost.findMany({
    where: {
      connectionId: { in: igConnectionIds },
      ...(cap.gte ? { postedAt: { gte: cap.gte, lte: cap.lte } } : {}),
    },
    orderBy: { postedAt: "desc" },
    select: {
      id: true,
      mediaId: true,
      postedAt: true,
      permalink: true,
      views: true,
      reach: true,
      replies: true,
      totalInteractions: true,
    },
  });
  return stories.map((s) => ({
    id: `story:${s.id}`,
    kind: "story" as const,
    platform: "ig" as const,
    contentType: "story" as const,
    postedAt: s.postedAt,
    title: `Story · ${s.mediaId.slice(0, 12)}…`,
    permalink: s.permalink,
    thumbnailUrl: null,
    views: s.views,
    engagement: s.totalInteractions ?? (s.replies ?? 0),
    dayDelta: s.views ?? 0,
  }));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * For every submission-kind event in the given list, compute the 7-day-after view-lift sparkline
 * data. One batched MetricSnapshot query covers all events; results are grouped in memory.
 *
 * Returns Map<submissionId, Array<{date, views}>>. Stories are skipped (they have no MetricSnapshot
 * entry; their lift is surfaced via correlated reels / the correlation callout banner).
 */
export async function getPostLifts7d(
  events: TimelineEvent[],
): Promise<Map<string, Array<{ date: string; views: number }>>> {
  const submissions = events
    .filter((e): e is TimelineEvent & { submissionId: string } => e.kind === "submission" && !!e.submissionId)
    .map((e) => ({ id: e.submissionId, postedAt: e.postedAt }));
  if (submissions.length === 0) return new Map();

  const minStart = new Date(Math.min(...submissions.map((s) => s.postedAt.getTime())));
  const maxEnd = new Date(Math.max(...submissions.map((s) => s.postedAt.getTime() + 7 * DAY_MS)));

  const snaps = await prisma.metricSnapshot.findMany({
    where: {
      submissionId: { in: submissions.map((s) => s.id) },
      capturedAt: { gte: minStart, lte: maxEnd },
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

  const bySub = new Map<string, typeof snaps>();
  for (const s of snaps) {
    const arr = bySub.get(s.submissionId) ?? [];
    arr.push(s);
    bySub.set(s.submissionId, arr);
  }

  const out = new Map<string, Array<{ date: string; views: number }>>();
  for (const sub of submissions) {
    const subWindowEnd = new Date(sub.postedAt.getTime() + 7 * DAY_MS);
    const subSnaps = (bySub.get(sub.id) ?? []).filter(
      (s) => s.capturedAt >= sub.postedAt && s.capturedAt <= subWindowEnd,
    );
    const deltas = computeDayDeltas(subSnaps);
    out.set(sub.id, deltas.map((d) => ({ date: d.date, views: d.views })));
  }
  return out;
}

/**
 * Re-export for any UI helpers that need to colour markers by platform without re-importing types.
 */
export { PLATFORM_ALL, slugToConnectionType };
