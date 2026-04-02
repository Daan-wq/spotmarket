/**
 * TikHub API client for TikTok video metrics.
 * Commercial API aggregator — no TikTok app review required for MVP.
 */

const TIKHUB_BASE = "https://api.tikhub.io";

interface TikHubResponse {
  data?: unknown;
  [key: string]: unknown;
}

async function tikhubFetch<T extends TikHubResponse>(endpoint: string): Promise<T> {
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
  const data = await tikhubFetch<TikHubResponse>(
    `/api/v1/tiktok/app/v3/fetch_user_post_videos?unique_id=${encodeURIComponent(uniqueId)}&count=${count}`
  );

  const videosData = data?.data as Record<string, unknown> | undefined;
  const videos = (videosData?.videos as Array<Record<string, unknown>>) ?? [];
  return videos.map((v) => ({
    videoId: (v.aweme_id as string) ?? (v.id as string),
    viewCount: ((v.statistics as Record<string, number>)?.play_count as number) ?? 0,
    likeCount: ((v.statistics as Record<string, number>)?.digg_count as number) ?? 0,
    commentCount: ((v.statistics as Record<string, number>)?.comment_count as number) ?? 0,
    shareCount: ((v.statistics as Record<string, number>)?.share_count as number) ?? 0,
  }));
}

export async function getTikTokVideoById(
  videoId: string
): Promise<TikTokVideoStats> {
  const data = await tikhubFetch<TikHubResponse>(
    `/api/v1/tiktok/app/v3/fetch_video_detail?aweme_id=${videoId}`
  );

  const videosData = data?.data as Record<string, unknown> | undefined;
  const v = videosData?.aweme_detail as Record<string, unknown> | undefined;
  return {
    videoId,
    viewCount: ((v?.statistics as Record<string, number>)?.play_count as number) ?? 0,
    likeCount: ((v?.statistics as Record<string, number>)?.digg_count as number) ?? 0,
    commentCount: ((v?.statistics as Record<string, number>)?.comment_count as number) ?? 0,
    shareCount: ((v?.statistics as Record<string, number>)?.share_count as number) ?? 0,
  };
}

export async function getTikTokUserInfo(
  uniqueId: string
): Promise<{ followerCount: number; engagementRate: number }> {
  const data = await tikhubFetch<TikHubResponse>(
    `/api/v1/tiktok/app/v3/fetch_user_info?unique_id=${encodeURIComponent(uniqueId)}`
  );

  const userData = data?.data as Record<string, unknown> | undefined;
  const stats = userData?.stats as Record<string, number> | undefined;

  const followerCount = (stats?.followerCount as number) ?? 0;
  const heartCount = (stats?.heartCount as number) ?? 0;
  const videoCount = (stats?.videoCount as number) ?? 1;

  // Simple engagement estimate: avg hearts per video / followers
  const engagementRate =
    followerCount > 0
      ? parseFloat((((heartCount / videoCount) / followerCount) * 100).toFixed(2))
      : 0;

  return { followerCount, engagementRate };
}
