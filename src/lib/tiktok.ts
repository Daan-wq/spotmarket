/**
 * TikTok Login Kit OAuth client.
 * Uses TikTok v2 API with encrypted tokens stored in DB.
 */

const TIKTOK_OAUTH_BASE = "https://open.tiktokapis.com/v2/oauth";
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

// ─── OAuth ──────────────────────────────────────────────────────────

export const REQUIRED_TT_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
] as const;

export function getTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    response_type: "code",
    scope: REQUIRED_TT_SCOPES.join(","),
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  openId: string;
  grantedScopes: string[];
}> {
  const res = await fetch(`${TIKTOK_OAUTH_BASE}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok token exchange failed: ${err}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`TikTok token exchange error: ${data.error_description ?? data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 86400,
    openId: data.open_id,
    grantedScopes: typeof data.scope === "string" ? data.scope.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
  };
}

export async function refreshTikTokToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const res = await fetch(`${TIKTOK_OAUTH_BASE}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok token refresh failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 86400,
  };
}

// ─── User profile ────────────────────────────────────────────────────

export interface TikTokProfile {
  openId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number | null;
  followingCount: number | null;
  likesCount: number | null;
  videoCount: number | null;
  isVerified: boolean;
}

export interface TikTokVideo {
  id: string;
  title: string;
  coverImageUrl: string | null;
  shareUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: number;
  duration: number;
}

export async function fetchTikTokProfile(
  accessToken: string
): Promise<TikTokProfile> {
  const fields = "open_id,union_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count,is_verified";
  const res = await fetch(`${TIKTOK_API_BASE}/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok user info fetch failed: ${err}`);
  }

  const data = await res.json();
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok user info error: ${data.error.message}`);
  }

  const user = data.data?.user;
  if (!user) throw new Error("No TikTok user data returned");

  return {
    openId: user.open_id,
    username: user.username ?? user.display_name ?? user.open_id,
    displayName: user.display_name ?? user.username ?? user.open_id,
    avatarUrl: user.avatar_url ?? null,
    followerCount: user.follower_count ?? null,
    followingCount: user.following_count ?? null,
    likesCount: user.likes_count ?? null,
    videoCount: user.video_count ?? null,
    isVerified: user.is_verified ?? false,
  };
}

// ─── Business API: audience demographics ─────────────────────────────
//
// Demographics are NOT in the Login Kit scopes (user.info.*, video.list).
// They come from a separate product: TikTok Business API, requiring:
//   1. Separate product approval in the Developer Portal
//   2. Scope `business.get` (or equivalent for the product version)
//   3. The connected TikTok account must be a Business Account
//
// Gated behind TIKTOK_BUSINESS_API=true so the code path is dormant until
// approval lands. When enabled, an empty/non-Business account falls back
// to the "not available" UI state — same shape as FB/YT demographics.

export interface TikTokDemographics {
  countries: Record<string, number>; // ISO → percent
  genders: { male?: number; female?: number };
  ages: Record<string, number>; // bucket ("18-24" etc) → percent
}

const EMPTY_DEMOGRAPHICS: TikTokDemographics = {
  countries: {},
  genders: {},
  ages: {},
};

interface TikTokBusinessAudienceRow {
  dimension: string;
  value: number;
}

function aggregatePercent(rows: TikTokBusinessAudienceRow[]): Record<string, number> {
  const total = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  if (total === 0) return {};
  const out: Record<string, number> = {};
  for (const { dimension, value } of rows) {
    out[dimension] = Math.round(((value ?? 0) / total) * 100);
  }
  return out;
}

/**
 * Fetch audience demographics via TikTok Business API.
 * Returns empty demographics when:
 *   - TIKTOK_BUSINESS_API flag is off (awaiting approval)
 *   - The user's account is not a Business Account
 *   - The API call fails for any other reason (non-fatal)
 */
