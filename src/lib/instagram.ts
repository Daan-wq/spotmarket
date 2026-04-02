/**
 * Meta Graph API client for Instagram Business/Creator accounts.
 * Uses long-lived user access tokens stored encrypted in DB.
 */

import type { IgDemographics, IgMediaItem, ComputedCreatorStats } from "@/types/instagram";

// Re-export types for convenience
export type { IgDemographics, IgMediaItem, ComputedCreatorStats };

const GRAPH_BASE = "https://graph.instagram.com/v25.0";
const META_BASE = "https://api.instagram.com";

export async function getInstagramAuthUrl(state: string): Promise<string> {
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI!;
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    scope: "instagram_business_basic,instagram_business_manage_insights",
    response_type: "code",
    state,
  });
  // Must use www.instagram.com for the new Instagram Login product
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ accessToken: string; expiresIn: number }> {
  // Step 1: Short-lived token
  const tokenRedirectUri = process.env.INSTAGRAM_REDIRECT_URI!;
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: tokenRedirectUri,
    code,
  });
  const shortRes = await fetch(`${META_BASE}/oauth/access_token`, {
    method: "POST",
    body,
  });

  const rawResponse = await shortRes.text();

  if (!shortRes.ok) {
    throw new Error(`Instagram token exchange failed: ${rawResponse}`);
  }

  const shortData = JSON.parse(rawResponse);

  // instagram_business_basic returns a long-lived token (60 days) directly.
  // The ig_exchange_token step only applies to the deprecated Basic Display API.
  return {
    accessToken: shortData.access_token,
    expiresIn: shortData.expires_in ?? 5183944, // ~60 days in seconds
  };
}

export async function refreshInstagramToken(
  longLivedToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`,
    { headers: { Authorization: `Bearer ${longLivedToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Instagram token refresh failed: ${await res.text()}`);
  }

  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export interface InstagramProfile {
  id: string;
  name: string;
  username: string;
  followerCount: number;
  mediaCount: number;
  profilePictureUrl: string;
}

export async function getInstagramProfile(
  accessToken: string
): Promise<InstagramProfile> {
  const tokenPrefix = accessToken?.slice(0, 6) ?? "none";

  // Try GET first, then POST (Meta v21 sometimes requires POST for IGAA tokens)
  let res = await fetch(
    `${GRAPH_BASE}/me?fields=id,name,username,followers_count,media_count,profile_picture_url`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const getError = await res.text();
    console.log(`GET failed (${res.status}): ${getError.slice(0, 100)} — trying POST`);
    res = await fetch(`${GRAPH_BASE}/me`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken, fields: "id,name,username,followers_count,media_count,profile_picture_url" }),
    });
  }

  if (!res.ok) {
    throw new Error(`Instagram profile fetch failed [token:${tokenPrefix}]: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name ?? data.username ?? "",
    username: data.username ?? "",
    followerCount: data.followers_count ?? 0,
    mediaCount: data.media_count ?? 0,
    profilePictureUrl: data.profile_picture_url ?? "",
  };
}

export interface MediaInsights {
  mediaId: string;
  impressions: number;
  reach: number;
  videoViews: number;
  likeCount: number;
  commentCount: number;
}

export async function getMediaInsights(
  userId: string,
  accessToken: string,
  limit = 25
): Promise<MediaInsights[]> {
  const res = await fetch(
    `https://api.instagram.com/v21.0/${userId}/media?fields=id,like_count,comments_count&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    // Non-fatal: return empty array so profile connect still succeeds
    console.warn(`Instagram media fetch failed (non-fatal): ${await res.text()}`);
    return [];
  }

  const data = await res.json();
  const media = data.data ?? [];

  return media.map((item: unknown) => {
    const mediaItem = item as Record<string, unknown>;
    return {
      mediaId: mediaItem.id,
      impressions: 0,
      reach: 0,
      videoViews: 0,
      likeCount: (mediaItem.like_count as number | undefined) ?? 0,
      commentCount: (mediaItem.comments_count as number | undefined) ?? 0,
    };
  });
}

export async function getSingleMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<MediaInsights> {
  const res = await fetch(
    `${GRAPH_BASE}/${mediaId}/insights?metric=impressions,reach,video_views`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Instagram single media insights failed: ${await res.text()}`);
  }

  const data = await res.json();
  const insightsData = data.data ?? [];
  const getValue = (name: string) => {
    const item = insightsData.find((d: unknown) => {
      const dataItem = d as Record<string, unknown>;
      return dataItem.name === name;
    }) as Record<string, unknown> | undefined;
    return ((item?.values as Array<Record<string, unknown>> | undefined)?.[0]?.value as number) ?? 0;
  };

  return {
    mediaId,
    impressions: getValue("impressions"),
    reach: getValue("reach"),
    videoViews: getValue("video_views"),
    likeCount: 0,
    commentCount: 0,
  };
}

