/**
 * Meta Graph API client for Facebook Pages.
 * Uses never-expiring Page Access Tokens stored encrypted in DB.
 */

import type {
  FbPageProfile,
  FbPagePost,
  FbDailyPageInsight,
  FbPageInsightsResult,
} from "@/types/facebook";

export type { FbPageProfile, FbPagePost, FbDailyPageInsight, FbPageInsightsResult };

const GRAPH_BASE = "https://graph.facebook.com/v25.0";

// ─────────────────────────────────────────
// OAUTH HELPERS
// ─────────────────────────────────────────

export function getFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
    scope: "pages_show_list,pages_read_engagement,read_insights,pages_read_user_content",
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v25.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeFbCodeForToken(
  code: string
): Promise<{ accessToken: string; expiresIn: number }> {
  // Step 1: Exchange code for short-lived user token
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
    code,
  });
  const shortRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);
  if (!shortRes.ok) {
    throw new Error(`Facebook token exchange failed: ${await shortRes.text()}`);
  }
  const shortData = await shortRes.json();
  const shortLivedToken: string = shortData.access_token;

  // Step 2: Exchange for long-lived user token (~60 days)
  const longParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });
  const longRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${longParams}`);
  if (!longRes.ok) {
    console.error("[facebook] long-lived exchange failed:", await longRes.text());
    return { accessToken: shortLivedToken, expiresIn: shortData.expires_in ?? 3600 };
  }
  const longData = await longRes.json();

  return {
    accessToken: longData.access_token,
    expiresIn: longData.expires_in ?? 5184000, // ~60 days
  };
}

/**
 * Fetch user's managed Facebook Pages with the user token,
 * then return pages with their never-expiring Page Access Tokens.
 */
export async function fetchUserPages(
  userAccessToken: string
): Promise<{ id: string; name: string; accessToken: string }[]> {
  const res = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
  );
  if (!res.ok) {
    throw new Error(`Facebook pages fetch failed: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    accessToken: p.access_token as string, // never-expiring page token
  }));
}

// ─────────────────────────────────────────
// PAGE PROFILE
// ─────────────────────────────────────────

