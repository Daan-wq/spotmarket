import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorFbConnection } from "@prisma/client";

const decryptMock = vi.fn();
const recordRawMock = vi.fn();
const createCurveMock = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fetchSpy: any;

vi.mock("@/lib/crypto", () => ({ decrypt: (...a: unknown[]) => decryptMock(...a) }));
vi.mock("./raw-storage", () => ({
  recordRawApiResponse: (...a: unknown[]) => recordRawMock(...a),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    videoRetentionCurve: { create: (...a: unknown[]) => createCurveMock(...a) },
  },
}));

import { fetchFacebookMetric } from "./facebook";

function conn(): CreatorFbConnection {
  return {
    id: "conn_fb",
    accessToken: "ct",
    accessTokenIv: "iv",
    fbPageId: "pg_42",
  } as unknown as CreatorFbConnection;
}

beforeEach(() => {
  decryptMock.mockReset();
  recordRawMock.mockReset();
  createCurveMock.mockReset();
  fetchSpy = vi.spyOn(globalThis, "fetch");
  decryptMock.mockReturnValue("decoded");
  recordRawMock.mockResolvedValue(undefined);
  createCurveMock.mockResolvedValue({ id: "curve_1" });
});

afterEach(() => {
  fetchSpy.mockRestore();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("fetchFacebookMetric", () => {
  it("extracts reaction-type breakdown, retention graph, FB Reels plays", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        id: "pg_42_v9",
        views: 1000,
        likes: { summary: { total_count: 600 } },
        reactions: { summary: { total_count: 750 } },
        comments: { summary: { total_count: 12 } },
        shares: { count: 4 },
        reactions_like: { summary: { total_count: 600 } },
        reactions_love: { summary: { total_count: 80 } },
        reactions_wow: { summary: { total_count: 30 } },
        reactions_haha: { summary: { total_count: 25 } },
        reactions_sad: { summary: { total_count: 5 } },
        reactions_angry: { summary: { total_count: 10 } },
        reactions_thankful: { summary: { total_count: 0 } },
        reactions_pride: { summary: { total_count: 0 } },
        reactions_care: { summary: { total_count: 0 } },
        video_insights: {
          data: [
            { name: "total_video_views", values: [{ value: 1000 }] },
            { name: "post_impressions_unique", values: [{ value: 850 }] },
            { name: "fb_reels_total_plays", values: [{ value: 1500 }] },
            { name: "fb_reels_replay_count", values: [{ value: 250 }] },
            { name: "post_video_view_time", values: [{ value: 2_400_000 }] }, // 2400 sec
            { name: "post_video_avg_time_watched", values: [{ value: 9000 }] }, // 9 sec
            { name: "post_video_followers", values: [{ value: 7 }] },
            {
              name: "post_video_retention_graph",
              values: [
                { value: { "0": 1, "1": 0.93, "2": 0.85, "3": 0.7 } },
              ],
            },
          ],
        },
      }),
    );

    const r = await fetchFacebookMetric(
      conn(),
      { platform: "FACEBOOK", postId: "v9", authorHandle: null, normalizedUrl: "https://www.facebook.com/page/videos/v9/" },
      "sub_99",
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.viewCount).toBe(BigInt(1000));
    expect(r.likeCount).toBe(600); // from LIKE breakdown
    expect(r.commentCount).toBe(12);
    expect(r.shareCount).toBe(4);
    expect(r.reachCount).toBe(850);
    expect(r.watchTimeSec).toBe(2400);
    expect(r.followsFromMedia).toBe(7);
    expect(r.totalInteractions).toBe(750);
    expect(r.reactionsByType).toMatchObject({ LIKE: 600, LOVE: 80, WOW: 30, HAHA: 25, SAD: 5, ANGRY: 10 });

    expect(createCurveMock).toHaveBeenCalledTimes(1);
    const curveCall = createCurveMock.mock.calls[0][0];
    expect(curveCall.data.submissionId).toBe("sub_99");
    expect(curveCall.data.source).toBe("OAUTH_FB");
    expect(curveCall.data.curve).toEqual([
      { tSec: 0, retentionPct: 1 },
      { tSec: 1, retentionPct: 0.93 },
      { tSec: 2, retentionPct: 0.85 },
      { tSec: 3, retentionPct: 0.7 },
    ]);

    expect(recordRawMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "FB",
        connectionId: "conn_fb",
        endpoint: "facebook.post.insights",
        submissionId: "sub_99",
      }),
    );
  });

  it("returns TOKEN_BROKEN on 401", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("auth", { status: 401 }));
    const r = await fetchFacebookMetric(
      conn(),
      { platform: "FACEBOOK", postId: "v1", authorHandle: null, normalizedUrl: "https://www.facebook.com/page/videos/v1/" },
      "sub_1",
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("TOKEN_BROKEN");
  });

  it("falls back to bare videoId after 404 on composite id", async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "v1",
          views: 50,
          likes: { summary: { total_count: 5 } },
          reactions: { summary: { total_count: 5 } },
          comments: { summary: { total_count: 0 } },
          shares: { count: 0 },
        }),
      );
    const r = await fetchFacebookMetric(
      conn(),
      { platform: "FACEBOOK", postId: "v1", authorHandle: null, normalizedUrl: "https://www.facebook.com/page/videos/v1/" },
      "sub_2",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.viewCount).toBe(BigInt(50));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