/**
 * Compute engagement rate from recent posts.
 * Formula: avg(likes + comments) / followers * 100
 */
export function computeEngagementRate(
  insights: MediaInsights[],
  followerCount: number
): number {
  if (!insights.length || followerCount === 0) return 0;
  const avgInteractions =
    insights.reduce((sum, m) => sum + m.likeCount + m.commentCount, 0) /
    insights.length;
  return parseFloat(((avgInteractions / followerCount) * 100).toFixed(2));
}

// ─────────────────────────────────────────
// EXPANDED PROFILE (v25.0)
// ─────────────────────────────────────────

export interface ExpandedInstagramProfile {
  id: string;
  username: string;
  name: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profilePictureUrl: string;
  website: string;
}

export async function fetchInstagramProfile(
  accessToken: string,
  igUserId: string
): Promise<ExpandedInstagramProfile> {
  const fields =
    "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website";
  const res = await fetch(
    `${GRAPH_BASE}/${igUserId}?fields=${fields}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`fetchInstagramProfile failed: ${await res.text()}`);
  const d = await res.json();
  return {
    id: d.id,
    username: d.username ?? "",
    name: d.name ?? "",
    biography: d.biography ?? "",
    followersCount: d.followers_count ?? 0,
    followsCount: d.follows_count ?? 0,
    mediaCount: d.media_count ?? 0,
    profilePictureUrl: d.profile_picture_url ?? "",
    website: d.website ?? "",
  };
}

// ─────────────────────────────────────────
// AUDIENCE DEMOGRAPHICS
// ─────────────────────────────────────────

/**
 * Backward-compat wrapper — returns the legacy IgDemographics JSON.
 * Use fetchDemographicSnapshots() for normalized row storage.
 */
export async function fetchFollowerDemographics(
  accessToken: string,
  igUserId: string
): Promise<IgDemographics> {
  const { legacyJson } = await fetchDemographicSnapshots(igUserId, accessToken);
  return legacyJson;
}

// fetchAccountInsights removed — replaced by fetchAccountDailyInsights (v25.0)

// ─────────────────────────────────────────
// RECENT MEDIA
// ─────────────────────────────────────────

export async function fetchRecentMedia(
  accessToken: string,
  igUserId: string,
  limit = 12
): Promise<IgMediaItem[]> {
  const params = new URLSearchParams({
    fields:
      "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,media_url,thumbnail_url",
    limit: String(limit),
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/media?${params}`);
  if (!res.ok) {
    console.warn(`fetchRecentMedia failed (non-fatal): ${await res.text()}`);
    return [];
  }
  const data = await res.json();
  return (data.data ?? []).map((item: unknown): IgMediaItem => {
    const mediaItem = item as Record<string, unknown>;
    return {
      id: mediaItem.id as string,
      caption: (mediaItem.caption as string | null) ?? null,
      media_type: (mediaItem.media_type as string) ?? "",
      media_product_type: (mediaItem.media_product_type as string) ?? "",
      permalink: (mediaItem.permalink as string) ?? "",
      timestamp: (mediaItem.timestamp as string) ?? "",
      like_count: (mediaItem.like_count as number) ?? 0,
      comments_count: (mediaItem.comments_count as number) ?? 0,
      media_url: (mediaItem.media_url as string | null) ?? null,
      thumbnail_url: (mediaItem.thumbnail_url as string | null) ?? null,
    };
  });
}

// ─────────────────────────────────────────
// DAILY ACCOUNT INSIGHTS (v25.0 — no deprecated metrics)
// ─────────────────────────────────────────

