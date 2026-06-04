import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  userFindUnique: vi.fn(),
  igFindFirst: vi.fn(),
  ttFindFirst: vi.fn(),
  ytFindFirst: vi.fn(),
  fbFindFirst: vi.fn(),
  withFreshTikTokAccessToken: vi.fn(),
  withFreshInstagramAccessToken: vi.fn(),
  withFreshYoutubeAccessToken: vi.fn(),
  fetchRecentMedia: vi.fn(),
  fetchTikTokVideos: vi.fn(),
  fetchFacebookPagePostsPaginated: vi.fn(),
  fetchRecentYoutubeVideos: vi.fn(),
  readCachedCreatorMedia: vi.fn(),
  cacheInstagramMedia: vi.fn(),
  cacheCreatorMediaThumbnail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    creatorIgConnection: { findFirst: routeMocks.igFindFirst },
    creatorTikTokConnection: { findFirst: routeMocks.ttFindFirst },
    creatorYtConnection: { findFirst: routeMocks.ytFindFirst },
    creatorFbConnection: { findFirst: routeMocks.fbFindFirst },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn(() => "decrypted-token"),
}));

vi.mock("@/lib/token-refresh", () => ({
  isYoutubeInvalidTokenError: (err: unknown) =>
    /invalid_token|invalid credentials|401|403/i.test(err instanceof Error ? err.message : String(err)),
  isTikTokInvalidTokenError: (err: unknown) =>
    /access_token_invalid|access_token_expired/i.test(err instanceof Error ? err.message : String(err)),
  withFreshTikTokAccessToken: routeMocks.withFreshTikTokAccessToken,
  withFreshInstagramAccessToken: routeMocks.withFreshInstagramAccessToken,
  withFreshYoutubeAccessToken: routeMocks.withFreshYoutubeAccessToken,
}));

vi.mock("@/lib/instagram", () => ({
  fetchRecentMedia: routeMocks.fetchRecentMedia,
  isInstagramInvalidTokenError: (err: unknown) =>
    /OAuthException|access token|invalid token|expired/i.test(err instanceof Error ? err.message : String(err)),
}));

vi.mock("@/lib/tiktok", () => ({
  fetchTikTokVideos: routeMocks.fetchTikTokVideos,
}));

vi.mock("@/lib/facebook", () => ({
  fetchFacebookPagePostsPaginated: routeMocks.fetchFacebookPagePostsPaginated,
  isFacebookInvalidTokenError: (err: unknown) =>
    /OAuthException|access token|invalid token|expired/i.test(err instanceof Error ? err.message : String(err)),
}));

vi.mock("@/lib/youtube", () => ({
  fetchRecentYoutubeVideos: routeMocks.fetchRecentYoutubeVideos,
}));

vi.mock("@/lib/creator-media-cache", () => ({
  readCachedCreatorMedia: routeMocks.readCachedCreatorMedia,
  cacheInstagramMedia: routeMocks.cacheInstagramMedia,
  cacheCreatorMediaThumbnail: routeMocks.cacheCreatorMediaThumbnail,
}));

function request(path: string): NextRequest {
  return new NextRequest(`https://app.test${path}`);
}

