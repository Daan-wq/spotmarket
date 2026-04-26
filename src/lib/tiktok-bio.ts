/**
 * TikTok bio scraping via Apify (clockworks/tiktok-scraper).
 * TikTok pages are JS-rendered, so plain HTML fetch can't see the bio.
 */

import { runApifyActor, isApifyConfigured, ApifyError } from "./apify";

interface TikTokProfileItem {
  authorMeta?: {
    name?: string;
    nickName?: string;
    signature?: string;
    fans?: number;
    avatar?: string;
  };
  signature?: string;
  bio?: string;
  authorBio?: string;
}

export interface TikTokBioResult {
  bio: string;
  followerCount?: number;
  displayName?: string;
  avatarUrl?: string;
}

export async function fetchTikTokBio(username: string): Promise<TikTokBioResult | null> {
  if (!isApifyConfigured()) {
    console.warn("[tiktok-bio] APIFY_API_TOKEN not configured");
    return null;
  }

  const handle = username.replace(/^@/, "").trim();
  if (!handle) return null;

  try {
    const items = await runApifyActor<unknown, TikTokProfileItem>(
      "clockworks~tiktok-scraper",
      {
        profiles: [handle],
        resultsPerPage: 1,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
        proxyCountryCode: "None",
      },
      { timeoutSecs: 90 },
    );

    if (items.length === 0) return null;
    const first = items[0];
    const meta = first.authorMeta ?? {};
    const bio = first.signature ?? meta.signature ?? first.bio ?? first.authorBio ?? "";

    return {
      bio,
      followerCount: meta.fans,
      displayName: meta.nickName ?? meta.name,
      avatarUrl: meta.avatar,
    };
  } catch (err) {
    if (err instanceof ApifyError) {
      console.error("[tiktok-bio] Apify error:", err.message);
    } else {
      console.error("[tiktok-bio] Unexpected error:", err);
    }
    return null;
  }
}