export interface DailyAccountInsight {
  date: string; // YYYY-MM-DD
  reach: number | null;
  views: number | null;
  accountsEngaged: number | null;
  totalInteractions: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reposts: number | null;
  replies: number | null;
  follows: number | null;
  unfollows: number | null;
  profileLinksTaps: number | null;
  tapCall: number | null;
  tapEmail: number | null;
  tapDirection: number | null;
  tapBookNow: number | null;
  tapText: number | null;
  followerCount: number | null;
}

/**
 * Build a map of { dateKey → value } from a period=day API response.
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

/**
 * Build a map of { breakdownValue → count } from a breakdown API response.
 * breakdown_results shape: { dimension_values: [string], value: number }[]
 */
function extractBreakdownTotal(
  data: { name: string; total_value?: { breakdowns?: { dimension_values: string[]; value: number }[] } }[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of data) {
    for (const row of item.total_value?.breakdowns ?? []) {
      const key = row.dimension_values?.[0] ?? "";
      if (key) result[key] = (result[key] ?? 0) + (row.value ?? 0);
    }
  }
  return result;
}

/**
 * Fetch daily account-level insights for the given unix time range (v25.0).
 * Makes three separate calls: core metrics, follows breakdown, profile_links_taps breakdown.
 */
export async function fetchAccountDailyInsights(
  igUserId: string,
  accessToken: string,
  sinceUnix: number,
  untilUnix: number
): Promise<DailyAccountInsight[]> {
  const base = `${GRAPH_BASE}/${igUserId}/insights`;

  // ── Call 1: core daily metrics ──
  const coreParams = new URLSearchParams({
    metric: "reach,views,accounts_engaged,total_interactions,likes,comments,saves,shares,reposts,replies,follower_count",
    period: "day",
    since: String(sinceUnix),
    until: String(untilUnix),
    access_token: accessToken,
  });
  const coreRes = await fetch(`${base}?${coreParams}`);
  if (!coreRes.ok) {
    throw new Error(`fetchAccountDailyInsights (core) failed: ${await coreRes.text()}`);
  }
  const coreData = await coreRes.json();
  const core = extractDayValues((coreData.data ?? []) as { name: string; values: { value: number; end_time: string }[] }[]);

  const dateKeys = Object.keys(core["reach"] ?? core["views"] ?? {}).sort();

  // ── Call 2: follows_and_unfollows breakdown=follow_type (period=day) ──
  // Returns total_value per day is not available; we get per-day breakdown differently.
  // This metric uses period=day but values are aggregated totals.
  // We store totals from the most recent day only (the since→until window is 1 day).
  let follows: number | null = null;
  let unfollows: number | null = null;
  try {
    const followsParams = new URLSearchParams({
      metric: "follows_and_unfollows",
      period: "day",
      breakdown: "follow_type",
      since: String(sinceUnix),
      until: String(untilUnix),
      access_token: accessToken,
    });
    const followsRes = await fetch(`${base}?${followsParams}`);
    if (followsRes.ok) {
      const followsData = await followsRes.json();
      // Response: { data: [{ name: "follows_and_unfollows", total_value: { breakdowns: [{ dimension_values: ["FOLLOW"], value: N }] } }] }
      const breakdown = extractBreakdownTotal(followsData.data ?? []);
      follows = breakdown["FOLLOW"] ?? null;
      unfollows = breakdown["UNFOLLOW"] ?? null;
    }
  } catch {
    // Non-fatal
  }

  // ── Call 3: profile_links_taps breakdown=contact_button_type ──
  let profileLinksTaps: number | null = null;
  let tapCall: number | null = null;
  let tapEmail: number | null = null;
  let tapDirection: number | null = null;
  let tapBookNow: number | null = null;
  let tapText: number | null = null;
  try {
    const tapsParams = new URLSearchParams({
      metric: "profile_links_taps",
      period: "day",
      breakdown: "contact_button_type",
      since: String(sinceUnix),
      until: String(untilUnix),
      access_token: accessToken,
    });
    const tapsRes = await fetch(`${base}?${tapsParams}`);
    if (tapsRes.ok) {
      const tapsData = await tapsRes.json();
      const breakdown = extractBreakdownTotal(tapsData.data ?? []);
      tapCall = breakdown["CALL"] ?? null;
      tapEmail = breakdown["EMAIL"] ?? null;
      tapDirection = breakdown["DIRECTION"] ?? null;
      tapBookNow = breakdown["BOOK_NOW"] ?? null;
      tapText = breakdown["TEXT"] ?? null;
      profileLinksTaps = (tapCall ?? 0) + (tapEmail ?? 0) + (tapDirection ?? 0) + (tapBookNow ?? 0) + (tapText ?? 0) || null;
    }
  } catch {
    // Non-fatal
  }

  // If the window covers one day (sinceUnix→untilUnix), dateKeys may have one entry.
  // Build unified entries — breakdown values are shared across all days in the window.
  if (dateKeys.length === 0) return [];

  return dateKeys.map((dateKey) => ({
    date: dateKey,
    reach: core["reach"]?.[dateKey] ?? null,
    views: core["views"]?.[dateKey] ?? null,
    accountsEngaged: core["accounts_engaged"]?.[dateKey] ?? null,
    totalInteractions: core["total_interactions"]?.[dateKey] ?? null,
    likes: core["likes"]?.[dateKey] ?? null,
    comments: core["comments"]?.[dateKey] ?? null,
    saves: core["saves"]?.[dateKey] ?? null,
    shares: core["shares"]?.[dateKey] ?? null,
    reposts: core["reposts"]?.[dateKey] ?? null,
    replies: core["replies"]?.[dateKey] ?? null,
    followerCount: core["follower_count"]?.[dateKey] ?? null,
    // Breakdown values apply to the full window (not per-day granular)
    follows,
    unfollows,
    profileLinksTaps,
    tapCall,
    tapEmail,
    tapDirection,
    tapBookNow,
    tapText,
  }));
}

