import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorTikTokConnection } from "@prisma/client";

const fetchTikTokVideosByIdsMock = vi.fn();
const getFreshTokenMock = vi.fn();
const recordRawMock = vi.fn();

const hoisted = vi.hoisted(() => ({
  TikTokRateLimitError: class MockTikTokRateLimitError extends Error {},
}));

vi.mock("@/lib/tiktok", () => ({
  fetchTikTokVideosByIds: (...a: unknown[]) => fetchTikTokVideosByIdsMock(...a),
  TikTokRateLimitError: hoisted.TikTokRateLimitError,
}));
vi.mock("@/lib/token-refresh", () => ({
  getFreshTikTokAccessToken: (...a: unknown[]) => getFreshTokenMock(...a),
}));
vi.mock("./raw-storage", () => ({
  recordRawApiResponse: (...a: unknown[]) => recordRawMock(...a),
}));
vi.mock("./router", () => ({
  failure: (reason: string, message: string, connection: unknown) => ({
    ok: false,
    source: "OAUTH_FAILED",
    reason,
    message,
    connection,
  }),
}));

import { fetchTikTokMetric, fetchTikTokMetricsByVideoIds } from "./tiktok";

function conn(): CreatorTikTokConnection {
  return {
    id: "conn_tt",
    accessToken: "ct",
    accessTokenIv: "iv",
  } as unknown as CreatorTikTokConnection;
}

beforeEach(() => {
  fetchTikTokVideosByIdsMock.mockReset();
  getFreshTokenMock.mockReset();
  recordRawMock.mockReset();
  getFreshTokenMock.mockResolvedValue("decoded-token");
  recordRawMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchTikTokMetric", () => {
  it("queries the known TikTok video ID directly and preserves metadata in raw", async () => {
    fetchTikTokVideosByIdsMock.mockResolvedValue({
      videos: [
        {
          id: "vid_42",
          title: "test clip",
          videoDescription: "full description",
          coverImageUrl: "https://cdn.tiktok.com/cover.jpg",
          shareUrl: "https://www.tiktok.com/@user/video/vid_42",
          embedLink: "https://www.tiktok.com/embed/vid_42",
          viewCount: 100000,
          likeCount: 5000,
          commentCount: 200,
          shareCount: 80,
          createTime: 1714660000,
          duration: 28,
          height: 1920,
          width: 1080,
        },
      ],
    });

    const r = await fetchTikTokMetric(
      conn(),
      {
        platform: "TIKTOK",
        postId: "vid_42",
        platformVideoId: "vid_42",
        authorHandle: "user",
        normalizedUrl: "https://www.tiktok.com/@user/video/vid_42",
      },
      "sub_tt",
    );

    expect(fetchTikTokVideosByIdsMock).toHaveBeenCalledWith("decoded-token", ["vid_42"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.viewCount).toBe(BigInt(100000));
    expect(r.likeCount).toBe(5000);
    expect(r.commentCount).toBe(200);
    expect(r.shareCount).toBe(80);
    expect(r.metricAvailability).toMatchObject({
      views: true,
      likes: true,
      comments: true,
      shares: true,
      saves: false,
    });
    expect(r.raw).toEqual({
      videoId: "vid_42",
      title: "test clip",
      videoDescription: "full description",
      coverImageUrl: "https://cdn.tiktok.com/cover.jpg",
      shareUrl: "https://www.tiktok.com/@user/video/vid_42",
      embedLink: "https://www.tiktok.com/embed/vid_42",
      duration: 28,
      height: 1920,
      width: 1080,
      createTime: 1714660000,
    });
    expect(recordRawMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "TT",
        connectionId: "conn_tt",
        endpoint: "tiktok.video.query",
        submissionId: null,
      }),
    );
  });

  it("returns POST_NOT_FOUND when video.query does not return the requested ID", async () => {
    fetchTikTokVideosByIdsMock.mockResolvedValue({ videos: [] });
    const r = await fetchTikTokMetric(
      conn(),
      {
        platform: "TIKTOK",
        postId: "missing",
        platformVideoId: "missing",
        authorHandle: null,
        normalizedUrl: "https://www.tiktok.com/@u/video/missing",
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("POST_NOT_FOUND");
  });

  it("classifies TikTok 429s as RATE_LIMITED", async () => {
    fetchTikTokVideosByIdsMock.mockRejectedValue(new hoisted.TikTokRateLimitError("too many"));
    const results = await fetchTikTokMetricsByVideoIds(conn(), [
      { submissionId: "sub_1", videoId: "vid_1" },
    ]);

    const r = results.get("sub_1");
    expect(r?.ok).toBe(false);
    if (!r || r.ok) return;
    expect(r.reason).toBe("RATE_LIMITED");
  });
});

describe("fetchTikTokMetricsByVideoIds", () => {
  it("batches video.query calls by 20 IDs", async () => {
    fetchTikTokVideosByIdsMock
      .mockResolvedValueOnce({ videos: [] })
      .mockResolvedValueOnce({ videos: [] });

    const targets = Array.from({ length: 21 }, (_, i) => ({
      submissionId: `sub_${i}`,
      videoId: `vid_${i}`,
    }));
    await fetchTikTokMetricsByVideoIds(conn(), targets);

    expect(fetchTikTokVideosByIdsMock).toHaveBeenCalledTimes(2);
    expect(fetchTikTokVideosByIdsMock).toHaveBeenNthCalledWith(
      1,
      "decoded-token",
      targets.slice(0, 20).map((target) => target.videoId),
    );
    expect(fetchTikTokVideosByIdsMock).toHaveBeenNthCalledWith(
      2,
      "decoded-token",
      ["vid_20"],
    );
  });
});
