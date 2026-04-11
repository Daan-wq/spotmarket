/**
 * TikTok Login Kit OAuth client.
 * Uses TikTok v2 API with encrypted tokens stored in DB.
 */

const TIKTOK_OAUTH_BASE = "https://open.tiktokapis.com/v2/oauth";
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

// ─── OAuth ──────────────────────────────────────────────────────────

export function getTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    response_type: "code",
    scope: "user.info.basic,user.info.profile,user.info.stats,video.list",
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  openId: string;
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

// ─── Video list ──────────────────────────────────────────────────────

export async function fetchTikTokVideos(
  accessToken: string,
  maxCount = 20
): Promise<TikTokVideo[]> {
  const fields = "id,title,cover_image_url,share_url,view_count,like_count,comment_count,share_count,create_time,duration";
  const res = await fetch(`${TIKTOK_API_BASE}/video/list/?fields=${fields}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_count: maxCount }),
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

  return videos;
}