// ─────────────────────────────────────────
// PER-MEDIA INSIGHTS (v25.0 — media type aware)
// ─────────────────────────────────────────

export type MediaInsightType = "FEED" | "REEL" | "STORY";

export interface MediaInsightResult {
  // Shared
  reach: number | null;
  views: number | null;
  shares: number | null;
  totalInteractions: number | null;
  // FEED + STORY
  likes: number | null;
  comments: number | null;
  saved: number | null;
  follows: number | null;
  profileVisits: number | null;
  profileActivityBioLink: number | null;
  profileActivityCall: number | null;
  profileActivityDirection: number | null;
  profileActivityEmail: number | null;
  profileActivityText: number | null;
  // REEL only
  avgWatchTime: number | null;
  totalWatchTime: number | null;
  // STORY only
  replies: number | null;
  navigationForward: number | null;
  navigationBack: number | null;
  navigationExit: number | null;
  navigationNextStory: number | null;
}

/**
 * Fetch per-media lifetime insights (v25.0). Media type determines which metrics to request.
 * Do NOT call for CAROUSEL_ALBUM child media — the API returns an error.
 */
export async function fetchMediaInsights(
  igMediaId: string,
  accessToken: string,
  mediaType: MediaInsightType
): Promise<MediaInsightResult> {
  const getValue = (
    data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[],
    name: string
  ): number | null => {
    const item = data.find((d) => d.name === name);
    if (!item) return null;
    // Some metrics return total_value for lifetime, others return values array
    const val = item.total_value?.value ?? item.values?.[0]?.value;
    return val != null ? val : null;
  };

  const getBreakdown = (
    data: { name: string; total_value?: { breakdowns?: { dimension_values: string[]; value: number }[][] } }[],
    name: string,
    breakdownValue: string
  ): number | null => {
    const item = data.find((d) => d.name === name);
    if (!item) return null;
    for (const group of item.total_value?.breakdowns ?? []) {
      for (const row of (group as unknown as { dimension_values: string[]; value: number }[]) ?? []) {
        if (row.dimension_values?.[0] === breakdownValue) return row.value ?? 0;
      }
    }
    return null;
  };

  const empty: MediaInsightResult = {
    reach: null, views: null, shares: null, totalInteractions: null,
    likes: null, comments: null, saved: null, follows: null, profileVisits: null,
    profileActivityBioLink: null, profileActivityCall: null,
    profileActivityDirection: null, profileActivityEmail: null, profileActivityText: null,
    avgWatchTime: null, totalWatchTime: null,
    replies: null, navigationForward: null, navigationBack: null,
    navigationExit: null, navigationNextStory: null,
  };

  try {
    let metricList: string;
    const params: Record<string, string> = {
      period: "lifetime",
      access_token: accessToken,
    };

    if (mediaType === "REEL") {
      metricList = "reach,views,likes,comments,saved,shares,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time";
    } else if (mediaType === "STORY") {
      metricList = "reach,views,shares,replies,total_interactions,follows,profile_visits";
    } else {
      // FEED
      metricList = "reach,views,likes,comments,saved,shares,total_interactions,follows,profile_visits";
    }

    params.metric = metricList;
    const url = `${GRAPH_BASE}/${igMediaId}/insights?${new URLSearchParams(params)}`;
    const res = await fetch(url);
    if (!res.ok) return empty;
    const data = (await res.json()).data ?? [];

    const result: MediaInsightResult = {
      reach: getValue(data, "reach"),
      views: getValue(data, "views"),
      shares: getValue(data, "shares"),
      totalInteractions: getValue(data, "total_interactions"),
      likes: getValue(data, "likes"),
      comments: getValue(data, "comments"),
      saved: getValue(data, "saved"),
      follows: getValue(data, "follows"),
      profileVisits: getValue(data, "profile_visits"),
      avgWatchTime: getValue(data, "ig_reels_avg_watch_time"),
      totalWatchTime: getValue(data, "ig_reels_video_view_total_time"),
      replies: getValue(data, "replies"),
      profileActivityBioLink: null,
      profileActivityCall: null,
      profileActivityDirection: null,
      profileActivityEmail: null,
      profileActivityText: null,
      navigationForward: null,
      navigationBack: null,
      navigationExit: null,
      navigationNextStory: null,
    };

    // profile_activity breakdown (FEED + STORY)
    if (mediaType === "FEED" || mediaType === "STORY") {
      const activityParams = new URLSearchParams({
        metric: "profile_activity",
        period: "lifetime",
        breakdown: "action_type",
        access_token: accessToken,
      });
      const actRes = await fetch(`${GRAPH_BASE}/${igMediaId}/insights?${activityParams}`);
      if (actRes.ok) {
        const actData = (await actRes.json()).data ?? [];
        result.profileActivityBioLink = getBreakdown(actData, "profile_activity", "BIO_LINK_CLICKED");
        result.profileActivityCall = getBreakdown(actData, "profile_activity", "CALL");
        result.profileActivityDirection = getBreakdown(actData, "profile_activity", "DIRECTION");
        result.profileActivityEmail = getBreakdown(actData, "profile_activity", "EMAIL");
        result.profileActivityText = getBreakdown(actData, "profile_activity", "TEXT");
      }
    }

    // navigation breakdown (STORY only)
    if (mediaType === "STORY") {
      const navParams = new URLSearchParams({
        metric: "navigation",
        period: "lifetime",
        breakdown: "story_navigation_action_type",
        access_token: accessToken,
      });
      const navRes = await fetch(`${GRAPH_BASE}/${igMediaId}/insights?${navParams}`);
      if (navRes.ok) {
        const navData = (await navRes.json()).data ?? [];
        result.navigationForward = getBreakdown(navData, "navigation", "TAP_FORWARD");
        result.navigationBack = getBreakdown(navData, "navigation", "TAP_BACK");
        result.navigationExit = getBreakdown(navData, "navigation", "TAP_EXIT");
        result.navigationNextStory = getBreakdown(navData, "navigation", "SWIPE_FORWARD");
      }
    }

    return result;
  } catch {
    return empty;
  }
}

