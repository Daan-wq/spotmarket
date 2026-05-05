import { parseClipUrl } from "./parse-clip-url";

/**
 * Derive a thumbnail URL from the post URL when no stored thumbnail exists.
 * IG/TT/FB CDN URLs are signed and expire — we can't reconstruct those.
 * YouTube has stable predictable thumbnail URLs by video ID.
 */
export function deriveThumbnail(postUrl: string | null | undefined): string | null {
  if (!postUrl) return null;
  const parsed = parseClipUrl(postUrl);
  if (parsed.platform === "YOUTUBE" && parsed.postId) {
    return `https://i.ytimg.com/vi/${parsed.postId}/hqdefault.jpg`;
  }
  return null;
}
