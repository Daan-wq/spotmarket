export interface NormalizedPost {
  id: string;
  platform: "ig" | "tt" | "fb";
  url: string;
  thumbnail: string | null;
  caption: string | null;
  publishedAt: string; // ISO 8601
  likeCount: number | null;
  mediaType: "video" | "image" | "carousel";
}

export interface MediaResponse {
  posts: NormalizedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}
