import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorYtConnection } from "@prisma/client";

const getFreshTokenMock = vi.fn();
const recordRawMock = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fetchSpy: any;

vi.mock("@/lib/token-refresh", () => ({
  isYoutubeInvalidTokenError: (err: unknown) =>
    /invalid_token|invalid credentials|invalid_grant|401|403/i.test(
      err instanceof Error ? err.message : String(err),
    ),
  withFreshYoutubeAccessToken: (...a: unknown[]) => getFreshTokenMock(...a),
}));
vi.mock("./raw-storage", () => ({
  recordRawApiResponse: (...a: unknown[]) => recordRawMock(...a),
}));

import { fetchYoutubeMetric } from "./youtube";

function conn(): CreatorYtConnection {
  return {
    id: "conn_yt",
    channelId: "chan_1",
    accessToken: "ct",
    accessTokenIv: "iv",
  } as unknown as CreatorYtConnection;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  getFreshTokenMock.mockReset();
  recordRawMock.mockReset();
  fetchSpy = vi.spyOn(globalThis, "fetch");
  getFreshTokenMock.mockImplementation((
    _conn: unknown,
    operation: (token: string) => unknown,
  ) => operation("decoded-token"));
  recordRawMock.mockResolvedValue(undefined);
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe("fetchYoutubeMetric", () => {
  it("combines Data API statistics with owner Analytics API metrics", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: "vid_1",
              snippet: {
                channelId: "chan_1",
                title: "Video title",
                publishedAt: "2026-05-01T10:00:00Z",
              },
              contentDetails: { duration: "PT45S" },
              statistics: {
                viewCount: "162290",
                likeCount: "6000",
                commentCount: "37",
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          columnHeaders: [
            { name: "views" },
            { name: "comments" },
            { name: "likes" },
            { name: "shares" },
            { name: "estimatedMinutesWatched" },
            { name: "averageViewDuration" },
            { name: "videosAddedToPlaylists" },
            { name: "videosRemovedFromPlaylists" },
          ],
          rows: [[162290, 37, 6000, 206, 9000, 22, 18, 2]],
        }),
      );

    const r = await fetchYoutubeMetric(
      conn(),
      { platform: "YOUTUBE", postId: "stale_url_id", authorHandle: null, normalizedUrl: "https://youtu.be/stale_url_id" },
      "sub_yt",
      { platformApiMediaId: "vid_1" },
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolvedIdentity).toEqual({ platformApiMediaId: "vid_1" });
    expect(fetchSpy.mock.calls[0]?.[0]).toContain("id=vid_1");
    expect(r.viewCount).toBe(BigInt(162290));
    expect(r.likeCount).toBe(6000);
    expect(r.commentCount).toBe(37);
    expect(r.shareCount).toBe(206);
    expect(r.watchTimeSec).toBe(540000);
    expect(r.saveCount).toBeNull();
    expect(r.metricAvailability).toMatchObject({
      views: true,
      likes: true,
      comments: true,
      shares: true,
      saves: false,
      watchTime: true,
    });
    expect(r.raw).toMatchObject({
      videoId: "vid_1",
      title: "Video title",
      watchTimeKind: "total",
      estimatedMinutesWatched: 9000,
      averageViewDuration: 22,
      playlistAdds: 18,
      analyticsAvailable: true,
    });
    expect(recordRawMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "YT",
        connectionId: "conn_yt",
        endpoint: "youtube.video.metrics",
        submissionId: "sub_yt",
      }),
    );
  });

  it("keeps analytics-only metrics unavailable when Analytics API does not return data", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: "vid_2",
              snippet: { channelId: "chan_1", publishedAt: "2026-05-01T10:00:00Z" },
              statistics: { viewCount: "500", likeCount: "20", commentCount: "1" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ columnHeaders: [], rows: [] }));

    const r = await fetchYoutubeMetric(
      conn(),
      { platform: "YOUTUBE", postId: "vid_2", authorHandle: null, normalizedUrl: "https://youtu.be/vid_2" },
      "sub_yt_2",
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.shareCount).toBe(0);
    expect(r.watchTimeSec).toBeNull();
    expect(r.metricAvailability).toMatchObject({
      views: true,
      likes: true,
      comments: true,
      shares: false,
      watchTime: false,
    });
  });

  it("returns TOKEN_BROKEN after an invalid-token retry still fails", async () => {
    getFreshTokenMock.mockImplementation(async (
      _conn: unknown,
      operation: (token: string) => Promise<unknown>,
    ) => {
      try {
        return await operation("expired-token");
      } catch (err) {
        if (!/401|403|invalid/i.test((err as Error).message)) throw err;
        return await operation("refreshed-token");
      }
    });
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ error: "Invalid Credentials" }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: "Invalid Credentials" }, 401));

    const r = await fetchYoutubeMetric(
      conn(),
      { platform: "YOUTUBE", postId: "vid_1", authorHandle: null, normalizedUrl: "https://youtu.be/vid_1" },
    );

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("TOKEN_BROKEN");
  });
});
