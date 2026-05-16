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
  getFreshTikTokAccessToken: vi.fn(),
  forceRefreshTikTokAccessToken: vi.fn(),
  getFreshYoutubeAccessToken: vi.fn(),
  fetchRecentMedia: vi.fn(),
  fetchTikTokVideos: vi.fn(),
  fetchFacebookPagePostsPaginated: vi.fn(),
  fetchRecentYoutubeVideos: vi.fn(),
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
  getFreshTikTokAccessToken: routeMocks.getFreshTikTokAccessToken,
  forceRefreshTikTokAccessToken: routeMocks.forceRefreshTikTokAccessToken,
  getFreshYoutubeAccessToken: routeMocks.getFreshYoutubeAccessToken,
}));

vi.mock("@/lib/instagram", () => ({
  fetchRecentMedia: routeMocks.fetchRecentMedia,
}));

vi.mock("@/lib/tiktok", () => ({
  fetchTikTokVideos: routeMocks.fetchTikTokVideos,
}));

vi.mock("@/lib/facebook", () => ({
  fetchFacebookPagePostsPaginated: routeMocks.fetchFacebookPagePostsPaginated,
}));

vi.mock("@/lib/youtube", () => ({
  fetchRecentYoutubeVideos: routeMocks.fetchRecentYoutubeVideos,
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
    routeMocks.getFreshYoutubeAccessToken.mockResolvedValue("fresh-youtube-token");
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
    expect(routeMocks.getFreshYoutubeAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: "yt-conn-1", channelId: "UC_test" })
    );
    expect(routeMocks.fetchRecentYoutubeVideos).toHaveBeenCalledWith(
      "fresh-youtube-token",
      "UC_test",
      2
    );
  });
});
