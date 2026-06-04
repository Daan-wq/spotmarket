import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorTikTokConnection } from "@prisma/client";

const fetchTikTokVideosByIdsMock = vi.fn();
const withFreshTokenMock = vi.fn();
const recordRawMock = vi.fn();

const hoisted = vi.hoisted(() => ({
  TikTokRateLimitError: class MockTikTokRateLimitError extends Error {},
}));

vi.mock("@/lib/tiktok", () => ({
  fetchTikTokVideosByIds: (...args: unknown[]) => fetchTikTokVideosByIdsMock(...args),
  TikTokRateLimitError: hoisted.TikTokRateLimitError,
}));
vi.mock("@/lib/token-refresh", () => ({
  isTikTokInvalidTokenError: (err: unknown) =>
    /access_token_invalid|access_token_expired/i.test(
      err instanceof Error ? err.message : String(err),
    ),
  withFreshTikTokAccessToken: (...args: unknown[]) => withFreshTokenMock(...args),
}));
vi.mock("./raw-storage", () => ({
  recordRawApiResponse: (...args: unknown[]) => recordRawMock(...args),
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

function video(id: string) {
  return {
    id,
    title: "test clip",
    videoDescription: "full description",
    coverImageUrl: "https://cdn.tiktok.com/cover.jpg",
    shareUrl: `https://www.tiktok.com/@user/video/${id}`,
    embedLink: `https://www.tiktok.com/embed/${id}`,
    viewCount: 100000,
    likeCount: 5000,
    commentCount: 200,
    shareCount: 80,
    createTime: 1714660000,
    duration: 28,
    height: 1920,
    width: 1080,
  };
}

beforeEach(() => {
  fetchTikTokVideosByIdsMock.mockReset();
  withFreshTokenMock.mockReset();
  recordRawMock.mockReset();
  withFreshTokenMock.mockImplementation(
    (_conn: unknown, operation: (token: string) => unknown) => operation("decoded-token"),
  );
  recordRawMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchTikTokMetric", () => {
  it("queries the known TikTok video ID directly and preserves metadata in raw", async () => {
    fetchTikTokVideosByIdsMock.mockResolvedValue({ videos: [video("vid_42")] });

    const result = await fetchTikTokMetric(
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
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.viewCount).toBe(BigInt(100000));
    expect(result.likeCount).toBe(5000);
    expect(result.commentCount).toBe(200);
    expect(result.shareCount).toBe(80);
    expect(result.metricAvailability).toMatchObject({
      views: true,
      likes: true,
      comments: true,
      shares: true,
      saves: false,
    });
    expect(result.raw).toEqual({
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

    const result = await fetchTikTokMetric(
      conn(),
      {
        platform: "TIKTOK",
        postId: "missing",
        platformVideoId: "missing",
        authorHandle: null,
        normalizedUrl: "https://www.tiktok.com/@u/video/missing",
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("POST_NOT_FOUND");
  });

  it("retries video.query with a refreshed token after an invalid-token response", async () => {
    withFreshTokenMock.mockImplementation(
      async (_conn: unknown, operation: (token: string) => Promise<unknown>) => {
        try {
          return await operation("expired-token");
        } catch (err) {
          if (/access_token_invalid/i.test((err as Error).message)) {
            return operation("fresh-token");
          }
          throw err;
        }
      },
    );
    fetchTikTokVideosByIdsMock
      .mockRejectedValueOnce(new Error("TikTok video query failed: access_token_invalid"))
      .mockResolvedValueOnce({ videos: [video("vid_retry")] });

    const result = await fetchTikTokMetric(
      conn(),
      {
        platform: "TIKTOK",
        postId: "vid_retry",
        platformVideoId: "vid_retry",
        authorHandle: "user",
        normalizedUrl: "https://www.tiktok.com/@user/video/vid_retry",
      },
    );

    expect(result.ok).toBe(true);
    expect(fetchTikTokVideosByIdsMock).toHaveBeenNthCalledWith(
      1,
      "expired-token",
      ["vid_retry"],
    );
    expect(fetchTikTokVideosByIdsMock).toHaveBeenNthCalledWith(
      2,
      "fresh-token",
      ["vid_retry"],
    );
  });

  it("returns TOKEN_BROKEN after an invalid-token retry still fails", async () => {
    withFreshTokenMock.mockRejectedValue(
      new Error("TikTok video query failed: access_token_invalid"),
    );

    const result = await fetchTikTokMetric(
      conn(),
      {
        platform: "TIKTOK",
        postId: "vid_retry",
        platformVideoId: "vid_retry",
        authorHandle: "user",
        normalizedUrl: "https://www.tiktok.com/@user/video/vid_retry",
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("TOKEN_BROKEN");
  });

  it("classifies TikTok 429s as RATE_LIMITED", async () => {
    fetchTikTokVideosByIdsMock.mockRejectedValue(
      new hoisted.TikTokRateLimitError("too many"),
    );

    const results = await fetchTikTokMetricsByVideoIds(conn(), [
      { submissionId: "sub_1", videoId: "vid_1" },
    ]);
    const result = results.get("sub_1");

    expect(result?.ok).toBe(false);
    if (!result || result.ok) return;
    expect(result.reason).toBe("RATE_LIMITED");
  });
});

describe("fetchTikTokMetricsByVideoIds", () => {
  it("batches video.query calls by 20 IDs", async () => {
    fetchTikTokVideosByIdsMock
      .mockResolvedValueOnce({ videos: [] })
      .mockResolvedValueOnce({ videos: [] });

    const targets = Array.from({ length: 21 }, (_, index) => ({
      submissionId: `sub_${index}`,
      videoId: `vid_${index}`,
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
