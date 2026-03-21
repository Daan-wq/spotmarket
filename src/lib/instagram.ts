/**
 * Meta Graph API client for Instagram Business/Creator accounts.
 * Uses long-lived user access tokens stored encrypted in DB.
 */

const GRAPH_BASE = "https://graph.instagram.com/v21.0";
const META_BASE = "https://api.instagram.com";

export async function getInstagramAuthUrl(state: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
    scope: "instagram_business_basic",
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
  const shortRes = await fetch(`${META_BASE}/oauth/access_token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
      code,
    }),
  });

  if (!shortRes.ok) {
    const err = await shortRes.text();
    throw new Error(`Instagram token exchange failed: ${err}`);
  }

  const shortData = await shortRes.json();

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

  return media.map((item: any) => ({
    mediaId: item.id,
    impressions: 0,
    reach: 0,
    videoViews: 0,
    likeCount: item.like_count ?? 0,
    commentCount: item.comments_count ?? 0,
  }));
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
  const getValue = (name: string) =>
    insightsData.find((d: any) => d.name === name)?.values?.[0]?.value ?? 0;

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
