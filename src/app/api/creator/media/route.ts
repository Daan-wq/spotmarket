import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  getFreshTikTokAccessToken,
  forceRefreshTikTokAccessToken,
  getFreshYoutubeAccessToken,
} from "@/lib/token-refresh";
import { fetchRecentMedia } from "@/lib/instagram";
import { fetchTikTokVideos } from "@/lib/tiktok";
import { fetchFacebookPagePostsPaginated } from "@/lib/facebook";
import { fetchRecentYoutubeVideos } from "@/lib/youtube";
import {
  cacheCreatorMediaThumbnail,
  cacheInstagramMedia,
  readCachedCreatorMedia,
} from "@/lib/creator-media-cache";
import type { NormalizedPost, MediaResponse } from "@/types/media";

const DEFAULT_LIMIT = 10;
const MEDIA_PLATFORMS = ["ig", "tt", "yt", "fb"] as const;

type MediaPlatform = (typeof MEDIA_PLATFORMS)[number];

const PLATFORM_LABELS: Record<MediaPlatform, string> = {
  ig: "Instagram",
  tt: "TikTok",
  yt: "YouTube",
  fb: "Facebook",
};

function isMediaPlatform(value: string | null): value is MediaPlatform {
  return MEDIA_PLATFORMS.some((platform) => platform === value);
}

