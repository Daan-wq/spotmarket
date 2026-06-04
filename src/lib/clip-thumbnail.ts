import { parseClipUrl } from "./parse-clip-url";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import { fetchRecentMedia, type IgMediaItem } from "./instagram";
import { normalizeIgMediaType, type ClipMediaType } from "./instagram-media-type";
import { fetchTikTokVideos } from "./tiktok";
import { withFreshTikTokAccessToken } from "./token-refresh";
import {
  cacheCreatorMediaThumbnail,
  cacheInstagramMedia,
  findCachedInstagramMediaForUrl,
  isExpiringInstagramThumbnailUrl,
} from "./creator-media-cache";

const TIKTOK_THUMBNAIL_SEARCH_PAGES = 4;

/**
 * Synchronous URL-only derivation. YouTube has predictable thumbnail URLs by
 * video ID so we can produce one without any network call.
 */
export function deriveThumbnail(postUrl: string | null | undefined): string | null {
  if (!postUrl) return null;
  const parsed = parseClipUrl(postUrl);
  if (parsed.platform === "YOUTUBE" && parsed.postId) {
    return `https://i.ytimg.com/vi/${parsed.postId}/hqdefault.jpg`;
  }
  return null;
}

interface ResolveOptions {
  /** Internal User.id of the creator who owns the submission. Required for IG lookup. */
  creatorId?: string | null;
  /** CampaignSubmission.id — when supplied, resolved values are written back to the row. */
  submissionId?: string | null;
  /** Stored mediaType from the submission row, if any. */
  storedMediaType?: ClipMediaType | null;
}

export interface ResolvedClipThumbnail {
  thumbnailUrl: string | null;
  mediaType: ClipMediaType;
}

interface StableSubmissionThumbnailInput {
  postUrl: string | null | undefined;
  creatorId: string | null | undefined;
  candidateThumbnailUrl?: string | null;
  candidateMediaType?: ClipMediaType | null;
  submissionId?: string | null;
}

/**
 * Server-only async resolver. When no synchronous derivation is possible, it
 * uses the creator's verified Instagram/TikTok OAuth connection to fetch media
 * metadata via official APIs and locates the matching post by permalink,
 * shortcode, or video id.
 *
 * Provider CDN URLs are treated as expiring candidates, never as final stored
 * thumbnails. Resolved images are downloaded into the app-owned media cache
 * and persisted back to CampaignSubmission when a submission id is supplied.
 *
 * Use only from server components / route handlers.
 */
export async function resolveThumbnail(
  postUrl: string | null | undefined,
  storedThumbnailUrl: string | null = null,
  options: ResolveOptions = {},
): Promise<ResolvedClipThumbnail> {
  const fallbackMediaType: ClipMediaType = options.storedMediaType ?? deriveMediaTypeFromUrl(postUrl);
  const parsed = postUrl ? parseClipUrl(postUrl) : null;
  const storedIsUnstable = isUnstableProviderThumbnailUrl(storedThumbnailUrl, parsed?.platform);

  if (storedThumbnailUrl && !storedIsUnstable) {
    return { thumbnailUrl: storedThumbnailUrl, mediaType: fallbackMediaType };
  }
  const sync = deriveThumbnail(postUrl);
  if (sync) return { thumbnailUrl: sync, mediaType: fallbackMediaType };
  if (!postUrl) return { thumbnailUrl: null, mediaType: fallbackMediaType };
  if (!parsed) return { thumbnailUrl: null, mediaType: fallbackMediaType };

  if (parsed.platform === "TIKTOK" && options.creatorId) {
    const resolved = await resolveTikTokThumbnail(postUrl, options.creatorId);
    if (resolved?.thumbnailUrl) {
      await writeThroughSubmissionThumbnail(resolved, options);
      return resolved;
    }
    if (storedIsUnstable) {
      const cleared = { thumbnailUrl: null, mediaType: fallbackMediaType };
      await writeThroughSubmissionThumbnail(cleared, options);
      return cleared;
    }
    return { thumbnailUrl: null, mediaType: fallbackMediaType };
  }

  if (parsed.platform === "INSTAGRAM" && options.creatorId) {
    const resolved = await resolveInstagramThumbnail(postUrl, options.creatorId);
    if (resolved) {
      await writeThroughSubmissionThumbnail(resolved, options);
    } else if (storedIsUnstable) {
      await writeThroughSubmissionThumbnail(
        { thumbnailUrl: null, mediaType: fallbackMediaType },
        options,
      );
    }
    return {
      thumbnailUrl: resolved?.thumbnailUrl ?? null,
      mediaType: resolved?.mediaType ?? fallbackMediaType,
    };
  }

  if (storedIsUnstable) {
    await writeThroughSubmissionThumbnail(
      { thumbnailUrl: null, mediaType: fallbackMediaType },
      options,
    );
  }

  return { thumbnailUrl: null, mediaType: fallbackMediaType };
}

