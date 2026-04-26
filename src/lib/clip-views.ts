/**
 * Per-clip view-count fetcher backed by Apify scrapers.
 * Used by the worker scrape-submission-views cron and any admin "refresh" action.
 */

import { runApifyActor, isApifyConfigured, ApifyError } from "./apify";
import { parseClipUrl, type ClipPlatform } from "./parse-clip-url";

export interface ClipMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  authorHandle: string | null;
  fetchedAt: Date;
  unavailable?: boolean;
}

interface TikTokVideoItem {
  playCount?: number;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  authorMeta?: { name?: string };
}

interface IgPostItem {
  videoViewCount?: number;
  videoPlayCount?: number;
  likesCount?: number;
  commentsCount?: number;
  ownerUsername?: string;
}

interface FbVideoItem {
  viewsCount?: number;
  views?: number;
  reactionsCount?: number;
  commentsCount?: number;
  sharesCount?: number;
}

export async function fetchClipMetrics(postUrl: string): Promise<ClipMetrics | null> {
  if (!isApifyConfigured()) return null;

  const parsed = parseClipUrl(postUrl);
  if (parsed.platform === "UNKNOWN") return null;

  try {
    switch (parsed.platform) {
      case "TIKTOK":
        return await fetchTikTokMetrics(postUrl);
      case "INSTAGRAM":
        return await fetchInstagramMetrics(postUrl);
      case "FACEBOOK":
        return await fetchFacebookMetrics(postUrl);
      case "YOUTUBE":
        return null;
      default:
        return null;
    }
  } catch (err) {
    if (err instanceof ApifyError && err.status === 404) {
      return {
        views: null,
        likes: null,
        comments: null,
        shares: null,
        authorHandle: null,
        fetchedAt: new Date(),
        unavailable: true,
      };
    }
    console.error("[clip-views] fetch error:", err);
    return null;
  }
}

async function fetchTikTokMetrics(url: string): Promise<ClipMetrics | null> {
  const items = await runApifyActor<unknown, TikTokVideoItem>(
    "clockworks~tiktok-scraper",
    {
      postURLs: [url],
      resultsPerPage: 1,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      proxyCountryCode: "None",
    },
    { timeoutSecs: 90 },
  );
  if (items.length === 0) return null;
  const v = items[0];
  return {
    views: v.playCount ?? null,
    likes: v.diggCount ?? null,
    comments: v.commentCount ?? null,
    shares: v.shareCount ?? null,
    authorHandle: v.authorMeta?.name?.toLowerCase() ?? null,
    fetchedAt: new Date(),
  };
}

async function fetchInstagramMetrics(url: string): Promise<ClipMetrics | null> {
  const items = await runApifyActor<unknown, IgPostItem>(
    "apify~instagram-post-scraper",
    {
      directUrls: [url],
      resultsLimit: 1,
    },
    { timeoutSecs: 120 },
  );
  if (items.length === 0) return null;
  const v = items[0];
  return {
    views: v.videoViewCount ?? v.videoPlayCount ?? null,
    likes: v.likesCount ?? null,
    comments: v.commentsCount ?? null,
    shares: null,
    authorHandle: v.ownerUsername?.toLowerCase() ?? null,
    fetchedAt: new Date(),
  };
}

async function fetchFacebookMetrics(url: string): Promise<ClipMetrics | null> {
  const items = await runApifyActor<unknown, FbVideoItem>(
    "apify~facebook-videos-scraper",
    {
      startUrls: [{ url }],
      resultsLimit: 1,
    },
    { timeoutSecs: 120 },
  );
  if (items.length === 0) return null;
  const v = items[0];
  return {
    views: v.viewsCount ?? v.views ?? null,
    likes: v.reactionsCount ?? null,
    comments: v.commentsCount ?? null,
    shares: v.sharesCount ?? null,
    authorHandle: null,
    fetchedAt: new Date(),
  };
}

export function platformFromUrl(url: string): ClipPlatform {
  return parseClipUrl(url).platform;
}