export async function fetchTikTokDemographics(
  accessToken: string,
  businessId: string
): Promise<TikTokDemographics> {
  if (process.env.TIKTOK_BUSINESS_API !== "true") return EMPTY_DEMOGRAPHICS;

  const demographics: TikTokDemographics = { countries: {}, genders: {}, ages: {} };

  const fetchDimension = async (metric: string, dimension: string): Promise<TikTokBusinessAudienceRow[]> => {
    const url = `${TIKTOK_API_BASE}/business/creator/audience/?business_id=${encodeURIComponent(businessId)}&metric=${metric}&dimension=${dimension}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data?.rows ?? []) as TikTokBusinessAudienceRow[];
    } catch {
      return [];
    }
  };

  const [countryRows, genderRows, ageRows] = await Promise.all([
    fetchDimension("audience_count", "country"),
    fetchDimension("audience_count", "gender"),
    fetchDimension("audience_count", "age"),
  ]);

  demographics.countries = aggregatePercent(countryRows);

  const genderMap = aggregatePercent(genderRows);
  demographics.genders.male = genderMap["MALE"] ?? genderMap["male"];
  demographics.genders.female = genderMap["FEMALE"] ?? genderMap["female"];

  demographics.ages = aggregatePercent(ageRows);

  return demographics;
}

// ─── Daily aggregates (derived from video list) ──────────────────────

export interface TikTokDailyInsight {
  date: string; // YYYY-MM-DD
  videosPosted: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/**
 * TikTok's open API v2 does not expose a creator daily-insights endpoint
 * (that lives behind the Research API). So we build a per-day aggregate
 * from the recent-videos feed — posted count + summed engagement by day.
 * Covers the last 30 days of activity.
 */
export function computeTikTokDailyInsights(
  videos: TikTokVideo[],
  windowDays = 30
): TikTokDailyInsight[] {
  const map = new Map<string, TikTokDailyInsight>();
  const now = new Date();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(now.getTime() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, videosPosted: 0, views: 0, likes: 0, comments: 0, shares: 0 });
  }

  for (const v of videos) {
    if (!v.createTime) continue;
    const key = new Date(v.createTime * 1000).toISOString().slice(0, 10);
    const entry = map.get(key);
    if (!entry) continue;
    entry.videosPosted += 1;
    entry.views += v.viewCount;
    entry.likes += v.likeCount;
    entry.comments += v.commentCount;
    entry.shares += v.shareCount;
  }

  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ─── Video list ──────────────────────────────────────────────────────

export async function fetchTikTokVideos(
  accessToken: string,
  maxCount = 20,
  cursor?: number
): Promise<{ videos: TikTokVideo[]; nextCursor: number | null; hasMore: boolean }> {
  const fields = "id,title,cover_image_url,share_url,view_count,like_count,comment_count,share_count,create_time,duration";
  const body: Record<string, unknown> = { max_count: maxCount };
  if (cursor !== undefined) body.cursor = cursor;
  const res = await fetch(`${TIKTOK_API_BASE}/video/list/?fields=${fields}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok video list fetch failed: ${err}`);
  }

  const data = await res.json();
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok video list error: ${data.error.message}`);
  }

  const videos: TikTokVideo[] = (data.data?.videos ?? []).map((v: Record<string, unknown>) => ({
    id: v.id as string,
    title: (v.title as string) ?? "",
    coverImageUrl: (v.cover_image_url as string) ?? null,
    shareUrl: (v.share_url as string) ?? null,
    viewCount: (v.view_count as number) ?? 0,
    likeCount: (v.like_count as number) ?? 0,
    commentCount: (v.comment_count as number) ?? 0,
    shareCount: (v.share_count as number) ?? 0,
    createTime: (v.create_time as number) ?? 0,
    duration: (v.duration as number) ?? 0,
  }));

  const hasMore = data.data?.has_more === true;
  const nextCursor = hasMore ? (data.data?.cursor ?? null) : null;

  return { videos, nextCursor, hasMore };
}
