export interface YtChannelProfile {
  channelId: string;
  channelName: string;
  description: string;
  profilePictureUrl: string | null;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface YtVideoItem {
  id: string;
  title: string;
  description: string | null;
  publishedAt: string;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

export interface YtDemographics {
  countries: Record<string, number>;
  genders: { male?: number; female?: number; unknown?: number };
  ages: {
    "age13-17"?: number;
    "age18-24"?: number;
    "age25-34"?: number;
    "age35-44"?: number;
    "age45-54"?: number;
    "age55-64"?: number;
    "age65-"?: number;
  };
}

export interface YtDailyAnalytics {
  date: string;
  views: number;
  estimatedMinutesWatched: number;
  subscribersGained: number;
  subscribersLost: number;
  likes: number;
  comments: number;
  shares: number;
  averageViewDuration: number;
}

export interface YtAnalyticsWindow {
  daily: YtDailyAnalytics[];
  totals: {
    views: number;
    estimatedMinutesWatched: number;
    subscribersGained: number;
    subscribersLost: number;
    likes: number;
    comments: number;
    shares: number;
  };
}
