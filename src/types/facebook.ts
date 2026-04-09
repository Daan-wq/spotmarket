export interface FbPageProfile {
  id: string;
  name: string;
  about: string;
  followerCount: number;
  profilePictureUrl: string;
}

export interface FbPagePost {
  id: string;
  message: string | null;
  type: string; // photo, video, link, status
  permalink: string;
  createdTime: string; // ISO 8601
  reactions: number;
  comments: number;
  shares: number;
}

export interface FbDailyPageInsight {
  date: string; // YYYY-MM-DD
  reach: number | null;
  impressions: number | null;
  followers: number | null;
  // Post counts per day (derived from posts data)
  photosPosted: number;
  videosPosted: number;
  linksPosted: number;
  statusesPosted: number;
}

export interface FbPageInsightsResult {
  daily: FbDailyPageInsight[];
  windowTotals: {
    reach: number;
    impressions: number;
    engagedUsers: number;
    reactions: number;
    comments: number;
    shares: number;
    pageFans: number;
  };
}
