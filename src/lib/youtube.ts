/**
 * YouTube Data API v3 + YouTube Analytics API client.
 * Uses Google OAuth tokens stored encrypted in DB.
 */

import type {
  YtChannelProfile,
  YtVideoItem,
  YtDemographics,
  YtAnalyticsWindow,
  YtDailyAnalytics,
} from "@/types/youtube";

export type { YtChannelProfile, YtVideoItem, YtDemographics, YtAnalyticsWindow, YtDailyAnalytics };

const YT_DATA_BASE = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2";
const OAUTH_BASE = "https://oauth2.googleapis.com";

// ─── OAuth ──────────────────────────────────────────────────────────

export function getYoutubeAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

export async function refreshYoutubeToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube token refresh failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

// ─── Channel profile ────────────────────────────────────────────────

export async function fetchChannelProfile(
  accessToken: string
): Promise<YtChannelProfile> {
  const params = new URLSearchParams({
    part: "snippet,statistics",
    mine: "true",
  });

  const res = await fetch(`${YT_DATA_BASE}/channels?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube channels.list failed: ${err}`);
  }

  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) throw new Error("No YouTube channel found for this account");

  return {
    channelId: channel.id,
    channelName: channel.snippet.title,
    description: channel.snippet.description ?? "",
    profilePictureUrl: channel.snippet.thumbnails?.medium?.url ?? null,
    subscriberCount: parseInt(channel.statistics.subscriberCount ?? "0"),
    videoCount: parseInt(channel.statistics.videoCount ?? "0"),
    viewCount: parseInt(channel.statistics.viewCount ?? "0"),
  };
}

// ─── Recent Shorts ──────────────────────────────────────────────────

/**
 * Fetch recent Shorts using the channel's uploads playlist + filtering by duration.
 * This avoids the expensive search endpoint (100 quota units vs 1 for playlistItems).
 */