describe("GET /api/creator/media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "creator-supabase-1" });
    routeMocks.userFindUnique.mockResolvedValue({
      creatorProfile: { id: "creator-profile-1" },
    });
    routeMocks.readCachedCreatorMedia.mockResolvedValue(null);
    routeMocks.withFreshTikTokAccessToken.mockImplementation((
      _conn: unknown,
      operation: (token: string) => unknown,
    ) =>
      operation("fresh-tiktok-token")
    );
    routeMocks.withFreshInstagramAccessToken.mockImplementation((
      _conn: unknown,
      operation: (token: string) => unknown,
    ) => operation("fresh-instagram-token"));
    routeMocks.withFreshYoutubeAccessToken.mockImplementation((
      _conn: unknown,
      operation: (token: string) => unknown,
    ) => operation("fresh-youtube-token"));
    routeMocks.cacheInstagramMedia.mockImplementation(({ media }: { media: Array<{
      id: string;
      permalink: string;
      thumbnail_url?: string | null;
      media_url?: string | null;
      caption?: string | null;
      timestamp: string;
      like_count?: number | null;
      comments_count?: number | null;
    }> }) =>
      Promise.resolve(
        media.map((m) => ({
          id: m.id,
          platform: "ig",
          url: m.permalink,
          thumbnail: m.thumbnail_url ?? m.media_url ?? null,
          caption: m.caption ?? null,
          publishedAt: m.timestamp,
          likeCount: m.like_count ?? null,
          commentCount: m.comments_count ?? null,
          mediaType: "image",
        }))
      )
    );
    routeMocks.cacheCreatorMediaThumbnail.mockResolvedValue(null);
  });

  it("returns creator-safe copy when a platform request has no connection id", async () => {
    const response = await GET(request("/api/creator/media?platform=tt"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Connect your TikTok account to load posts.",
    });
    expect(routeMocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported platforms", async () => {
    const response = await GET(
      request("/api/creator/media?platform=linkedin&connectionId=conn-1")
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid platform" });
    expect(routeMocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("returns fresh cached Instagram media without calling the platform API", async () => {
    routeMocks.igFindFirst.mockResolvedValue({
      id: "ig-conn-1",
      igUserId: "ig-user-1",
      accessToken: "encrypted",
      accessTokenIv: "iv",
      tokenExpiresAt: null,
    });
    routeMocks.readCachedCreatorMedia.mockResolvedValue({
      posts: [
        {
          id: "ig-media-1",
          platform: "ig",
          url: "https://www.instagram.com/p/CACHE1/",
          thumbnail: "https://project.supabase.co/storage/v1/object/public/creator-media-cache/ig/conn/media.jpg",
          caption: "Cached post",
          publishedAt: "2026-05-15T12:00:00.000Z",
          likeCount: 12,
          commentCount: 3,
          mediaType: "image",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const response = await GET(
      request("/api/creator/media?platform=ig&connectionId=ig-conn-1&limit=10")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      posts: [
        {
          id: "ig-media-1",
          platform: "ig",
          url: "https://www.instagram.com/p/CACHE1/",
          thumbnail: "https://project.supabase.co/storage/v1/object/public/creator-media-cache/ig/conn/media.jpg",
          caption: "Cached post",
          publishedAt: "2026-05-15T12:00:00.000Z",
          likeCount: 12,
          commentCount: 3,
          mediaType: "image",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    expect(routeMocks.igFindFirst).toHaveBeenCalledWith({
      where: { id: "ig-conn-1", creatorProfileId: "creator-profile-1", isVerified: true },
      select: { id: true, igUserId: true, accessToken: true, accessTokenIv: true, tokenExpiresAt: true },
    });
    expect(routeMocks.fetchRecentMedia).not.toHaveBeenCalled();
  });

  it("bypasses the Instagram media cache when refresh is requested", async () => {
    routeMocks.igFindFirst.mockResolvedValue({
      id: "ig-conn-1",
      igUserId: "ig-user-1",
      accessToken: "encrypted",
      accessTokenIv: "iv",
      tokenExpiresAt: null,
    });
    routeMocks.fetchRecentMedia.mockResolvedValue({
      media: [
        {
          id: "ig-live-1",
          permalink: "https://www.instagram.com/p/LIVE1/",
          thumbnail_url: "https://scontent.cdninstagram.com/live.jpg",
          media_url: null,
          caption: "Live post",
          timestamp: "2026-05-16T12:00:00.000Z",
          like_count: 4,
          comments_count: 1,
          media_type: "IMAGE",
          media_product_type: "FEED",
        },
      ],
      nextCursor: null,
    });

    const response = await GET(
      request("/api/creator/media?platform=ig&connectionId=ig-conn-1&limit=10&refresh=1")
    );

    expect(response.status).toBe(200);
    expect(routeMocks.readCachedCreatorMedia).not.toHaveBeenCalled();
    expect(routeMocks.fetchRecentMedia).toHaveBeenCalledWith(
      "fresh-instagram-token",
      "ig-user-1",
      10,
      undefined
    );
    expect(routeMocks.cacheInstagramMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: "ig-conn-1",
        hasMore: false,
      })
    );
  });

  it("maps YouTube uploads into normalized submit posts", async () => {
    routeMocks.ytFindFirst.mockResolvedValue({
      id: "yt-conn-1",
      channelId: "UC_test",
      accessToken: "encrypted",
      accessTokenIv: "iv",
      refreshToken: "refresh",
      refreshTokenIv: "refresh-iv",
      tokenExpiresAt: new Date("2026-05-16T10:00:00.000Z"),
    });
    routeMocks.fetchRecentYoutubeVideos.mockResolvedValue([
      {
        id: "short_1",
        title: "Short one",
        description: null,
        publishedAt: "2026-05-15T12:00:00.000Z",
        thumbnailUrl: "https://img.test/short.jpg",
        viewCount: 100,
        likeCount: 10,
        commentCount: 2,
        duration: "PT45S",
      },
      {
        id: "video_1",
        title: "Long video",
        description: "Fallback description",
        publishedAt: "2026-05-14T12:00:00.000Z",
        thumbnailUrl: "https://img.test/video.jpg",
        viewCount: 200,
        likeCount: 20,
        commentCount: 4,
        duration: "PT2M10S",
      },
    ]);

    const response = await GET(
      request("/api/creator/media?platform=yt&connectionId=yt-conn-1&limit=2")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      posts: [
        {
          id: "short_1",
          platform: "yt",
          url: "https://www.youtube.com/shorts/short_1",
          thumbnail: "https://img.test/short.jpg",
          caption: "Short one",
          publishedAt: "2026-05-15T12:00:00.000Z",
          likeCount: 10,
          commentCount: 2,
          mediaType: "video",
        },
        {
          id: "video_1",
          platform: "yt",
          url: "https://www.youtube.com/watch?v=video_1",
          thumbnail: "https://img.test/video.jpg",
          caption: "Long video",
          publishedAt: "2026-05-14T12:00:00.000Z",
          likeCount: 20,
          commentCount: 4,
          mediaType: "video",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    expect(routeMocks.withFreshYoutubeAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: "yt-conn-1", channelId: "UC_test" }),
      expect.any(Function),
    );
    expect(routeMocks.fetchRecentYoutubeVideos).toHaveBeenCalledWith(
      "fresh-youtube-token",
      "UC_test",
      2
    );
  });

  it("returns stable cached TikTok thumbnails instead of raw TikTok CDN covers", async () => {
    routeMocks.ttFindFirst.mockResolvedValue({
      id: "tt-conn-1",
      accessToken: "encrypted",
      accessTokenIv: "iv",
      refreshToken: "refresh",
      refreshTokenIv: "refresh-iv",
      tokenExpiresAt: new Date("2026-05-16T10:00:00.000Z"),
    });
    routeMocks.fetchTikTokVideos.mockResolvedValue({
      videos: [
        {
          id: "7123456789012345678",
          title: "TikTok clip",
          coverImageUrl: "https://p16-sign.tiktokcdn-us.com/cover.jpg?x-expires=123",
          shareUrl: "https://www.tiktok.com/@creator/video/7123456789012345678",
          viewCount: 100,
          likeCount: 10,
          commentCount: 2,
          shareCount: 1,
          createTime: 1760000000,
          duration: 15,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    routeMocks.cacheCreatorMediaThumbnail.mockResolvedValue(
      "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/7123456789012345678.jpg",
    );

    const response = await GET(
      request("/api/creator/media?platform=tt&connectionId=tt-conn-1&limit=1")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      posts: [
        {
          id: "7123456789012345678",
          platform: "tt",
          url: "https://www.tiktok.com/@creator/video/7123456789012345678",
          thumbnail:
            "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/7123456789012345678.jpg",
          caption: "TikTok clip",
          publishedAt: new Date(1760000000 * 1000).toISOString(),
          likeCount: 10,
          commentCount: 2,
          mediaType: "video",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    expect(routeMocks.cacheCreatorMediaThumbnail).toHaveBeenCalledWith({
      platform: "tt",
      connectionId: "tt-conn-1",
      mediaId: "7123456789012345678",
      sourceUrl: "https://p16-sign.tiktokcdn-us.com/cover.jpg?x-expires=123",
    });
  });
});
