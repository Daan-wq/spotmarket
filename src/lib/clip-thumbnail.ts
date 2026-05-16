import { parseClipUrl } from "./parse-clip-url";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import { fetchRecentMedia, type IgMediaItem } from "./instagram";
import { normalizeIgMediaType, type ClipMediaType } from "./instagram-media-type";
import {
  cacheInstagramMedia,
  findCachedInstagramMediaForUrl,
  isExpiringInstagramThumbnailUrl,
} from "./creator-media-cache";

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

/**
 * Server-only async resolver. Falls back to TikTok oEmbed when no synchronous
 * derivation is possible. For Instagram, uses the creator's verified OAuth
 * connection to fetch media metadata via Graph API and locates the matching
 * post by permalink/shortcode.
 *
 * Cached for 1h via Next's fetch cache for TikTok. For IG, results are
 * persisted back to the CampaignSubmission row (write-through cache) so we
 * never re-call Graph API for the same submission.
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

  if (
    storedThumbnailUrl &&
    !(parsed?.platform === "INSTAGRAM" && isExpiringInstagramThumbnailUrl(storedThumbnailUrl))
  ) {
    return { thumbnailUrl: storedThumbnailUrl, mediaType: fallbackMediaType };
  }
  const sync = deriveThumbnail(postUrl);
  if (sync) return { thumbnailUrl: sync, mediaType: fallbackMediaType };
  if (!postUrl) return { thumbnailUrl: null, mediaType: fallbackMediaType };
  if (!parsed) return { thumbnailUrl: null, mediaType: fallbackMediaType };

  if (parsed.platform === "TIKTOK") {
    try {
      const res = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(postUrl)}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) return { thumbnailUrl: null, mediaType: fallbackMediaType };
      const data = (await res.json()) as { thumbnail_url?: string };
      return {
        thumbnailUrl: data.thumbnail_url ?? null,
        mediaType: fallbackMediaType,
      };
    } catch {
      return { thumbnailUrl: null, mediaType: fallbackMediaType };
    }
  }

  if (parsed.platform === "INSTAGRAM" && options.creatorId) {
    const resolved = await resolveInstagramThumbnail(postUrl, options.creatorId);
    if (resolved && options.submissionId) {
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
    return {
      thumbnailUrl: resolved?.thumbnailUrl ?? null,
      mediaType: resolved?.mediaType ?? fallbackMediaType,
    };
  }

  return { thumbnailUrl: null, mediaType: fallbackMediaType };
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

function normalizePermalink(url: string): string {
  return url.split("?")[0].replace(/\/+$/, "").toLowerCase();
}