export async function resolveStableSubmissionThumbnail({
  postUrl,
  creatorId,
  candidateThumbnailUrl = null,
  candidateMediaType = null,
  submissionId = null,
}: StableSubmissionThumbnailInput): Promise<ResolvedClipThumbnail> {
  return resolveThumbnail(postUrl, candidateThumbnailUrl, {
    creatorId,
    submissionId,
    storedMediaType: candidateMediaType,
  });
}

export function isUnstableProviderThumbnailUrl(
  url: string | null | undefined,
  platform?: string | null,
): boolean {
  if (!url) return false;
  if (isExpiringInstagramThumbnailUrl(url)) return true;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const platformName = platform?.toUpperCase();
    if (host.includes("tiktokcdn") || host.endsWith("tiktokv.com")) return true;
    if (host === "fbcdn.net" || host.endsWith(".fbcdn.net")) return true;
    if (
      platformName === "TIKTOK" &&
      (parsed.searchParams.has("x-expires") ||
        parsed.searchParams.has("expire") ||
        parsed.searchParams.has("expires"))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Last-resort mediaType inference from URL shape when DB has no value
 * and Graph API lookup hasn't run / failed. Reels/Shorts/TikTok = video,
 * Instagram /p/ posts default to image (most common case), unknown = video.
 */
function deriveMediaTypeFromUrl(postUrl: string | null | undefined): ClipMediaType {
  if (!postUrl) return "video";
  const lower = postUrl.toLowerCase();
  if (lower.includes("/reel/") || lower.includes("/reels/")) return "video";
  if (lower.includes("youtube.com/shorts/") || lower.includes("youtu.be/")) return "video";
  if (lower.includes("tiktok.com")) return "video";
  if (lower.match(/instagram\.com\/[\w._-]+\/p\//) || lower.includes("instagram.com/p/")) {
    return "image";
  }
  return "video";
}

/**
 * Look up an Instagram post via the creator's verified OAuth connection and
 * return its thumbnail (or media_url for IMAGE/CAROUSEL) plus normalized
 * mediaType. Walks up to 3 pages of recent media (≈150 posts) before giving up.
 *
 * Exported so the submissions POST handler can also call this at create time.
 */
export async function resolveInstagramThumbnail(
  postUrl: string,
  creatorId: string,
): Promise<{ thumbnailUrl: string | null; mediaType: ClipMediaType } | null> {
  const parsed = parseClipUrl(postUrl);
  if (parsed.platform !== "INSTAGRAM") return null;

  try {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: {
        creatorProfile: {
          select: {
            igConnections: {
              where: { isVerified: true, accessToken: { not: null } },
              select: {
                id: true,
                igUserId: true,
                accessToken: true,
                accessTokenIv: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    const conn = creator?.creatorProfile?.igConnections?.[0];
    if (!conn?.accessToken || !conn.accessTokenIv || !conn.igUserId) {
      return null;
    }

    const cached = await findCachedInstagramMediaForUrl({
      connectionId: conn.id,
      postUrl,
      postId: parsed.postId,
    });
    if (cached) {
      return {
        thumbnailUrl: cached.thumbnail,
        mediaType: cached.mediaType,
      };
    }

    const token = decrypt(conn.accessToken, conn.accessTokenIv);

    const targetShortcode = parsed.postId; // e.g. "C7xYz123"
    const normalizedTarget = normalizePermalink(postUrl);

    let cursor: string | undefined = undefined;
    for (let page = 0; page < 3; page++) {
      const { media, nextCursor }: { media: IgMediaItem[]; nextCursor: string | null } =
        await fetchRecentMedia(token, conn.igUserId, 50, cursor);

      const match = media.find((m) => {
        if (!m.permalink) return false;
        if (normalizePermalink(m.permalink) === normalizedTarget) return true;
        if (targetShortcode && m.permalink.includes(`/${targetShortcode}`)) return true;
        return false;
      });

      if (match) {
        const [cachedMatch] = await cacheInstagramMedia({
          connectionId: conn.id,
          media: [match],
          updateState: false,
        });
        return {
          thumbnailUrl: cachedMatch?.thumbnail ?? null,
          mediaType: cachedMatch?.mediaType ?? normalizeIgMediaType(match.media_type, match.media_product_type),
        };
      }

      if (!nextCursor) break;
      cursor = nextCursor;
    }
  } catch (err) {
    console.warn("[clip-thumbnail] IG resolve failed", err);
  }

  return null;
}

async function resolveTikTokThumbnail(
  postUrl: string,
  creatorId: string,
): Promise<{ thumbnailUrl: string | null; mediaType: ClipMediaType } | null> {
  const parsed = parseClipUrl(postUrl);
  if (parsed.platform !== "TIKTOK") return null;

  try {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: {
        creatorProfile: {
          select: {
            ttConnections: {
              where: { isVerified: true, accessToken: { not: null } },
              select: {
                id: true,
                username: true,
                accessToken: true,
                accessTokenIv: true,
                refreshToken: true,
                refreshTokenIv: true,
                tokenExpiresAt: true,
              },
            },
          },
        },
      },
    });

    const connections = creator?.creatorProfile?.ttConnections ?? [];
    const targetId = parsed.postId ?? "";
    const normalizedTarget = normalizePermalink(postUrl);
    const normalizedAuthor = parsed.authorHandle?.toLowerCase() ?? null;
    const orderedConnections = normalizedAuthor
      ? [...connections].sort((a, b) => {
          const aMatches = a.username.toLowerCase() === normalizedAuthor;
          const bMatches = b.username.toLowerCase() === normalizedAuthor;
          return Number(bMatches) - Number(aMatches);
        })
      : connections;

    for (const conn of orderedConnections) {
      if (!conn.accessToken || !conn.accessTokenIv) continue;
      const resolved = await withFreshTikTokAccessToken(conn, async (token) => {
        let cursor: number | undefined = undefined;
        for (let page = 0; page < TIKTOK_THUMBNAIL_SEARCH_PAGES; page++) {
          const chunk = await fetchTikTokVideos(token, 20, cursor);
          const match = chunk.videos.find((video) => {
            if (targetId && video.id === targetId) return true;
            if (targetId && (video.shareUrl ?? "").includes(targetId)) return true;
            return Boolean(video.shareUrl && normalizePermalink(video.shareUrl) === normalizedTarget);
          });

          if (match) {
            const thumbnailUrl = await cacheCreatorMediaThumbnail({
              platform: "tt",
              connectionId: conn.id,
              mediaId: match.id,
              sourceUrl: match.coverImageUrl,
            });
            return { thumbnailUrl, mediaType: "video" as const };
          }

          if (!chunk.hasMore || chunk.nextCursor == null) break;
          cursor = chunk.nextCursor;
        }
        return null;
      });
      if (resolved) return resolved;
    }
  } catch (err) {
    console.warn("[clip-thumbnail] TT resolve failed", err);
  }

  return null;
}

async function writeThroughSubmissionThumbnail(
  resolved: ResolvedClipThumbnail,
  options: ResolveOptions,
): Promise<void> {
  if (!options.submissionId) return;

  try {
    await prisma.campaignSubmission.update({
      where: { id: options.submissionId },
      data: {
        thumbnailUrl: resolved.thumbnailUrl,
        mediaType: resolved.mediaType,
      },
    });
  } catch (err) {
    console.warn("[clip-thumbnail] write-through failed", err);
  }
}

function normalizePermalink(url: string): string {
  return url.split("?")[0].replace(/\/+$/, "").toLowerCase();
}
