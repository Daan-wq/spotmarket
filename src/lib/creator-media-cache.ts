import type { CreatorMediaCache, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadCreatorMediaCacheImage } from "@/lib/supabase/storage";
import { normalizeIgMediaType, type ClipMediaType } from "@/lib/instagram-media-type";
import type { IgMediaItem } from "@/types/instagram";
import type { MediaResponse, NormalizedPost } from "@/types/media";

const CACHE_CURSOR_PREFIX = "cache:";
const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;

export const CREATOR_MEDIA_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const IG_MEDIA_CACHE_PLATFORM = "ig";

interface ReadCacheArgs {
  platform: typeof IG_MEDIA_CACHE_PLATFORM;
  connectionId: string;
  limit: number;
  cursor?: string;
  maxAgeMs?: number;
  now?: Date;
}

interface CacheInstagramMediaArgs {
  connectionId: string;
  media: IgMediaItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
  updateState?: boolean;
  now?: Date;
}

interface FindCachedInstagramArgs {
  connectionId: string;
  postUrl: string;
  postId?: string | null;
}

type CacheRow = Pick<
  CreatorMediaCache,
  | "platformMediaId"
  | "permalink"
  | "thumbnailUrl"
  | "caption"
  | "mediaType"
  | "publishedAt"
  | "likeCount"
  | "commentCount"
  | "fetchedAt"
>;

export async function readCachedCreatorMedia({
  platform,
  connectionId,
  limit,
  cursor,
  maxAgeMs = CREATOR_MEDIA_CACHE_TTL_MS,
  now = new Date(),
}: ReadCacheArgs): Promise<MediaResponse | null> {
  const offset = parseCacheCursor(cursor);
  if (offset == null) return null;

  const [state, rows] = await Promise.all([
    prisma.creatorMediaCacheState.findUnique({
      where: { platform_connectionId: { platform, connectionId } },
    }),
    prisma.creatorMediaCache.findMany({
      where: { platform, connectionId },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 150,
    }),
  ]);

  if (!state || rows.length === 0) return null;

  const freshAt = state.refreshedAt;
  if (!freshAt || now.getTime() - freshAt.getTime() > maxAgeMs) return null;

  const page = rows.slice(offset, offset + limit).map(rowToPost);
  const nextOffset = offset + limit;
  const hasMoreCachedRows = rows.length > nextOffset;
  const nextCursor = hasMoreCachedRows
    ? `${CACHE_CURSOR_PREFIX}${nextOffset}`
    : state?.hasMore
      ? state.nextCursor
      : null;

  return {
    posts: page,
    nextCursor: nextCursor ?? null,
    hasMore: Boolean(nextCursor),
  };
}

export async function cacheInstagramMedia({
  connectionId,
  media,
  nextCursor = null,
  hasMore = Boolean(nextCursor),
  updateState = true,
  now = new Date(),
}: CacheInstagramMediaArgs): Promise<NormalizedPost[]> {
  const posts: NormalizedPost[] = [];

  for (const item of media) {
    const sourceThumbnailUrl = item.thumbnail_url ?? item.media_url ?? null;
    const thumbnailUrl = await cacheCreatorMediaThumbnail({
      platform: IG_MEDIA_CACHE_PLATFORM,
      connectionId,
      mediaId: item.id,
      sourceUrl: sourceThumbnailUrl,
    });
    const mediaType = normalizeIgMediaType(item.media_type, item.media_product_type);
    const publishedAt = parseDate(item.timestamp);
    const post = instagramItemToPost(item, thumbnailUrl, mediaType);

    await prisma.creatorMediaCache.upsert({
      where: {
        platform_connectionId_platformMediaId: {
          platform: IG_MEDIA_CACHE_PLATFORM,
          connectionId,
          platformMediaId: item.id,
        },
      },
      create: {
        platform: IG_MEDIA_CACHE_PLATFORM,
        connectionId,
        platformMediaId: item.id,
        permalink: item.permalink,
        thumbnailUrl: post.thumbnail,
        sourceThumbnailUrl,
        caption: item.caption,
        mediaType,
        mediaProductType: item.media_product_type,
        publishedAt,
        likeCount: item.like_count,
        commentCount: item.comments_count,
        fetchedAt: now,
        raw: item as unknown as Prisma.InputJsonValue,
      },
      update: {
        permalink: item.permalink,
        thumbnailUrl: post.thumbnail,
        sourceThumbnailUrl,
        caption: item.caption,
        mediaType,
        mediaProductType: item.media_product_type,
        publishedAt,
        likeCount: item.like_count,
        commentCount: item.comments_count,
        fetchedAt: now,
        raw: item as unknown as Prisma.InputJsonValue,
      },
    });

    posts.push(post);
  }

  if (updateState && media.length > 0) {
    await prisma.creatorMediaCacheState.upsert({
      where: {
        platform_connectionId: {
          platform: IG_MEDIA_CACHE_PLATFORM,
          connectionId,
        },
      },
      create: {
        platform: IG_MEDIA_CACHE_PLATFORM,
        connectionId,
        nextCursor,
        hasMore,
        refreshedAt: now,
      },
      update: {
        nextCursor,
        hasMore,
        refreshedAt: now,
      },
    });
  }

  return posts;
}

