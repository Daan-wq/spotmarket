import { prisma } from "@/lib/prisma";
import { resolveThumbnail } from "@/lib/clip-thumbnail";
import { parseClipUrl, type ClipPlatform } from "@/lib/parse-clip-url";
import {
  type ClipMediaType,
} from "@/lib/instagram-media-type";
import { decrypt } from "@/lib/crypto";
import { fetchRecentMedia } from "@/lib/instagram";
import { fetchTikTokVideos } from "@/lib/tiktok";
import { fetchFacebookPagePostsPaginated } from "@/lib/facebook";
import { withFreshTikTokAccessToken } from "@/lib/token-refresh";
import {
  cacheCreatorMediaThumbnail,
  cacheInstagramMedia,
} from "@/lib/creator-media-cache";
import { type Range, withinRange } from "./range";
import type { PlatformSlug } from "./types";

const CLIP_TO_PLATFORM_ICON: Record<ClipPlatform, string | null> = {
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  FACEBOOK: "FACEBOOK",
  YOUTUBE: "YOUTUBE_SHORTS",
  UNKNOWN: null,
};

export interface ContentRowBase {
  /** Unique row id. For submission rows this is the submissionId; for OAuth-only rows it is `${platform}:${postId}`. */
  rowId: string;
  /** Present only when this row is backed by a CampaignSubmission. */
  submissionId: string | null;
  platform: PlatformSlug;
  title: string;
  /** Null when the post has not been submitted to any campaign yet. */
  campaignId: string | null;
  campaignName: string | null;
  postUrl: string;
  thumbnailUrl: string | null;
  mediaType: ClipMediaType;
  platformIcon: string | null;
  postedAt: Date | null;
  capturedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  /** "submission" rows have a campaign + MetricSnapshot data. "oauth" rows are unsubmitted posts pulled live. */
  source: "submission" | "oauth";
  // Optional / platform-specific
  saves?: number | null;
  reach?: number | null;
  totalInteractions?: number | null;
  follows?: number | null;
  profileVisits?: number | null;
  watchTimeSec?: number | null;
  // Per-platform extras attached as raw JSON (UI inspects)
  extras?: Record<string, unknown> | null;
}

export interface ContentRow extends ContentRowBase {
  creatorDisplayName?: string;
}

interface ContentQueryArgs {
  submissionIds: string[];
  range: Range;
  includeCreator?: boolean;
  platform: PlatformSlug;
}

/** Per-connection input for the OAuth merge branch. */
export interface OauthConnectionInput {
  platform: "ig" | "tt" | "fb";
  connectionId: string;
}

interface MergedContentArgs {
  submissionIds: string[];
  range: Range;
  platform: PlatformSlug;
  /** Connections to fetch live OAuth posts from. Empty = skip the OAuth branch. */
  connections: OauthConnectionInput[];
  /** Bound on per-connection OAuth fetch size. */
  oauthLimitPerConnection?: number;
}

/**
 * For each submission, fetch the latest MetricSnapshot in the window and project
 * platform-specific fields. Creator name attached optionally for admin views.
 */
