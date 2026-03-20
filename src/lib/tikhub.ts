/**
 * TikHub API client for TikTok video metrics.
 * Commercial API aggregator — no TikTok app review required for MVP.
 */

const TIKHUB_BASE = "https://api.tikhub.io";

async function tikhubFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${TIKHUB_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${process.env.TIKHUB_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TikHub API error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export interface TikTokVideoStats {
  videoId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

export async function getTikTokUserVideos(
  uniqueId: string,
  count = 20
): Promise<TikTokVideoStats[]> {
  const data = await tikhubFetch<any>(
    `/api/v1/tiktok/app/v3/fetch_user_post_videos?unique_id=${encodeURIComponent(uniqueId)}&count=${count}`
  );

  const videos = data?.data?.videos ?? [];
  return videos.map((v: any) => ({
    videoId: v.aweme_id ?? v.id,
    viewCount: v.statistics?.play_count ?? 0,
    likeCount: v.statistics?.digg_count ?? 0,
    commentCount: v.statistics?.comment_count ?? 0,
    shareCount: v.statistics?.share_count ?? 0,
  }));
}

export async function getTikTokVideoById(
  videoId: string
): Promise<TikTokVideoStats> {
  const data = await tikhubFetch<any>(
    `/api/v1/tiktok/app/v3/fetch_video_detail?aweme_id=${videoId}`
  );

  const v = data?.data?.aweme_detail;
  return {
    videoId,
    viewCount: v?.statistics?.play_count ?? 0,
    likeCount: v?.statistics?.digg_count ?? 0,
    commentCount: v?.statistics?.comment_count ?? 0,
    shareCount: v?.statistics?.share_count ?? 0,
  };
}

export async function getTikTokUserInfo(
  uniqueId: string
): Promise<{ followerCount: number; engagementRate: number }> {
  const data = await tikhubFetch<any>(
    `/api/v1/tiktok/app/v3/fetch_user_info?unique_id=${encodeURIComponent(uniqueId)}`
  );

  const user = data?.data?.user;
  const stats = data?.data?.stats;

  const followerCount = stats?.followerCount ?? 0;
  const heartCount = stats?.heartCount ?? 0;
  const videoCount = stats?.videoCount ?? 1;

  // Simple engagement estimate: avg hearts per video / followers
  const engagementRate =
    followerCount > 0
      ? parseFloat((((heartCount / videoCount) / followerCount) * 100).toFixed(2))
      : 0;

  return { followerCount, engagementRate };
}
