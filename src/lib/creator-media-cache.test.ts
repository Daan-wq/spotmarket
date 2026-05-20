import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheCreatorMediaThumbnail,
  cacheInstagramMedia,
  readCachedCreatorMedia,
} from "./creator-media-cache";

const cacheMocks = vi.hoisted(() => ({
  mediaFindMany: vi.fn(),
  mediaUpsert: vi.fn(),
  stateFindUnique: vi.fn(),
  stateUpsert: vi.fn(),
  uploadCreatorMediaCacheImage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creatorMediaCache: {
      findMany: cacheMocks.mediaFindMany,
      upsert: cacheMocks.mediaUpsert,
    },
    creatorMediaCacheState: {
      findUnique: cacheMocks.stateFindUnique,
      upsert: cacheMocks.stateUpsert,
    },
  },
}));

vi.mock("@/lib/supabase/storage", () => ({
  uploadCreatorMediaCacheImage: cacheMocks.uploadCreatorMediaCacheImage,
}));

describe("creator media cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("serves fresh cached Instagram media without needing a platform fetch", async () => {
    cacheMocks.stateFindUnique.mockResolvedValue({
      refreshedAt: new Date("2026-05-16T12:00:00.000Z"),
      nextCursor: null,
      hasMore: false,
    });
    cacheMocks.mediaFindMany.mockResolvedValue([
      {
        platformMediaId: "ig-media-1",
        permalink: "https://www.instagram.com/p/CACHED/",
        thumbnailUrl:
          "https://project.supabase.co/storage/v1/object/public/creator-media-cache/ig/conn/ig-media-1.jpg",
        caption: "Cached",
        mediaType: "image",
        publishedAt: new Date("2026-05-15T12:00:00.000Z"),
        likeCount: 7,
        commentCount: 2,
        fetchedAt: new Date("2026-05-16T12:00:00.000Z"),
      },
    ]);

    const cached = await readCachedCreatorMedia({
      platform: "ig",
      connectionId: "ig-conn-1",
      limit: 10,
      now: new Date("2026-05-16T13:00:00.000Z"),
    });

    expect(cached).toEqual({
      posts: [
        {
          id: "ig-media-1",
          platform: "ig",
          url: "https://www.instagram.com/p/CACHED/",
          thumbnail:
            "https://project.supabase.co/storage/v1/object/public/creator-media-cache/ig/conn/ig-media-1.jpg",
          caption: "Cached",
          publishedAt: "2026-05-15T12:00:00.000Z",
          likeCount: 7,
          commentCount: 2,
          mediaType: "image",
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("downloads Instagram CDN thumbnails into Supabase storage before saving media", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg", "content-length": "3" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    cacheMocks.uploadCreatorMediaCacheImage.mockResolvedValue({
      publicUrl:
        "https://project.supabase.co/storage/v1/object/public/creator-media-cache/ig/ig-conn-1/ig-media-1.jpg",
      path: "ig/ig-conn-1/ig-media-1.jpg",
    });
    cacheMocks.mediaUpsert.mockResolvedValue({});
    cacheMocks.stateUpsert.mockResolvedValue({});

    const posts = await cacheInstagramMedia({
      connectionId: "ig-conn-1",
      media: [
        {
          id: "ig-media-1",
          caption: "Fresh",
          media_type: "IMAGE",
          media_product_type: "FEED",
          permalink: "https://www.instagram.com/p/FRESH/",
          timestamp: "2026-05-16T12:00:00.000Z",
          like_count: 11,
          comments_count: 1,
          media_url: "https://scontent.cdninstagram.com/fresh.jpg",
          thumbnail_url: null,
        },
      ],
      now: new Date("2026-05-16T12:01:00.000Z"),
    });

    expect(fetchMock).toHaveBeenCalledWith("https://scontent.cdninstagram.com/fresh.jpg", {
      cache: "no-store",
    });
    expect(cacheMocks.uploadCreatorMediaCacheImage).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/jpeg",
        platform: "ig",
        connectionId: "ig-conn-1",
        mediaId: "ig-media-1",
      })
    );
    expect(posts[0]?.thumbnail).toBe(
      "https://project.supabase.co/storage/v1/object/public/creator-media-cache/ig/ig-conn-1/ig-media-1.jpg"
    );
    expect(cacheMocks.mediaUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          thumbnailUrl:
            "https://project.supabase.co/storage/v1/object/public/creator-media-cache/ig/ig-conn-1/ig-media-1.jpg",
          sourceThumbnailUrl: "https://scontent.cdninstagram.com/fresh.jpg",
        }),
      })
    );
  });

  it("downloads TikTok cover thumbnails into Supabase storage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([4, 5, 6]), {
        status: 200,
        headers: { "content-type": "image/jpeg", "content-length": "3" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    cacheMocks.uploadCreatorMediaCacheImage.mockResolvedValue({
      publicUrl:
        "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/video-1.jpg",
      path: "tt/tt-conn-1/video-1.jpg",
    });

    const result = await cacheCreatorMediaThumbnail({
      platform: "tt",
      connectionId: "tt-conn-1",
      mediaId: "video-1",
      sourceUrl: "https://p16-sign.tiktokcdn-us.com/cover.jpg?x-expires=123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://p16-sign.tiktokcdn-us.com/cover.jpg?x-expires=123",
      { cache: "no-store" },
    );
    expect(cacheMocks.uploadCreatorMediaCacheImage).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/jpeg",
        platform: "tt",
        connectionId: "tt-conn-1",
        mediaId: "video-1",
      })
    );
    expect(result).toBe(
      "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/tt-conn-1/video-1.jpg",
    );
  });

  it("leaves already-stable cached thumbnail URLs untouched", async () => {
    const stableUrl =
      "https://project.supabase.co/storage/v1/object/public/creator-media-cache/ig/ig-conn-1/ig-media-1.jpg";

    const result = await cacheCreatorMediaThumbnail({
      platform: "ig",
      connectionId: "ig-conn-1",
      mediaId: "ig-media-1",
      sourceUrl: stableUrl,
    });

    expect(result).toBe(stableUrl);
    expect(cacheMocks.uploadCreatorMediaCacheImage).not.toHaveBeenCalled();
  });
});
