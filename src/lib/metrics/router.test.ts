import { beforeEach, describe, expect, it, vi } from "vitest";

const creatorProfileFindFirstMock = vi.fn();
const igFindManyMock = vi.fn();
const igFindFirstMock = vi.fn();
const ttFindManyMock = vi.fn();
const ytFindManyMock = vi.fn();
const fbFindManyMock = vi.fn();
const fetchInstagramMetricMock = vi.fn();
const fetchTikTokMetricMock = vi.fn();
const fetchYoutubeMetricMock = vi.fn();
const fetchFacebookMetricMock = vi.fn();
const availableCoreMetrics = {
  views: true,
  likes: true,
  comments: true,
  shares: true,
  saves: false,
  watchTime: false,
  reach: false,
  totalInteractions: false,
  follows: false,
  profileVisits: false,
  reactions: false,
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creatorProfile: {
      findFirst: (...args: unknown[]) => creatorProfileFindFirstMock(...args),
    },
    creatorIgConnection: {
      findMany: (...args: unknown[]) => igFindManyMock(...args),
      findFirst: (...args: unknown[]) => igFindFirstMock(...args),
    },
    creatorTikTokConnection: {
      findMany: (...args: unknown[]) => ttFindManyMock(...args),
    },
    creatorYtConnection: {
      findMany: (...args: unknown[]) => ytFindManyMock(...args),
    },
    creatorFbConnection: {
      findMany: (...args: unknown[]) => fbFindManyMock(...args),
    },
  },
}));

vi.mock("./instagram", () => ({
  fetchInstagramMetric: (...args: unknown[]) => fetchInstagramMetricMock(...args),
}));
vi.mock("./tiktok", () => ({
  fetchTikTokMetric: (...args: unknown[]) => fetchTikTokMetricMock(...args),
}));
vi.mock("./youtube", () => ({
  fetchYoutubeMetric: (...args: unknown[]) => fetchYoutubeMetricMock(...args),
}));
vi.mock("./facebook", () => ({
  fetchFacebookMetric: (...args: unknown[]) => fetchFacebookMetricMock(...args),
}));

import { routeMetric } from "./router";

beforeEach(() => {
  creatorProfileFindFirstMock.mockReset();
  igFindManyMock.mockReset();
  igFindFirstMock.mockReset();
  ttFindManyMock.mockReset();
  ytFindManyMock.mockReset();
  fbFindManyMock.mockReset();
  fetchInstagramMetricMock.mockReset();
  fetchTikTokMetricMock.mockReset();
  fetchYoutubeMetricMock.mockReset();
  fetchFacebookMetricMock.mockReset();

  creatorProfileFindFirstMock.mockResolvedValue({ id: "profile-1" });
  ttFindManyMock.mockResolvedValue([]);
  ytFindManyMock.mockResolvedValue([]);
  fbFindManyMock.mockResolvedValue([]);
});

describe("routeMetric", () => {
  it("uses the stored Instagram source connection before fallback account ordering", async () => {
    const selected = { id: "ig-selected", igUsername: "selected" };
    igFindFirstMock.mockResolvedValueOnce(selected);
    fetchInstagramMetricMock.mockResolvedValueOnce({
      ok: true,
      source: "OAUTH_IG",
      connection: { type: "IG", id: "ig-selected" },
      viewCount: BigInt(100),
      likeCount: 10,
      commentCount: 1,
      shareCount: 0,
      saveCount: null,
      watchTimeSec: null,
      reachCount: null,
      metricAvailability: availableCoreMetrics,
    });

    const result = await routeMetric({
      id: "sub-1",
      creatorId: "creator-1",
      postUrl: "https://www.instagram.com/reel/ABC123/",
      sourceConnectionType: "IG",
      sourceConnectionId: "ig-selected",
      platformApiMediaId: "graph-media-1",
      platformMediaProductType: "REELS",
    } as never);

    expect(result.ok).toBe(true);
    expect(igFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "ig-selected",
        creatorProfileId: "profile-1",
        isVerified: true,
        accessToken: { not: null },
      },
    });
    expect(igFindManyMock).not.toHaveBeenCalled();
    expect(fetchInstagramMetricMock).toHaveBeenCalledWith(
      selected,
      expect.objectContaining({ postId: "ABC123" }),
      "sub-1",
      {
        platformApiMediaId: "graph-media-1",
        mediaProductType: "REELS",
      },
    );
  });

  it("tries other verified Instagram connections for legacy handle-less rows until one finds the post", async () => {
    const wrong = { id: "ig-wrong", igUsername: "wrong" };
    const right = { id: "ig-right", igUsername: "right" };
    igFindManyMock.mockResolvedValueOnce([wrong, right]);
    fetchInstagramMetricMock
      .mockResolvedValueOnce({
        ok: false,
        source: "OAUTH_FAILED",
        reason: "POST_NOT_FOUND",
        message: "not here",
        connection: { type: "IG", id: "ig-wrong" },
      })
      .mockResolvedValueOnce({
        ok: true,
        source: "OAUTH_IG",
        connection: { type: "IG", id: "ig-right" },
        viewCount: BigInt(1200),
        likeCount: 122,
        commentCount: 4,
        shareCount: 2,
        saveCount: null,
        watchTimeSec: null,
        reachCount: null,
        metricAvailability: availableCoreMetrics,
      });

    const result = await routeMetric({
      id: "sub-legacy",
      creatorId: "creator-1",
      postUrl: "https://www.instagram.com/reel/ABC123/",
    });

    expect(result.ok).toBe(true);
    expect(fetchInstagramMetricMock).toHaveBeenCalledTimes(2);
    expect(fetchInstagramMetricMock).toHaveBeenNthCalledWith(
      1,
      wrong,
      expect.objectContaining({ postId: "ABC123" }),
      "sub-legacy",
      { platformApiMediaId: null, mediaProductType: null },
    );
    expect(fetchInstagramMetricMock).toHaveBeenNthCalledWith(
      2,
      right,
      expect.objectContaining({ postId: "ABC123" }),
      "sub-legacy",
      { platformApiMediaId: null, mediaProductType: null },
    );
  });

  it("does not silently fall back to another account when the stored source connection is missing", async () => {
    igFindFirstMock.mockResolvedValueOnce(null);

    const result = await routeMetric({
      id: "sub-1",
      creatorId: "creator-1",
      postUrl: "https://www.instagram.com/reel/ABC123/",
      sourceConnectionType: "IG",
      sourceConnectionId: "ig-missing",
    } as never);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("NO_CONNECTION");
    expect(igFindManyMock).not.toHaveBeenCalled();
    expect(fetchInstagramMetricMock).not.toHaveBeenCalled();
  });
});
