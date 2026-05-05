import { parseClipUrl } from "./parse-clip-url";

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

/**
 * Server-only async resolver. Falls back to TikTok oEmbed when no synchronous
 * derivation is possible. Use only from server components / route handlers.
 *
 * Cached for 1h via Next's fetch cache so repeat views don't hammer oEmbed.
 */
export async function resolveThumbnail(
  postUrl: string | null | undefined,
  storedThumbnailUrl: string | null = null,
): Promise<string | null> {
  if (storedThumbnailUrl) return storedThumbnailUrl;
  const sync = deriveThumbnail(postUrl);
  if (sync) return sync;
  if (!postUrl) return null;

  const parsed = parseClipUrl(postUrl);
  if (parsed.platform === "TIKTOK") {
    try {
      const res = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(postUrl)}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { thumbnail_url?: string };
      return data.thumbnail_url ?? null;
    } catch {
      return null;
    }
  }

  return null;
}
