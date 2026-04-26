/**
 * Facebook page bio scraping via Apify (apify/facebook-pages-scraper).
 * Facebook profiles are heavily login-walled — we only support public Pages.
 */

import { runApifyActor, isApifyConfigured, ApifyError } from "./apify";

interface FacebookPageItem {
  about?: string;
  bio?: string;
  intro?: string;
  pageName?: string;
  title?: string;
  likes?: number;
  followers?: number;
  profilePictureUrl?: string;
  pageId?: string;
}

export interface FacebookBioResult {
  bio: string;
  followerCount?: number;
  pageName?: string;
  profilePicUrl?: string;
  fbPageId?: string;
}

export async function fetchFacebookBio(pageHandle: string): Promise<FacebookBioResult | null> {
  if (!isApifyConfigured()) {
    console.warn("[facebook-bio] APIFY_API_TOKEN not configured");
    return null;
  }

  const handle = pageHandle.replace(/^@/, "").replace(/\/$/, "").trim();
  if (!handle) return null;

  const startUrl = handle.startsWith("http") ? handle : `https://www.facebook.com/${handle}`;

  try {
    const items = await runApifyActor<unknown, FacebookPageItem>(
      "apify~facebook-pages-scraper",
      {
        startUrls: [{ url: startUrl }],
        resultsLimit: 1,
      },
      { timeoutSecs: 120 },
    );

    if (items.length === 0) return null;
    const page = items[0];
    const bio = [page.about, page.bio, page.intro].filter(Boolean).join("\n");

    return {
      bio,
      followerCount: page.followers ?? page.likes,
      pageName: page.pageName ?? page.title,
      profilePicUrl: page.profilePictureUrl,
      fbPageId: page.pageId,
    };
  } catch (err) {
    if (err instanceof ApifyError) {
      console.error("[facebook-bio] Apify error:", err.message);
    } else {
      console.error("[facebook-bio] Unexpected error:", err);
    }
    return null;
  }
}