// ─────────────────────────────────────────
// DEMOGRAPHIC SNAPSHOTS (v25.0)
// ─────────────────────────────────────────

export interface DemographicRow {
  demographicType: "FOLLOWER" | "ENGAGED";
  breakdownKey: string; // "age" | "gender" | "country" | "city"
  breakdownValue: string;
  value: number;
}

/**
 * Fetch both follower and engaged audience demographics (4 breakdowns each = 8 API calls).
 * Only available for accounts with 100+ followers.
 * Returns normalized rows for DemographicSnapshot upsert.
 * Also returns legacy IgDemographics JSON for backward-compat cache.
 */
export async function fetchDemographicSnapshots(
  igUserId: string,
  accessToken: string
): Promise<{ rows: DemographicRow[]; legacyJson: IgDemographics }> {
  const base = `${GRAPH_BASE}/${igUserId}/insights`;
  const BREAKDOWNS = ["age", "gender", "country", "city"] as const;
  const TYPES = [
    { metric: "follower_demographics", type: "FOLLOWER" as const },
    { metric: "engaged_audience_demographics", type: "ENGAGED" as const },
  ];

  const rows: DemographicRow[] = [];

  for (const { metric, type } of TYPES) {
    for (const breakdown of BREAKDOWNS) {
      try {
        const params = new URLSearchParams({
          metric,
          period: "lifetime",
          timeframe: "last_30_days",
          metric_type: "total_value",
          breakdown,
          access_token: accessToken,
        });
        const res = await fetch(`${base}?${params}`);
        if (!res.ok) continue;
        const data = await res.json();
        for (const item of (data?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? []) as { dimension_values: string[]; value: number }[]) {
          const breakdownValue = item.dimension_values?.[0];
          if (breakdownValue) {
            rows.push({ demographicType: type, breakdownKey: breakdown, breakdownValue, value: item.value ?? 0 });
          }
        }
      } catch {
        // Non-fatal per breakdown
      }
    }
  }

  // Build legacy IgDemographics from FOLLOWER rows for backward compat
  const followerRows = rows.filter((r) => r.demographicType === "FOLLOWER");
  const countries: Record<string, number> = {};
  const gendersRaw: Record<string, number> = {};
  const agesRaw: Record<string, number> = {};
  const cities: Record<string, number> = {};
  for (const r of followerRows) {
    if (r.breakdownKey === "country") countries[r.breakdownValue] = r.value;
    if (r.breakdownKey === "gender") gendersRaw[r.breakdownValue] = r.value;
    if (r.breakdownKey === "age") agesRaw[r.breakdownValue] = r.value;
    if (r.breakdownKey === "city") cities[r.breakdownValue] = r.value;
  }

  const legacyJson: IgDemographics = {
    countries,
    genders: {
      male: gendersRaw["M"] ?? gendersRaw["male"] ?? 0,
      female: gendersRaw["F"] ?? gendersRaw["female"] ?? 0,
      unknown: gendersRaw["U"] ?? gendersRaw["unknown"] ?? 0,
    },
    ages: {
      "13-17": agesRaw["13-17"] ?? 0,
      "18-24": agesRaw["18-24"] ?? 0,
      "25-34": agesRaw["25-34"] ?? 0,
      "35-44": agesRaw["35-44"] ?? 0,
      "45-54": agesRaw["45-54"] ?? 0,
      "55-64": agesRaw["55-64"] ?? 0,
      "65+": agesRaw["65+"] ?? 0,
    },
    cities,
  };

  return { rows, legacyJson };
}