export async function fetchRecentShorts(
  accessToken: string,
  channelId: string,
  limit: number = 50
): Promise<YtVideoItem[]> {
  // Step 1: Get uploads playlist ID
  const channelRes = await fetch(
    `${YT_DATA_BASE}/channels?${new URLSearchParams({
      part: "contentDetails",
      id: channelId,
    })}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!channelRes.ok) throw new Error("Failed to fetch channel details");
  const channelData = await channelRes.json();
  const uploadsPlaylistId =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Step 2: Get recent uploads (fetch more than limit to account for non-Shorts)
  const fetchCount = Math.min(limit * 3, 150);
  let videoIds: string[] = [];
  let pageToken: string | undefined;

  while (videoIds.length < fetchCount) {
    const plParams = new URLSearchParams({
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    });
    if (pageToken) plParams.set("pageToken", pageToken);

    const plRes = await fetch(`${YT_DATA_BASE}/playlistItems?${plParams}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!plRes.ok) break;

    const plData = await plRes.json();
    const ids = (plData.items ?? []).map(
      (item: { contentDetails: { videoId: string } }) => item.contentDetails.videoId
    );
    videoIds = videoIds.concat(ids);
    pageToken = plData.nextPageToken;
    if (!pageToken) break;
  }

  if (videoIds.length === 0) return [];

  // Step 3: Get video details in batches of 50
  const shorts: YtVideoItem[] = [];

  for (let i = 0; i < videoIds.length && shorts.length < limit; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const vidRes = await fetch(
      `${YT_DATA_BASE}/videos?${new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: batch.join(","),
      })}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!vidRes.ok) continue;

    const vidData = await vidRes.json();
    for (const video of vidData.items ?? []) {
      // Filter Shorts: duration <= 60 seconds
      const duration = parseDuration(video.contentDetails.duration);
      if (duration > 60) continue;

      shorts.push({
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description ?? null,
        publishedAt: video.snippet.publishedAt,
        thumbnailUrl:
          video.snippet.thumbnails?.medium?.url ??
          video.snippet.thumbnails?.default?.url ??
          null,
        viewCount: parseInt(video.statistics.viewCount ?? "0"),
        likeCount: parseInt(video.statistics.likeCount ?? "0"),
        commentCount: parseInt(video.statistics.commentCount ?? "0"),
        duration: video.contentDetails.duration,
      });

      if (shorts.length >= limit) break;
    }
  }

  return shorts;
}

/** Parse ISO 8601 duration (PT1M30S) to seconds */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

// ─── Channel Analytics (YouTube Analytics API) ──────────────────────

export async function fetchChannelAnalytics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
): Promise<YtAnalyticsWindow> {
  const params = new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics:
      "views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares,averageViewDuration",
    dimensions: "day",
    sort: "day",
  });

  const res = await fetch(`${YT_ANALYTICS_BASE}/reports?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube Analytics reports failed: ${err}`);
  }

  const data = await res.json();
  const rows: unknown[][] = data.rows ?? [];

  const daily: YtDailyAnalytics[] = rows.map((row) => ({
    date: row[0] as string,
    views: (row[1] as number) ?? 0,
    estimatedMinutesWatched: (row[2] as number) ?? 0,
    subscribersGained: (row[3] as number) ?? 0,
    subscribersLost: (row[4] as number) ?? 0,
    likes: (row[5] as number) ?? 0,
    comments: (row[6] as number) ?? 0,
    shares: (row[7] as number) ?? 0,
    averageViewDuration: (row[8] as number) ?? 0,
  }));

  const totals = daily.reduce(
    (acc, d) => ({
      views: acc.views + d.views,
      estimatedMinutesWatched:
        acc.estimatedMinutesWatched + d.estimatedMinutesWatched,
      subscribersGained: acc.subscribersGained + d.subscribersGained,
      subscribersLost: acc.subscribersLost + d.subscribersLost,
      likes: acc.likes + d.likes,
      comments: acc.comments + d.comments,
      shares: acc.shares + d.shares,
    }),
    {
      views: 0,
      estimatedMinutesWatched: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    }
  );

  return { daily, totals };
}

// ─── Demographics ───────────────────────────────────────────────────

export async function fetchVideoDemographics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
): Promise<YtDemographics> {
  const demographics: YtDemographics = {
    countries: {},
    genders: {},
    ages: {},
  };

  // Country breakdown
  try {
    const countryRes = await fetch(
      `${YT_ANALYTICS_BASE}/reports?${new URLSearchParams({
        ids: `channel==${channelId}`,
        startDate,
        endDate,
        metrics: "views",
        dimensions: "country",
        sort: "-views",
        maxResults: "25",
      })}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (countryRes.ok) {
      const countryData = await countryRes.json();
      const rows: [string, number][] = countryData.rows ?? [];
      const totalViews = rows.reduce((s, r) => s + r[1], 0);
      if (totalViews > 0) {
        for (const [country, views] of rows) {
          demographics.countries[country] = Math.round((views / totalViews) * 100);
        }
      }
    }
  } catch {
    // Non-fatal
  }

  // Age + gender breakdown
  try {
    const ageGenderRes = await fetch(
      `${YT_ANALYTICS_BASE}/reports?${new URLSearchParams({
        ids: `channel==${channelId}`,
        startDate,
        endDate,
        metrics: "viewerPercentage",
        dimensions: "ageGroup,gender",
      })}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (ageGenderRes.ok) {
      const agData = await ageGenderRes.json();
      const rows: [string, string, number][] = agData.rows ?? [];

      let maleTotal = 0;
      let femaleTotal = 0;
      const ageMap: Record<string, number> = {};

      for (const [ageGroup, gender, pct] of rows) {
        // Accumulate gender totals
        if (gender === "male") maleTotal += pct;
        else if (gender === "female") femaleTotal += pct;

        // Accumulate age totals
        ageMap[ageGroup] = (ageMap[ageGroup] ?? 0) + pct;
      }

      const genderTotal = maleTotal + femaleTotal;
      if (genderTotal > 0) {
        demographics.genders.male = Math.round((maleTotal / genderTotal) * 100);
        demographics.genders.female = Math.round((femaleTotal / genderTotal) * 100);
      }

      for (const [age, pct] of Object.entries(ageMap)) {
        const key = age as keyof YtDemographics["ages"];
        if (key in demographics.ages || age.startsWith("age")) {
          demographics.ages[key] = Math.round(pct);
        }
      }
    }
  } catch {
    // Non-fatal
  }

  return demographics;
}

// ─── Helpers ────────────────────────────────────────────────────────

export function computeEngagementRate(
  videos: YtVideoItem[],
  subscriberCount: number
): string {
  if (subscriberCount === 0 || videos.length === 0) return "0.00";
  const totalEngagement = videos.reduce(
    (s, v) => s + v.likeCount + v.commentCount,
    0
  );
  const avgEngagement = totalEngagement / videos.length;
  return ((avgEngagement / subscriberCount) * 100).toFixed(2);
}

export function formatWatchTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${Math.round(minutes)}m`;
}
