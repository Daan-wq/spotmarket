/**
 * Parse a creator-submitted clip URL into a stable platform identity.
 * Used by /api/submissions for ownership checks and duplicate prevention.
 */

export type ClipPlatform = "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | "YOUTUBE" | "UNKNOWN";
export type NormalizedClipPlatform = Exclude<ClipPlatform, "UNKNOWN">;

export interface ParsedClipUrl {
  platform: ClipPlatform;
  authorHandle: string | null;
  normalizedPlatform?: NormalizedClipPlatform | null;
  platformVideoId?: string | null;
  postId: string | null;
  normalizedUrl: string;
}

const TIKTOK_RE = /tiktok\.com\/@([\w.\-]+)\/(?:video|photo)\/(\d+)/i;
const TIKTOK_VM_RE = /(?:vm|vt)\.tiktok\.com\/(\w+)/i;
const IG_HANDLE_RE = /instagram\.com\/([\w._-]+)\/(?:reel|p|tv)\/([\w-]+)/i;
const IG_NO_HANDLE_RE = /instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/i;
const FB_HANDLE_RE = /facebook\.com\/([\w.-]+)\/videos\/(\d+)/i;
const FB_WATCH_RE = /facebook\.com\/watch\/?\?v=(\d+)/i;
const FB_REEL_RE = /facebook\.com\/reel\/(\d+)/i;
const YT_SHORTS_RE = /youtube\.com\/shorts\/([\w-]+)/i;
const YT_WATCH_RE = /youtube\.com\/watch\?v=([\w-]+)/i;
const YT_BE_RE = /youtu\.be\/([\w-]+)/i;

export function parseClipUrl(input: string): ParsedClipUrl {
  const url = input.trim();
  const lower = url.toLowerCase();

  let m: RegExpMatchArray | null;

  if ((m = url.match(TIKTOK_RE))) {
    return parsed("TIKTOK", m[1].toLowerCase(), m[2], url);
  }
  if (lower.includes("tiktok.com") && (m = url.match(TIKTOK_VM_RE))) {
    return parsed("TIKTOK", null, m[1], url, false);
  }

  if ((m = url.match(IG_HANDLE_RE))) {
    const handle = m[1].toLowerCase();
    if (handle === "reel" || handle === "reels" || handle === "p" || handle === "tv") {
      const m2 = url.match(IG_NO_HANDLE_RE);
      return parsed("INSTAGRAM", null, m2?.[1] ?? null, url);
    }
    return parsed("INSTAGRAM", handle, m[2], url);
  }
  if ((m = url.match(IG_NO_HANDLE_RE))) {
    return parsed("INSTAGRAM", null, m[1], url);
  }

  if ((m = url.match(FB_HANDLE_RE))) {
    return parsed("FACEBOOK", m[1].toLowerCase(), m[2], url);
  }
  if ((m = url.match(FB_REEL_RE))) {
    return parsed("FACEBOOK", null, m[1], url);
  }
  if ((m = url.match(FB_WATCH_RE))) {
    return parsed("FACEBOOK", null, m[1], url);
  }

  const youtubeId = parseYoutubeVideoId(url);
  if (youtubeId) {
    return parsed("YOUTUBE", null, youtubeId, url);
  }

  return {
    platform: "UNKNOWN",
    authorHandle: null,
    normalizedPlatform: null,
    platformVideoId: null,
    postId: null,
    normalizedUrl: url,
  };
}

export function normalizeHandle(h: string | null | undefined): string | null {
  if (!h) return null;
  return h.replace(/^@/, "").trim().toLowerCase() || null;
}

function parsed(
  platform: NormalizedClipPlatform,
  authorHandle: string | null,
  postId: string | null,
  normalizedUrl: string,
  reliableIdentity = true,
): ParsedClipUrl {
  return {
    platform,
    authorHandle,
    normalizedPlatform: platform,
    platformVideoId: reliableIdentity ? postId : null,
    postId,
    normalizedUrl,
  };
}

function parseYoutubeVideoId(input: string): string | null {
  try {
    const parsedUrl = new URL(input);
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      return cleanPathSegment(parsedUrl.pathname.split("/").filter(Boolean)[0]);
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "shorts" && pathParts[1]) {
        return cleanPathSegment(pathParts[1]);
      }
      if (pathParts[0] === "watch") {
        return cleanPathSegment(parsedUrl.searchParams.get("v"));
      }
    }
  } catch {
    let m: RegExpMatchArray | null;
    if ((m = input.match(YT_SHORTS_RE))) return m[1];
    if ((m = input.match(YT_WATCH_RE))) return m[1];
    if ((m = input.match(YT_BE_RE))) return m[1];
  }

  return null;
}

function cleanPathSegment(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}
