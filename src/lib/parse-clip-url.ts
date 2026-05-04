/**
 * Parse a creator-submitted clip URL into { platform, authorHandle, postId }.
 * Used by /api/submissions for anti-fraud handle matching.
 */

export type ClipPlatform = "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | "YOUTUBE" | "UNKNOWN";

export interface ParsedClipUrl {
  platform: ClipPlatform;
  authorHandle: string | null;
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
    return { platform: "TIKTOK", authorHandle: m[1].toLowerCase(), postId: m[2], normalizedUrl: url };
  }
  if (lower.includes("tiktok.com") && (m = url.match(TIKTOK_VM_RE))) {
    return { platform: "TIKTOK", authorHandle: null, postId: m[1], normalizedUrl: url };
  }

  if ((m = url.match(IG_HANDLE_RE))) {
    const handle = m[1].toLowerCase();
    if (handle === "reel" || handle === "reels" || handle === "p" || handle === "tv") {
      const m2 = url.match(IG_NO_HANDLE_RE);
      return { platform: "INSTAGRAM", authorHandle: null, postId: m2?.[1] ?? null, normalizedUrl: url };
    }
    return { platform: "INSTAGRAM", authorHandle: handle, postId: m[2], normalizedUrl: url };
  }
  if ((m = url.match(IG_NO_HANDLE_RE))) {
    return { platform: "INSTAGRAM", authorHandle: null, postId: m[1], normalizedUrl: url };
  }

  if ((m = url.match(FB_HANDLE_RE))) {
    return { platform: "FACEBOOK", authorHandle: m[1].toLowerCase(), postId: m[2], normalizedUrl: url };
  }
  if ((m = url.match(FB_REEL_RE))) {
    return { platform: "FACEBOOK", authorHandle: null, postId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(FB_WATCH_RE))) {
    return { platform: "FACEBOOK", authorHandle: null, postId: m[1], normalizedUrl: url };
  }

  if ((m = url.match(YT_SHORTS_RE))) {
    return { platform: "YOUTUBE", authorHandle: null, postId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(YT_WATCH_RE))) {
    return { platform: "YOUTUBE", authorHandle: null, postId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(YT_BE_RE))) {
    return { platform: "YOUTUBE", authorHandle: null, postId: m[1], normalizedUrl: url };
  }

  return { platform: "UNKNOWN", authorHandle: null, postId: null, normalizedUrl: url };
}

export function normalizeHandle(h: string | null | undefined): string | null {
  if (!h) return null;
  return h.replace(/^@/, "").trim().toLowerCase() || null;
}