export async function getContentRows({
  submissionIds,
  range,
  includeCreator,
  platform,
}: ContentQueryArgs): Promise<ContentRow[]> {
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
      submissionId: true,
      capturedAt: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      saveCount: true,
      reachCount: true,
      watchTimeSec: true,
      totalInteractions: true,
      followsFromMedia: true,
      profileVisits: true,
      profileActivity: true,
      reactionsByType: true,
      submission: {
        select: {
          postUrl: true,
          thumbnailUrl: true,
          mediaType: true,
          createdAt: true,
          creatorId: true,
          campaignId: true,
          campaign: { select: { name: true } },
          ...(includeCreator
            ? { creator: { select: { creatorProfile: { select: { displayName: true } } } } }
            : {}),
        },
      },
    },
  });

  const asClipMediaType = (v: string | null | undefined): ClipMediaType | null =>
    v === "video" || v === "image" || v === "carousel" ? v : null;

  const rows = await Promise.all(
    latest.map(async (m) => {
      const extras: Record<string, unknown> = {};
      if (platform === "ig") {
        extras.profileActivity = m.profileActivity;
      }
      if (platform === "fb") {
        extras.reactionsByType = m.reactionsByType;
      }
      const sub = m.submission;
      type CreatorEmbed = { creator?: { creatorProfile?: { displayName?: string | null } | null } | null };
      const creatorEmbed = sub as (typeof sub & CreatorEmbed) | null;

      const postUrl = sub?.postUrl ?? "";
      const parsed = postUrl ? parseClipUrl(postUrl) : null;
      const platformIcon = parsed ? CLIP_TO_PLATFORM_ICON[parsed.platform] : null;

      const { thumbnailUrl, mediaType } = await resolveThumbnail(
        sub?.postUrl ?? null,
        sub?.thumbnailUrl ?? null,
        {
          creatorId: sub?.creatorId ?? null,
          submissionId: m.submissionId,
          storedMediaType: asClipMediaType(sub?.mediaType ?? null),
        },
      );

      const campaignName = sub?.campaign?.name ?? "Untitled";

      return {
        rowId: m.submissionId,
        submissionId: m.submissionId,
        platform,
        title: campaignName,
        campaignId: sub?.campaignId ?? null,
        campaignName,
        postUrl,
        thumbnailUrl,
        mediaType,
        platformIcon,
        postedAt: sub?.createdAt ?? null,
        capturedAt: m.capturedAt,
        views: Number(m.viewCount),
        likes: m.likeCount ?? 0,
        comments: m.commentCount ?? 0,
        shares: m.shareCount ?? 0,
        source: "submission" as const,
        saves: m.saveCount,
        reach: m.reachCount,
        totalInteractions: m.totalInteractions,
        follows: m.followsFromMedia,
        profileVisits: m.profileVisits,
        watchTimeSec: m.watchTimeSec,
        extras,
        ...(includeCreator
          ? { creatorDisplayName: creatorEmbed?.creator?.creatorProfile?.displayName ?? "Unknown" }
          : {}),
      } satisfies ContentRow;
    }),
  );

  return rows;
}

