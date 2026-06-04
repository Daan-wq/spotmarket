import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorIgConnection } from "@prisma/client";

const fetchRecentMediaMock = vi.fn();
const fetchMediaInsightsMock = vi.fn();
const fetchInstagramMediaMetadataMock = vi.fn();
const withFreshInstagramAccessTokenMock = vi.fn();
const recordRawMock = vi.fn();

vi.mock("@/lib/instagram", () => ({
  fetchRecentMedia: (...a: unknown[]) => fetchRecentMediaMock(...a),
  fetchMediaInsights: (...a: unknown[]) => fetchMediaInsightsMock(...a),
  fetchInstagramMediaMetadata: (...a: unknown[]) => fetchInstagramMediaMetadataMock(...a),
  isInstagramInvalidTokenError: (err: unknown) =>
    /OAuthException|access token|invalid token|expired/i.test(
      err instanceof Error ? err.message : String(err),
    ),
}));
vi.mock("@/lib/token-refresh", () => ({
  withFreshInstagramAccessToken: (...a: unknown[]) =>
    withFreshInstagramAccessTokenMock(...a),
}));
vi.mock("./raw-storage", () => ({
  recordRawApiResponse: (...a: unknown[]) => recordRawMock(...a),
}));

import { fetchInstagramMetric } from "./instagram";

function conn(): CreatorIgConnection {
  return {
    id: "conn_ig",
    accessToken: "ct",
    accessTokenIv: "iv",
    igUserId: "ig_1",
  } as unknown as CreatorIgConnection;
}

