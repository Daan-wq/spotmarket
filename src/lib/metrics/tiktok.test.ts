import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorTikTokConnection } from "@prisma/client";

const fetchTikTokVideosMock = vi.fn();
const getFreshTokenMock = vi.fn();
const recordRawMock = vi.fn();

vi.mock("@/lib/tiktok", () => ({
  fetchTikTokVideos: (...a: unknown[]) => fetchTikTokVideosMock(...a),
}));
vi.mock("@/lib/token-refresh", () => ({
  getFreshTikTokAccessToken: (...a: unknown[]) => getFreshTokenMock(...a),
}));
vi.mock("./raw-storage", () => ({
  recordRawApiResponse: (...a: unknown[]) => recordRawMock(...a),
}));

import { fetchTikTokMetric } from "./tiktok";

function conn(): CreatorTikTokConnection {
  return {
    id: "conn_tt",
    accessToken: "ct",
    accessTokenIv: "iv",
  } as unknown as CreatorTikTokConnection;
}

beforeEach(() => {
  fetchTikTokVideosMock.mockReset();
  getFreshTokenMock.mockReset();
  recordRawMock.mockReset();
  getFreshTokenMock.mockResolvedValue("decoded-token");
  recordRawMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchTikTokMetric", () => {
  it("preserves video metadata in raw and archives the page payload", async () => {
    fetchTikTokVideosMock.mockResolvedValue({
      videos: [
        {
          id: "vid_42",
          title: "test clip",
          coverImageUrl: "https://cdn.tiktok.com/cover.jpg",
          shareUrl: "https://www.tiktok.com/@user/video/vid_42",
          viewCount: 100000,
          likeCount: 5000,
          commentCount: 200,
          shareCount: 80,
          createTime: 1714660000,
          duration: 28,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const r = await fetchTikTokMetric(
      conn(),
      { platform: "TIKTOK", postId: "vid_42", authorHandle: "user", normalizedUrl: "https://www.tiktok.com/@user/video/vid_42" },
      "sub_tt",
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.viewCount).toBe(BigInt(100000));
    expect(r.likeCount).toBe(5000);
    expect(r.commentCount).toBe(200);
    expect(r.shareCount).toBe(80);
    expect(r.raw).toEqual({
      videoId: "vid_42",
      title: "test clip",
      coverImageUrl: "https://cdn.tiktok.com/cover.jpg",
      shareUrl: "https://www.tiktok.com/@user/video/vid_42",
      duration: 28,
      createTime: 1714660000,
    });
    expect(recordRawMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "TT",
        connectionId: "conn_tt",
        endpoint: "tiktok.video.list",
        submissionId: "sub_tt",
      }),
    );
  });

  it("archives every page even when paging through to find the video", async () => {
    fetchTikTokVideosMock
      .mockResolvedValueOnce({
        videos: [{ id: "other", title: "x", coverImageUrl: null, shareUrl: "https://tt/other", viewCount: 1, likeCount: 0, commentCount: 0, shareCount: 0, createTime: 0, duration: 0 }],
        nextCursor: 12345,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        videos: [{ id: "vid_99", title: "x", coverImageUrl: null, shareUrl: "https://tt/vid_99", viewCount: 5, likeCount: 1, commentCount: 0, shareCount: 0, createTime: 0, duration: 0 }],
        nextCursor: null,
        hasMore: false,
      });

    const r = await fetchTikTokMetric(
      conn(),
      { platform: "TIKTOK", postId: "vid_99", authorHandle: null, normalizedUrl: "https://www.tiktok.com/@u/video/vid_99" },
      "sub_pp",
    );
    expect(r.ok).toBe(true);
    expect(recordRawMock).toHaveBeenCalledTimes(2);
  });

  it("returns POST_NOT_FOUND after exhausting pages", async () => {
    fetchTikTokVideosMock.mockResolvedValue({ videos: [], nextCursor: null, hasMore: false });
    const r = await fetchTikTokMetric(
      conn(),
      { platform: "TIKTOK", postId: "missing", authorHandle: null, normalizedUrl: "https://www.tiktok.com/@u/video/missing" },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("POST_NOT_FOUND");
  });
});