function connectionRequiredResponse(platform: MediaPlatform, status = 400): NextResponse {
  return NextResponse.json(
    { error: `Connect your ${PLATFORM_LABELS[platform]} account to load posts.` },
    { status }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");
    const { searchParams } = req.nextUrl;
    const platform = searchParams.get("platform");
    const connectionId = searchParams.get("connectionId");
    const cursor = searchParams.get("cursor") ?? undefined;
    const refresh = searchParams.get("refresh") === "1" || searchParams.get("refresh") === "true";
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
      50
    );

    if (!isMediaPlatform(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }
    if (!connectionId) {
      return connectionRequiredResponse(platform);
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const creatorProfileId = user.creatorProfile.id;

    if (platform === "ig") {
      return await handleIg(creatorProfileId, connectionId, limit, cursor, refresh);
    }
    if (platform === "tt") {
      return await handleTt(creatorProfileId, connectionId, limit, cursor);
    }
    if (platform === "yt") {
      return await handleYt(creatorProfileId, connectionId, limit);
    }
    return await handleFb(creatorProfileId, connectionId, limit, cursor);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[creator/media]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleIg(
  creatorProfileId: string,
  connectionId: string,
  limit: number,
  cursor: string | undefined,
  refresh: boolean
): Promise<NextResponse> {
  const conn = await prisma.creatorIgConnection.findFirst({
    where: { id: connectionId, creatorProfileId, isVerified: true },
    select: { igUserId: true, accessToken: true, accessTokenIv: true },
  });
  if (!conn?.accessToken || !conn.accessTokenIv || !conn.igUserId) {
    return connectionRequiredResponse("ig", 404);
  }

  if (!refresh) {
    const cached = await readCachedCreatorMedia({
      platform: "ig",
      connectionId,
      limit,
      cursor,
    });
    if (cached) return NextResponse.json<MediaResponse>(cached);
  }

  const token = decrypt(conn.accessToken, conn.accessTokenIv);
  const liveCursor = cursor?.startsWith("cache:") ? undefined : cursor;
  const { media, nextCursor } = await fetchRecentMedia(token, conn.igUserId, limit, liveCursor);

  // Detect Meta rate-limit response (empty + returned with error in a prior logged warn)
  // The lib logs and returns [] on non-2xx; surface as rate_limited if we suspect throttle
  const posts = await cacheInstagramMedia({
    connectionId,
    media,
    nextCursor,
    hasMore: nextCursor !== null,
  });

  return NextResponse.json<MediaResponse>({
    posts: dedupePosts(posts),
    nextCursor,
    hasMore: nextCursor !== null,
  });
}

// TikTok rejects expired/revoked tokens with these error codes — treat both
// as a signal to force-refresh and retry once before giving up. The codes
// can appear in either the response body (`data.error.code`) or the raw
// text body of a non-2xx response, so we string-match on the thrown
// message from `fetchTikTokVideos`.
const TT_INVALID_TOKEN_PATTERN = /access_token_invalid|access_token_expired/i;

async function handleTt(
  creatorProfileId: string,
  connectionId: string,
  limit: number,
  cursor: string | undefined
): Promise<NextResponse> {
  const conn = await prisma.creatorTikTokConnection.findFirst({
    where: { id: connectionId, creatorProfileId, isVerified: true },
    select: {
      id: true,
      accessToken: true,
      accessTokenIv: true,
      refreshToken: true,
      refreshTokenIv: true,
      tokenExpiresAt: true,
    },
  });
  if (!conn) {
    return connectionRequiredResponse("tt", 404);
  }
  let token = await getFreshTikTokAccessToken(conn);
  if (!token) {
    return connectionRequiredResponse("tt", 404);
  }
  const cursorNum = cursor !== undefined ? parseInt(cursor, 10) : undefined;

  let result: Awaited<ReturnType<typeof fetchTikTokVideos>>;
  try {
    result = await fetchTikTokVideos(token, limit, cursorNum);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!TT_INVALID_TOKEN_PATTERN.test(message)) throw err;
    const refreshed = await forceRefreshTikTokAccessToken(conn).catch(() => null);
    if (!refreshed) {
      return NextResponse.json(
        { error: "TikTok session expired. Please reconnect your TikTok account in Connections." },
        { status: 401 }
      );
    }
    token = refreshed;
    try {
      result = await fetchTikTokVideos(token, limit, cursorNum);
    } catch (retryErr) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
      if (TT_INVALID_TOKEN_PATTERN.test(retryMessage)) {
        return NextResponse.json(
          { error: "TikTok session expired. Please reconnect your TikTok account in Connections." },
          { status: 401 }
        );
      }
      throw retryErr;
    }
  }

  const { videos, nextCursor, hasMore } = result;

  const posts: NormalizedPost[] = await Promise.all(
    videos.map(async (v) => ({
      id: v.id,
      platform: "tt" as const,
      url: v.shareUrl ?? "",
      thumbnail: await cacheCreatorMediaThumbnail({
        platform: "tt",
        connectionId,
        mediaId: v.id,
        sourceUrl: v.coverImageUrl,
      }),
      caption: v.title || null,
      publishedAt: new Date(v.createTime * 1000).toISOString(),
      likeCount: v.likeCount,
      commentCount: v.commentCount ?? null,
      mediaType: "video" as const,
    })),
  );

  return NextResponse.json<MediaResponse>({
    posts: dedupePosts(posts),
    nextCursor: nextCursor !== null ? String(nextCursor) : null,
    hasMore,
  });
}

async function handleYt(
  creatorProfileId: string,
  connectionId: string,
  limit: number
): Promise<NextResponse> {
  const conn = await prisma.creatorYtConnection.findFirst({
    where: { id: connectionId, creatorProfileId, isVerified: true },
    select: {
      id: true,
      channelId: true,
      accessToken: true,
      accessTokenIv: true,
      refreshToken: true,
      refreshTokenIv: true,
      tokenExpiresAt: true,
    },
  });
  if (!conn?.accessToken || !conn.accessTokenIv || !conn.channelId) {
    return connectionRequiredResponse("yt", 404);
  }

  const token = await getFreshYoutubeAccessToken(conn);
  if (!token) {
    return connectionRequiredResponse("yt", 404);
  }

  const videos = await fetchRecentYoutubeVideos(token, conn.channelId, limit);
  const posts: NormalizedPost[] = videos.map((v) => ({
    id: v.id,
    platform: "yt",
    url: youtubeVideoUrl(v.id, v.duration),
    thumbnail: v.thumbnailUrl,
    caption: v.title || v.description,
    publishedAt: v.publishedAt,
    likeCount: v.likeCount,
    commentCount: v.commentCount ?? null,
    mediaType: "video",
  }));

  return NextResponse.json<MediaResponse>({
    posts: dedupePosts(posts),
    nextCursor: null,
    hasMore: false,
  });
}

async function handleFb(
  creatorProfileId: string,
  connectionId: string,
  limit: number,
  cursor: string | undefined
): Promise<NextResponse> {
  const conn = await prisma.creatorFbConnection.findFirst({
    where: { id: connectionId, creatorProfileId, isVerified: true },
    select: { fbPageId: true, accessToken: true, accessTokenIv: true },
  });
  if (!conn?.accessToken || !conn.accessTokenIv || !conn.fbPageId) {
    return connectionRequiredResponse("fb", 404);
  }
  const token = decrypt(conn.accessToken, conn.accessTokenIv);
  const { posts: fbPosts, nextCursor } = await fetchFacebookPagePostsPaginated(
    conn.fbPageId,
    token,
    limit,
    cursor
  );

  const posts: NormalizedPost[] = await Promise.all(
    fbPosts.map(async (p) => ({
      id: p.id,
      platform: "fb" as const,
      url: p.permalink,
      thumbnail: await cacheCreatorMediaThumbnail({
        platform: "fb",
        connectionId,
        mediaId: p.id,
        sourceUrl: p.thumbnailUrl,
      }),
      caption: p.message,
      publishedAt: p.createdTime,
      likeCount: p.reactions,
      commentCount: p.comments ?? null,
      mediaType: normalizeFbMediaType(p.type),
    })),
  );

  return NextResponse.json<MediaResponse>({
    posts: dedupePosts(posts),
    nextCursor,
    hasMore: nextCursor !== null,
  });
}

// Drops posts with empty/missing url and dedupes by url, preserving order.
// Two cards with the same url would otherwise share UI state on the client
// (selection, submitting, submitted overlay) — see SubmitPageClient.
function dedupePosts(posts: NormalizedPost[]): NormalizedPost[] {
  const seen = new Set<string>();
  const out: NormalizedPost[] = [];
  for (const p of posts) {
    if (!p.url) continue;
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    out.push(p);
  }
  return out;
}

function normalizeFbMediaType(type: string): "video" | "image" | "carousel" {
  if (type === "video" || type === "reel") return "video";
  return "image";
}

function youtubeVideoUrl(videoId: string, duration: string): string {
  return parseYoutubeDuration(duration) <= 60
    ? `https://www.youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;
}

function parseYoutubeDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return Number.POSITIVE_INFINITY;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}