export async function fetchFacebookPageProfile(
  pageId: string,
  accessToken: string
): Promise<FbPageProfile> {
  const fields = "id,name,about,followers_count,picture.type(large)";
  const res = await fetch(
    `${GRAPH_BASE}/${pageId}?fields=${fields}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`fetchFacebookPageProfile failed: ${await res.text()}`);
  const d = await res.json();
  return {
    id: d.id,
    name: d.name ?? "",
    about: d.about ?? "",
    followerCount: d.followers_count ?? 0,
    profilePictureUrl: d.picture?.data?.url ?? "",
  };
}

// ─────────────────────────────────────────
// PAGE DAILY INSIGHTS
// ─────────────────────────────────────────

/**
 * Build a map of { dateKey → value } from a period=day Page Insights response.
 */
function extractDayValues(
  data: { name: string; values: { value: number; end_time: string }[] }[]
): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {};
  for (const item of data) {
    map[item.name] = {};
    for (const v of item.values ?? []) {
      const dateKey = v.end_time?.slice(0, 10) ?? "";
      if (dateKey) map[item.name][dateKey] = v.value ?? 0;
    }
  }
  return map;
}

export async function fetchPageDailyInsights(
  pageId: string,
  accessToken: string,
  sinceUnix: number,
  untilUnix: number
): Promise<FbPageInsightsResult> {
  const base = `${GRAPH_BASE}/${pageId}/insights`;

  // ── Call 1: per-day metrics ──
  const dailyParams = new URLSearchParams({
    metric: "page_impressions,page_post_engagements,page_fans",
    period: "day",
    since: String(sinceUnix),
    until: String(untilUnix),
    access_token: accessToken,
  });
  const dailyRes = await fetch(`${base}?${dailyParams}`);
  if (!dailyRes.ok) {
    throw new Error(`fetchPageDailyInsights (daily) failed: ${await dailyRes.text()}`);
  }
  const dailyData = await dailyRes.json();
  const core = extractDayValues(
    (dailyData.data ?? []) as { name: string; values: { value: number; end_time: string }[] }[]
  );

  // ── Call 2: page_impressions_unique (reach) — separate because it's a different metric ──
  let reachMap: Record<string, number> = {};
  try {
    const reachParams = new URLSearchParams({
      metric: "page_impressions_unique",
      period: "day",
      since: String(sinceUnix),
      until: String(untilUnix),
      access_token: accessToken,
    });
    const reachRes = await fetch(`${base}?${reachParams}`);
    if (reachRes.ok) {
      const reachData = await reachRes.json();
      const reachExtracted = extractDayValues(
        (reachData.data ?? []) as { name: string; values: { value: number; end_time: string }[] }[]
      );
      reachMap = reachExtracted["page_impressions_unique"] ?? {};
    }
  } catch {
    // Non-fatal
  }

  // ── Call 3: engagement totals (reactions, comments, shares) via page_actions_post_reactions_total ──
  let totalReactions = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalEngagedUsers = 0;
  try {
    const engParams = new URLSearchParams({
      metric: "page_engaged_users",
      period: "day",
      since: String(sinceUnix),
      until: String(untilUnix),
      access_token: accessToken,
    });
    const engRes = await fetch(`${base}?${engParams}`);
    if (engRes.ok) {
      const engData = await engRes.json();
      const engExtracted = extractDayValues(
        (engData.data ?? []) as { name: string; values: { value: number; end_time: string }[] }[]
      );
      totalEngagedUsers = Object.values(engExtracted["page_engaged_users"] ?? {}).reduce((s, v) => s + v, 0);
    }
  } catch {
    // Non-fatal
  }

  const dateKeys = Object.keys(core["page_impressions"] ?? reachMap).sort();

  // Sum totals from daily values
  const totalReach = Object.values(reachMap).reduce((s, v) => s + v, 0);
  const totalImpressions = Object.values(core["page_impressions"] ?? {}).reduce((s, v) => s + v, 0);
  const totalEngagement = Object.values(core["page_post_engagements"] ?? {}).reduce((s, v) => s + v, 0);

  // page_fans is cumulative — take the last day's value
  const fansMap = core["page_fans"] ?? {};
  const lastFansKey = Object.keys(fansMap).sort().pop();
  const pageFans = lastFansKey ? fansMap[lastFansKey] : 0;

  const daily: FbDailyPageInsight[] = dateKeys.map((dateKey) => ({
    date: dateKey,
    reach: reachMap[dateKey] ?? null,
    impressions: core["page_impressions"]?.[dateKey] ?? null,
    followers: core["page_fans"]?.[dateKey] ?? null,
    photosPosted: 0,
    videosPosted: 0,
    linksPosted: 0,
    statusesPosted: 0,
  }));

  return {
    daily,
    windowTotals: {
      reach: totalReach,
      impressions: totalImpressions,
      engagedUsers: totalEngagedUsers,
      reactions: totalReactions,
      comments: totalComments,
      shares: totalShares,
      pageFans,
    },
  };
}

// ─────────────────────────────────────────
// RECENT PAGE POSTS
// ─────────────────────────────────────────

function mapPost(post: Record<string, unknown>, defaultType: string): FbPagePost {
  const reactions = post.reactions as Record<string, unknown> | undefined;
  const comments = post.comments as Record<string, unknown> | undefined;
  const shares = post.shares as Record<string, unknown> | undefined;
  return {
    id: post.id as string,
    message: (post.message as string | null) ?? (post.story as string | null) ?? (post.description as string | null) ?? (post.title as string | null) ?? null,
    type: (post.type as string) ?? (post.status_type as string) ?? defaultType,
    permalink: (post.permalink_url as string) ?? "",
    createdTime: (post.created_time as string) ?? "",
    reactions: ((reactions?.summary as Record<string, unknown>)?.total_count as number) ?? 0,
    comments: ((comments?.summary as Record<string, unknown>)?.total_count as number) ?? 0,
    shares: (shares?.count as number) ?? 0,
  };
}

export async function fetchRecentPagePosts(
  pageId: string,
  accessToken: string,
  limit = 50
): Promise<FbPagePost[]> {
  // NOTE: v3.3+ deprecated reactions.summary/comments.summary/shares on post edges.
  // Engagement counts are now fetched via /insights — keep post fields minimal here.
  const fields = "id,message,story,status_type,permalink_url,created_time,full_picture,attachments";
  const videoFields = "id,description,title,permalink_url,created_time";
  const [publishedPostsRes, postsRes, videosRes, reelsRes] = await Promise.all([
    fetch(`${GRAPH_BASE}/${pageId}/published_posts?${new URLSearchParams({ fields, limit: String(limit), access_token: accessToken })}`),
    fetch(`${GRAPH_BASE}/${pageId}/feed?${new URLSearchParams({ fields, limit: String(limit), access_token: accessToken })}`),
    fetch(`${GRAPH_BASE}/${pageId}/videos?${new URLSearchParams({ fields: videoFields, limit: String(limit), access_token: accessToken })}`),
    fetch(`${GRAPH_BASE}/${pageId}/video_reels?${new URLSearchParams({ fields: videoFields, limit: String(limit), access_token: accessToken })}`),
  ]);

  const results: FbPagePost[] = [];
  const seenIds = new Set<string>();

  const addPosts = (data: Record<string, unknown>[], defaultType: string) => {
    for (const post of data) {
      const id = post.id as string;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      results.push(mapPost(post, defaultType));
    }
  };

  if (publishedPostsRes.ok) {
    const d = await publishedPostsRes.json();
    console.log(`[fb] /published_posts count=${d.data?.length ?? 0}`);
    addPosts(d.data ?? [], "status");
  } else {
    console.error(`[fb-error] /published_posts ${publishedPostsRes.status}: ${await publishedPostsRes.text()}`);
  }

  if (postsRes.ok) {
    const d = await postsRes.json();
    console.log(`[fb] /feed count=${d.data?.length ?? 0}`);
    addPosts(d.data ?? [], "status");
  } else {
    const feedErr = await postsRes.text();
    console.error(`[fb-error] /feed ${postsRes.status}: ${feedErr}`);
  }

  if (videosRes.ok) {
    const d = await videosRes.json();
    console.log(`[fb] /videos count=${d.data?.length ?? 0}`);
    addPosts(d.data ?? [], "video");
  } else {
    console.error(`[fb-error] /videos ${videosRes.status}: ${await videosRes.text()}`);
  }

  if (reelsRes.ok) {
    const d = await reelsRes.json();
    console.log(`[fb] /video_reels count=${d.data?.length ?? 0}`);
    addPosts(d.data ?? [], "reel");
  } else {
    console.error(`[fb-error] /video_reels ${reelsRes.status}: ${await reelsRes.text()}`);
  }

  // Sort by createdTime descending
  return results.sort((a, b) => (a.createdTime > b.createdTime ? -1 : 1));
}

// ─────────────────────────────────────────
// POST COUNT MERGING (same pattern as Instagram)
// ─────────────────────────────────────────

/**
 * Merge per-day post counts from posts into daily insight entries.
 * Uses the Facebook `type` field: photo, video, link, status.
 */
export function mergeDailyPostCounts(
  daily: FbDailyPageInsight[],
  posts: { type: string; createdTime: string }[]
): FbDailyPageInsight[] {
  const dayMap = new Map<string, FbDailyPageInsight>();
  for (const d of daily) dayMap.set(d.date, d);

  for (const p of posts) {
    const dateKey = p.createdTime?.slice(0, 10) ?? "";
    const entry = dayMap.get(dateKey);
    if (!entry) continue;

    const type = (p.type ?? "").toLowerCase();
    if (type === "photo") entry.photosPosted++;
    else if (type === "video") entry.videosPosted++;
    else if (type === "link") entry.linksPosted++;
    else entry.statusesPosted++;
  }

  return daily;
}

// ─────────────────────────────────────────
// ENGAGEMENT RATE
// ─────────────────────────────────────────

/**
 * Compute engagement rate from recent posts.
 * Formula: avg(reactions + comments + shares) / followers * 100
 */
export function computeEngagementRate(
  posts: FbPagePost[],
  followerCount: number
): number {
  if (!posts.length || followerCount === 0) return 0;
  const avgInteractions =
    posts.reduce((sum, p) => sum + p.reactions + p.comments + p.shares, 0) /
    posts.length;
  return parseFloat(((avgInteractions / followerCount) * 100).toFixed(2));
}