// ────────────────────────────────────────────────────────────────────────────
// Merged view: submission rows + live OAuth posts (for the Accounts → Content tab)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns submission rows (rich metrics, has campaign) merged with live OAuth posts
 * (basic metrics, no campaign — emit a `null` campaignId so the UI can render a
 * "Submit for Campaign" button). OAuth posts whose URL already matches a submission
 * are dropped to avoid duplicates.
 *
 * Per-connection OAuth fetches run in parallel and tolerate individual failures
 * (a broken IG token won't take the whole tab down).
 */
export async function getMergedContentRows({
  submissionIds,
  range,
  platform,
  connections,
  oauthLimitPerConnection = 50,
}: MergedContentArgs): Promise<ContentRow[]> {
  const submissionRows = await getContentRows({ submissionIds, range, platform });

  if (connections.length === 0) return submissionRows;

  const submittedUrls = new Set(
    submissionRows.map((r) => r.postUrl).filter((u): u is string => !!u),
  );

  const fetched = await Promise.all(
    connections.map((c) =>
      fetchOauthRowsForConnection(c, oauthLimitPerConnection).catch((err) => {
        console.warn(`[content/oauth] ${c.platform}:${c.connectionId} fetch failed`, err);
        return [] as ContentRow[];
      }),
    ),
  );

  const oauthRows: ContentRow[] = [];
  const seenOauthUrls = new Set<string>();
  for (const row of fetched.flat()) {
    if (!row.postUrl) continue;
    if (submittedUrls.has(row.postUrl)) continue;
    if (seenOauthUrls.has(row.postUrl)) continue;
    seenOauthUrls.add(row.postUrl);
    oauthRows.push(row);
  }

  const merged = [...submissionRows, ...oauthRows];
  merged.sort((a, b) => {
    const at = (a.postedAt ?? a.capturedAt).getTime();
    const bt = (b.postedAt ?? b.capturedAt).getTime();
    return bt - at;
  });
  return merged;
}

async function fetchOauthRowsForConnection(
  conn: OauthConnectionInput,
  limit: number,
): Promise<ContentRow[]> {
  if (conn.platform === "ig") return fetchIgOauthRows(conn.connectionId, limit);
  if (conn.platform === "tt") return fetchTtOauthRows(conn.connectionId, limit);
  return fetchFbOauthRows(conn.connectionId, limit);
}

async function fetchIgOauthRows(connectionId: string, limit: number): Promise<ContentRow[]> {
  const conn = await prisma.creatorIgConnection.findFirst({
    where: { id: connectionId, isVerified: true },
    select: { igUserId: true, accessToken: true, accessTokenIv: true },
  });
  if (!conn?.accessToken || !conn.accessTokenIv || !conn.igUserId) return [];
  const token = decrypt(conn.accessToken, conn.accessTokenIv);
  const { media } = await fetchRecentMedia(token, conn.igUserId, limit);
  const posts = await cacheInstagramMedia({
    connectionId,
    media,
    updateState: false,
  });
  const now = new Date();
  return posts.map((post) => {
    const postUrl = post.url ?? "";
    const parsed = postUrl ? parseClipUrl(postUrl) : null;
    const platformIcon = parsed ? CLIP_TO_PLATFORM_ICON[parsed.platform] : null;
    return {
      rowId: `ig:${post.id}`,
      submissionId: null,
      platform: "ig" as const,
      title: post.caption ?? "",
      campaignId: null,
      campaignName: null,
      postUrl,
      thumbnailUrl: post.thumbnail,
      mediaType: post.mediaType,
      platformIcon,
      postedAt: post.publishedAt ? new Date(post.publishedAt) : null,
      capturedAt: now,
      views: 0,
      likes: post.likeCount ?? 0,
      comments: post.commentCount ?? 0,
      shares: 0,
      source: "oauth" as const,
      saves: null,
      reach: null,
      totalInteractions: null,
      follows: null,
      profileVisits: null,
      watchTimeSec: null,
      extras: null,
    } satisfies ContentRow;
  });
}

async function fetchTtOauthRows(connectionId: string, limit: number): Promise<ContentRow[]> {
  const conn = await prisma.creatorTikTokConnection.findFirst({
    where: { id: connectionId, isVerified: true },
    select: {
      id: true,
      accessToken: true,
      accessTokenIv: true,
      refreshToken: true,
      refreshTokenIv: true,
      tokenExpiresAt: true,
    },
  });
  if (!conn) return [];
  const result = await withFreshTikTokAccessToken(conn, (token) =>
    fetchTikTokVideos(token, limit),
  );
  if (!result) return [];
  const { videos } = result;
  const now = new Date();
  return Promise.all(videos.map(async (v) => {
    const postUrl = v.shareUrl ?? "";
    return {
      rowId: `tt:${v.id}`,
      submissionId: null,
      platform: "tt" as const,
      title: v.title ?? "",
      campaignId: null,
      campaignName: null,
      postUrl,
      thumbnailUrl: await cacheCreatorMediaThumbnail({
        platform: "tt",
        connectionId,
        mediaId: v.id,
        sourceUrl: v.coverImageUrl,
      }),
      mediaType: "video" as const,
      platformIcon: "TIKTOK",
      postedAt: new Date(v.createTime * 1000),
      capturedAt: now,
      views: v.viewCount ?? 0,
      likes: v.likeCount ?? 0,
      comments: v.commentCount ?? 0,
      shares: v.shareCount ?? 0,
      source: "oauth" as const,
      saves: null,
      reach: null,
      totalInteractions: null,
      follows: null,
      profileVisits: null,
      watchTimeSec: v.duration ?? null,
      extras: null,
    } satisfies ContentRow;
  }));
}

async function fetchFbOauthRows(connectionId: string, limit: number): Promise<ContentRow[]> {
  const conn = await prisma.creatorFbConnection.findFirst({
    where: { id: connectionId, isVerified: true },
    select: { fbPageId: true, accessToken: true, accessTokenIv: true },
  });
  if (!conn?.accessToken || !conn.accessTokenIv || !conn.fbPageId) return [];
  const token = decrypt(conn.accessToken, conn.accessTokenIv);
  const { posts } = await fetchFacebookPagePostsPaginated(conn.fbPageId, token, limit);
  const now = new Date();
  return Promise.all(posts.map(async (p) => {
    const postUrl = p.permalink ?? "";
    return {
      rowId: `fb:${p.id}`,
      submissionId: null,
      platform: "fb" as const,
      title: p.message ?? "",
      campaignId: null,
      campaignName: null,
      postUrl,
      thumbnailUrl: await cacheCreatorMediaThumbnail({
        platform: "fb",
        connectionId,
        mediaId: p.id,
        sourceUrl: p.thumbnailUrl,
      }),
      mediaType: p.type === "video" || p.type === "reel" ? ("video" as const) : ("image" as const),
      platformIcon: "FACEBOOK",
      postedAt: p.createdTime ? new Date(p.createdTime) : null,
      capturedAt: now,
      views: 0,
      likes: p.reactions ?? 0,
      comments: p.comments ?? 0,
      shares: 0,
      source: "oauth" as const,
      saves: null,
      reach: null,
      totalInteractions: null,
      follows: null,
      profileVisits: null,
      watchTimeSec: null,
      extras: null,
    } satisfies ContentRow;
  }));
}
