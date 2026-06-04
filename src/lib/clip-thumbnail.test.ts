import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveThumbnail } from "./clip-thumbnail";

const thumbnailMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  submissionUpdate: vi.fn(),
  fetchRecentMedia: vi.fn(),
  fetchTikTokVideos: vi.fn(),
  withFreshTikTokAccessToken: vi.fn(),
  cacheCreatorMediaThumbnail: vi.fn(),
  cacheInstagramMedia: vi.fn(),
  findCachedInstagramMediaForUrl: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: thumbnailMocks.userFindUnique },
    campaignSubmission: { update: thumbnailMocks.submissionUpdate },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn(() => "decrypted-instagram-token"),
}));

vi.mock("@/lib/instagram", () => ({
  fetchRecentMedia: thumbnailMocks.fetchRecentMedia,
}));

vi.mock("@/lib/tiktok", () => ({
  fetchTikTokVideos: thumbnailMocks.fetchTikTokVideos,
}));

vi.mock("@/lib/token-refresh", () => ({
  withFreshTikTokAccessToken: thumbnailMocks.withFreshTikTokAccessToken,
}));

vi.mock("@/lib/creator-media-cache", () => ({
  cacheCreatorMediaThumbnail: thumbnailMocks.cacheCreatorMediaThumbnail,
  cacheInstagramMedia: thumbnailMocks.cacheInstagramMedia,
  findCachedInstagramMediaForUrl: thumbnailMocks.findCachedInstagramMediaForUrl,
  isExpiringInstagramThumbnailUrl: (url: string | null | undefined) =>
    Boolean(url && new URL(url).hostname.toLowerCase().endsWith("cdninstagram.com")),
}));

describe("resolveThumbnail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    thumbnailMocks.findCachedInstagramMediaForUrl.mockResolvedValue(null);
    thumbnailMocks.withFreshTikTokAccessToken.mockImplementation((
      _conn: unknown,
      operation: (token: string) => unknown,
    ) =>
      operation("fresh-tiktok-token")
    );
  });

  it("replaces a stale TikTok CDN thumbnail with a stable cached thumbnail", async () => {
    thumbnailMocks.userFindUnique.mockResolvedValue({
      creatorProfile: {
        ttConnections: [
          {
            id: "tt-conn-1",
            accessToken: "encrypted-token",
            accessTokenIv: "iv",
            refreshToken: "refresh-token",
            refreshTokenIv: "refresh-iv",
            tokenExpiresAt: new Date("2026-05-20T10:00:00.000Z"),
          },
        ],
      },
    });
    thumbnailMocks.fetchTikTokVideos.mockResolvedValue({
      videos: [
        {
          id: "7123456789012345678",
          title: "Submitted clip",
          coverImageUrl: "https://p16-sign.tiktokcdn-us.com/cover.jpg?x-expires=123",
          shareUrl: "https://www.tiktok.com/@creator/video/7123456789012345678",
          viewCount: 100,
          likeCount: 5,
          commentCount: 1,
          shareCount: 0,
          createTime: 1760000000,
          duration: 15,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    thumbnailMocks.cacheCreatorMediaThumbnail.mockResolvedValue(
      "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/7123456789012345678.jpg",
    );

    const result = await resolveThumbnail(
      "https://www.tiktok.com/@creator/video/7123456789012345678",
      "https://p16-sign.tiktokcdn-us.com/stale.jpg?x-expires=1",
      {
        creatorId: "creator-user-1",
        submissionId: "submission-1",
        storedMediaType: "video",
      },
    );

    expect(result).toEqual({
      thumbnailUrl:
        "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/7123456789012345678.jpg",
      mediaType: "video",
    });
    expect(thumbnailMocks.fetchTikTokVideos).toHaveBeenCalledWith(
      "fresh-tiktok-token",
      20,
      undefined,
    );
    expect(thumbnailMocks.cacheCreatorMediaThumbnail).toHaveBeenCalledWith({
      platform: "tt",
      connectionId: "tt-conn-1",
      mediaId: "7123456789012345678",
      sourceUrl: "https://p16-sign.tiktokcdn-us.com/cover.jpg?x-expires=123",
    });
    expect(thumbnailMocks.submissionUpdate).toHaveBeenCalledWith({
      where: { id: "submission-1" },
      data: {
        thumbnailUrl:
          "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/7123456789012345678.jpg",
        mediaType: "video",
      },
    });
  });
});
