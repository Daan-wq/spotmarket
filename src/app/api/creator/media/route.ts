import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getFreshTikTokAccessToken } from "@/lib/token-refresh";
import { fetchRecentMedia } from "@/lib/instagram";
import { fetchTikTokVideos } from "@/lib/tiktok";
import { fetchFacebookPagePostsPaginated } from "@/lib/facebook";
import type { NormalizedPost, MediaResponse } from "@/types/media";

const DEFAULT_LIMIT = 10;

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");
    const { searchParams } = req.nextUrl;
    const platform = searchParams.get("platform") as "ig" | "tt" | "fb" | null;
    const connectionId = searchParams.get("connectionId");
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
      50
    );

    if (!platform || !["ig", "tt", "fb"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }
    if (!connectionId) {
      return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
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
      return await handleIg(creatorProfileId, connectionId, limit, cursor);
    }
    if (platform === "tt") {
      return await handleTt(creatorProfileId, connectionId, limit, cursor);
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
  cursor: string | undefined
): Promise<NextResponse> {
  const conn = await prisma.creatorIgConnection.findFirst({
    where: { id: connectionId, creatorProfileId, isVerified: true },
    select: { igUserId: true, accessToken: true, accessTokenIv: true },
  });
  if (!conn?.accessToken || !conn.accessTokenIv || !conn.igUserId) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  const token = decrypt(conn.accessToken, conn.accessTokenIv);
  const { media, nextCursor } = await fetchRecentMedia(token, conn.igUserId, limit, cursor);

  // Detect Meta rate-limit response (empty + returned with error in a prior logged warn)
  // The lib logs and returns [] on non-2xx; surface as rate_limited if we suspect throttle
  const posts: NormalizedPost[] = media.map((m) => ({
    id: m.id,
    platform: "ig",
    url: m.permalink,
    thumbnail: m.thumbnail_url ?? m.media_url ?? null,
    caption: m.caption,
    publishedAt: m.timestamp,
    likeCount: m.like_count,
    mediaType: normalizeIgMediaType(m.media_type, m.media_product_type),
  }));

  return NextResponse.json<MediaResponse>({ posts, nextCursor, hasMore: nextCursor !== null });
}

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
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  const token = await getFreshTikTokAccessToken(conn);
  if (!token) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  const cursorNum = cursor !== undefined ? parseInt(cursor, 10) : undefined;
  const { videos, nextCursor, hasMore } = await fetchTikTokVideos(token, limit, cursorNum);

  const posts: NormalizedPost[] = videos.map((v) => ({
    id: v.id,
    platform: "tt",
    url: v.shareUrl ?? "",
    thumbnail: v.coverImageUrl,
    caption: v.title || null,
    publishedAt: new Date(v.createTime * 1000).toISOString(),
    likeCount: v.likeCount,
    mediaType: "video",
  }));

  return NextResponse.json<MediaResponse>({
    posts,
    nextCursor: nextCursor !== null ? String(nextCursor) : null,
    hasMore,
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
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  const token = decrypt(conn.accessToken, conn.accessTokenIv);
  const { posts: fbPosts, nextCursor } = await fetchFacebookPagePostsPaginated(
    conn.fbPageId,
    token,
    limit,
    cursor
  );

  const posts: NormalizedPost[] = fbPosts.map((p) => ({
    id: p.id,
    platform: "fb",
    url: p.permalink,
    thumbnail: p.thumbnailUrl,
    caption: p.message,
    publishedAt: p.createdTime,
    likeCount: p.reactions,
    mediaType: normalizeFbMediaType(p.type),
  }));

  return NextResponse.json<MediaResponse>({ posts, nextCursor, hasMore: nextCursor !== null });
}

function normalizeIgMediaType(
  mediaType: string,
  mediaProductType: string
): "video" | "image" | "carousel" {
  const product = (mediaProductType ?? "").toUpperCase();
  const type = (mediaType ?? "").toUpperCase();
  if (product === "REELS" || product === "REEL") return "video";
  if (type === "CAROUSEL_ALBUM") return "carousel";
  if (type === "VIDEO") return "video";
  return "image";
}

function normalizeFbMediaType(type: string): "video" | "image" | "carousel" {
  if (type === "video" || type === "reel") return "video";
  return "image";
}