beforeEach(() => {
  fetchRecentMediaMock.mockReset();
  fetchMediaInsightsMock.mockReset();
  fetchInstagramMediaMetadataMock.mockReset();
  withFreshInstagramAccessTokenMock.mockReset();
  recordRawMock.mockReset();
  withFreshInstagramAccessTokenMock.mockImplementation((
    _conn: unknown,
    operation: (token: string) => unknown,
  ) => operation("ig-token"));
  recordRawMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchInstagramMetric", () => {
  it("polls a known Graph media id directly without scanning recent media", async () => {
    fetchMediaInsightsMock.mockResolvedValue({
      reach: 5000,
      views: 12000,
      shares: 30,
      totalInteractions: 320,
      likes: 250,
      comments: 12,
      saved: 18,
      follows: null,
      profileVisits: null,
      avgWatchTime: 9.4,
      totalWatchTime: 4500,
      replies: null,
      profileActivityBioLink: null,
      profileActivityCall: null,
      profileActivityDirection: null,
      profileActivityEmail: null,
      profileActivityText: null,
      navigationForward: null,
      navigationBack: null,
      navigationExit: null,
      navigationNextStory: null,
    });

    const r = await fetchInstagramMetric(
      conn(),
      { platform: "INSTAGRAM", postId: "ABC123", authorHandle: null, normalizedUrl: "https://www.instagram.com/reel/ABC123/" },
      "sub_direct",
      { platformApiMediaId: "18339548662175976", mediaProductType: "REELS" },
    );

    expect(r.ok).toBe(true);
    expect(fetchRecentMediaMock).not.toHaveBeenCalled();
    expect(fetchMediaInsightsMock).toHaveBeenCalledWith(
      "18339548662175976",
      "ig-token",
      "REEL",
    );
    if (!r.ok) return;
    expect(r.resolvedIdentity).toEqual({
      platformApiMediaId: "18339548662175976",
      mediaProductType: "REELS",
    });
  });

  it("classifies a REEL and returns watch time + interactions", async () => {
    fetchRecentMediaMock.mockResolvedValue({
      media: [
        {
          id: "media_99",
          media_type: "VIDEO",
          media_product_type: "REELS",
          permalink: "https://www.instagram.com/reel/ABC123/",
          timestamp: "2026-05-01T10:00:00Z",
          caption: "test reel",
          like_count: 250,
          comments_count: 12,
        },
      ],
      nextCursor: null,
    });
    fetchMediaInsightsMock.mockResolvedValue({
      reach: 5000,
      views: 12000,
      shares: 30,
      totalInteractions: 320,
      likes: 250,
      comments: 12,
      saved: 18,
      follows: 5,
      profileVisits: 40,
      avgWatchTime: 9.4,
      totalWatchTime: 4500,
      replies: null,
      profileActivityBioLink: null,
      profileActivityCall: null,
      profileActivityDirection: null,
      profileActivityEmail: null,
      profileActivityText: null,
      navigationForward: null,
      navigationBack: null,
      navigationExit: null,
      navigationNextStory: null,
    });

    const r = await fetchInstagramMetric(
      conn(),
      { platform: "INSTAGRAM", postId: "ABC123", authorHandle: null, normalizedUrl: "https://www.instagram.com/reel/ABC123/" },
      "sub_1",
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.viewCount).toBe(BigInt(12000));
    expect(r.likeCount).toBe(250);
    expect(r.commentCount).toBe(12);
    expect(r.shareCount).toBe(30);
    expect(r.saveCount).toBe(18);
    expect(r.watchTimeSec).toBe(4500);
    expect(r.reachCount).toBe(5000);
    expect(r.totalInteractions).toBe(320);
    expect(r.followsFromMedia).toBe(5);
    expect(r.profileVisits).toBe(40);
    expect(r.metricAvailability).toMatchObject({
      views: true,
      likes: true,
      comments: true,
      shares: true,
      saves: true,
      watchTime: true,
      reach: true,
      totalInteractions: true,
      follows: true,
      profileVisits: true,
    });
    // REEL has no profile_activity breakdown
    expect(r.profileActivity).toBeNull();
    expect(r.resolvedIdentity).toEqual({
      platformApiMediaId: "media_99",
      mediaProductType: "REELS",
    });
    expect(fetchMediaInsightsMock).toHaveBeenCalledWith("media_99", "ig-token", "REEL");
    expect(recordRawMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "IG",
        connectionId: "conn_ig",
        endpoint: "instagram.media.insights",
        submissionId: "sub_1",
      }),
    );
  });

  it("classifies a STORY and surfaces navigation breakdown in raw", async () => {
    fetchRecentMediaMock.mockResolvedValue({
      media: [
        {
          id: "story_77",
          media_type: "IMAGE",
          media_product_type: "STORY",
          permalink: "https://www.instagram.com/stories/handle/STORYID/",
          timestamp: "2026-05-02T18:42:00Z",
          caption: null,
          like_count: 0,
          comments_count: 0,
        },
      ],
      nextCursor: null,
    });
    fetchMediaInsightsMock.mockResolvedValue({
      reach: 800,
      views: 1200,
      shares: 2,
      totalInteractions: 50,
      likes: null,
      comments: null,
      saved: null,
      follows: 4,
      profileVisits: 20,
      avgWatchTime: null,
      totalWatchTime: null,
      replies: 8,
      profileActivityBioLink: 5,
      profileActivityCall: 0,
      profileActivityDirection: 0,
      profileActivityEmail: 0,
      profileActivityText: 0,
      navigationForward: 800,
      navigationBack: 50,
      navigationExit: 30,
      navigationNextStory: 200,
    });

    const r = await fetchInstagramMetric(
      conn(),
      { platform: "INSTAGRAM", postId: "STORYID", authorHandle: null, normalizedUrl: "https://www.instagram.com/stories/handle/STORYID/" },
      "sub_2",
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(fetchMediaInsightsMock).toHaveBeenCalledWith("story_77", "ig-token", "STORY");
    expect(r.profileActivity).toEqual({
      BIO_LINK_CLICKED: 5,
      CALL: 0,
      DIRECTION: 0,
      EMAIL: 0,
      TEXT: 0,
    });
    expect(r.metricAvailability).toMatchObject({
      views: true,
      likes: false,
      comments: false,
      shares: true,
      saves: false,
      reach: true,
    });
    const raw = r.raw as { navigation?: Record<string, number | null>; replies?: number | null };
    expect(raw.navigation).toEqual({
      TAP_FORWARD: 800,
      TAP_BACK: 50,
      TAP_EXIT: 30,
      SWIPE_FORWARD: 200,
    });
    expect(raw.replies).toBe(8);
  });

  it("returns POST_NOT_FOUND when permalink isn't matched", async () => {
    fetchRecentMediaMock.mockResolvedValue({ media: [], nextCursor: null });
    const r = await fetchInstagramMetric(
      conn(),
      { platform: "INSTAGRAM", postId: "nope", authorHandle: null, normalizedUrl: "https://www.instagram.com/p/nope/" },
      "sub_x",
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("POST_NOT_FOUND");
  });

  it("does not turn a missing Reel views metric into a successful zero snapshot", async () => {
    fetchMediaInsightsMock.mockResolvedValue({
      reach: 5000,
      views: null,
      shares: 30,
      totalInteractions: 320,
      likes: 250,
      comments: 12,
      saved: 18,
      follows: null,
      profileVisits: null,
      avgWatchTime: 9.4,
      totalWatchTime: 4500,
      replies: null,
      profileActivityBioLink: null,
      profileActivityCall: null,
      profileActivityDirection: null,
      profileActivityEmail: null,
      profileActivityText: null,
      navigationForward: null,
      navigationBack: null,
      navigationExit: null,
      navigationNextStory: null,
    });

    const r = await fetchInstagramMetric(
      conn(),
      { platform: "INSTAGRAM", postId: "ABC123", authorHandle: null, normalizedUrl: "https://www.instagram.com/reel/ABC123/" },
      "sub_missing_views",
      { platformApiMediaId: "18339548662175976", mediaProductType: "REELS" },
    );

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("API_SCHEMA_ERROR");
  });

  it("returns TOKEN_BROKEN after an invalid-token retry still fails", async () => {
    withFreshInstagramAccessTokenMock.mockImplementation(async (
      _conn: unknown,
      operation: (token: string) => Promise<unknown>,
    ) => {
      try {
        return await operation("expired-token");
      } catch (err) {
        if (!/OAuthException|token|expired/i.test((err as Error).message)) throw err;
        return operation("refreshed-token");
      }
    });
    fetchRecentMediaMock
      .mockRejectedValueOnce(new Error("OAuthException: Error validating access token"))
      .mockRejectedValueOnce(new Error("OAuthException: Error validating access token"));

    const r = await fetchInstagramMetric(
      conn(),
      {
        platform: "INSTAGRAM",
        postId: "ABC123",
        authorHandle: null,
        normalizedUrl: "https://www.instagram.com/reel/ABC123/",
      },
    );

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("TOKEN_BROKEN");
  });
});