// ─────────────────────────────────────────
// DEMOGRAPHIC STATS COMPUTATION
// ─────────────────────────────────────────

export function computeDemographicStats(
  demographics: IgDemographics | null
): ComputedCreatorStats {
  if (!demographics) {
    return { topCountry: null, topCountryPercent: null, malePercent: null, age18PlusPercent: null };
  }
  const countries = demographics.countries ?? {};
  const totalCountry = Object.values(countries).reduce((s, v) => s + v, 0);
  const topEntry = Object.entries(countries).sort(([, a], [, b]) => b - a)[0];
  const topCountry = topEntry?.[0] ?? null;
  const topCountryPercent =
    topEntry && totalCountry > 0
      ? parseFloat(((topEntry[1] / totalCountry) * 100).toFixed(1))
      : null;

  const { male = 0, female = 0, unknown = 0 } = demographics.genders ?? {};
  const totalGender = male + female + unknown;
  const malePercent =
    totalGender > 0 ? parseFloat(((male / totalGender) * 100).toFixed(1)) : null;

  const ages = demographics.ages ?? {};
  const total18Plus =
    (ages["18-24"] ?? 0) + (ages["25-34"] ?? 0) + (ages["35-44"] ?? 0) +
    (ages["45-54"] ?? 0) + (ages["55-64"] ?? 0) + (ages["65+"] ?? 0);
  const totalAge = total18Plus + (ages["13-17"] ?? 0);
  const age18PlusPercent =
    totalAge > 0 ? parseFloat(((total18Plus / totalAge) * 100).toFixed(1)) : null;

  return { topCountry, topCountryPercent, malePercent, age18PlusPercent };
}