export async function findCachedInstagramMediaForUrl({
  connectionId,
  postUrl,
  postId,
}: FindCachedInstagramArgs): Promise<NormalizedPost | null> {
  const target = normalizePermalink(postUrl);
  const rows = await prisma.creatorMediaCache.findMany({
    where: { platform: IG_MEDIA_CACHE_PLATFORM, connectionId },
    orderBy: [{ fetchedAt: "desc" }],
    take: 150,
  });

  const match = rows.find((row) => {
    if (!row.permalink) return false;
    const normalized = normalizePermalink(row.permalink);
    if (normalized === target) return true;
    return Boolean(postId && normalized.includes(`/${postId.toLowerCase()}`));
  });

  if (!match?.thumbnailUrl || isExpiringInstagramThumbnailUrl(match.thumbnailUrl)) {
    return null;
  }
  return rowToPost(match);
}

export async function cacheCreatorMediaThumbnail({
  platform,
  connectionId,
  mediaId,
  sourceUrl,
}: {
  platform: string;
  connectionId: string;
  mediaId: string;
  sourceUrl: string | null;
}): Promise<string | null> {
  if (!sourceUrl) return null;
  if (isStableCreatorMediaCacheUrl(sourceUrl)) return sourceUrl;

  try {
    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) return null;

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_REMOTE_IMAGE_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_REMOTE_IMAGE_BYTES) return null;

    const uploaded = await uploadCreatorMediaCacheImage({
      buffer,
      contentType,
      platform,
      connectionId,
      mediaId,
    });
    return uploaded.publicUrl;
  } catch (err) {
    console.warn("[creator-media-cache] thumbnail cache failed", err);
    return null;
  }
}

export function isExpiringInstagramThumbnailUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "cdninstagram.com" || host.endsWith(".cdninstagram.com");
  } catch {
    return false;
  }
}

function instagramItemToPost(
  item: IgMediaItem,
  thumbnailUrl: string | null,
  mediaType: ClipMediaType,
): NormalizedPost {
  return {
    id: item.id,
    platform: IG_MEDIA_CACHE_PLATFORM,
    url: item.permalink,
    thumbnail: thumbnailUrl,
    caption: item.caption,
    publishedAt: item.timestamp,
    likeCount: item.like_count,
    commentCount: item.comments_count ?? null,
    mediaType,
  };
}

function rowToPost(row: CacheRow): NormalizedPost {
  return {
    id: row.platformMediaId,
    platform: IG_MEDIA_CACHE_PLATFORM,
    url: row.permalink ?? "",
    thumbnail: row.thumbnailUrl,
    caption: row.caption,
    publishedAt: row.publishedAt?.toISOString() ?? row.fetchedAt.toISOString(),
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    mediaType: normalizeStoredMediaType(row.mediaType),
  };
}

function parseCacheCursor(cursor: string | undefined): number | null {
  if (!cursor) return 0;
  if (!cursor.startsWith(CACHE_CURSOR_PREFIX)) return null;
  const offset = Number(cursor.slice(CACHE_CURSOR_PREFIX.length));
  return Number.isInteger(offset) && offset >= 0 ? offset : null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStoredMediaType(value: string): ClipMediaType {
  if (value === "video" || value === "carousel") return value;
  return "image";
}

function normalizePermalink(url: string): string {
  return url.split("?")[0].replace(/\/+$/, "").toLowerCase();
}

function isStableCreatorMediaCacheUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/creator-media-cache/");
}
