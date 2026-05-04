import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upsertStoryMock = vi.fn();
const findIgConnMock = vi.fn();
const findCreatorProfileMock = vi.fn();
const findSubmissionsMock = vi.fn();
const upsertCorrelationMock = vi.fn();
const recordRawMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    storyPost: { upsert: (...a: unknown[]) => upsertStoryMock(...a) },
    creatorIgConnection: { findUnique: (...a: unknown[]) => findIgConnMock(...a) },
    creatorProfile: { findUnique: (...a: unknown[]) => findCreatorProfileMock(...a) },
    campaignSubmission: { findMany: (...a: unknown[]) => findSubmissionsMock(...a) },
    storyReelCorrelation: { upsert: (...a: unknown[]) => upsertCorrelationMock(...a) },
  },
}));
vi.mock("@/lib/metrics/raw-storage", () => ({
  recordRawApiResponse: (...a: unknown[]) => recordRawMock(...a),
}));

import {
  persistStorySnapshot,
  correlateStoryToNearbyReels,
} from "./stories";

beforeEach(() => {
  upsertStoryMock.mockReset();
  findIgConnMock.mockReset();
  findCreatorProfileMock.mockReset();
  findSubmissionsMock.mockReset();
  upsertCorrelationMock.mockReset();
  recordRawMock.mockReset();
  recordRawMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("persistStorySnapshot", () => {
  it("upserts a story with navigation breakdown and computes expiresAt at +24h", async () => {
    upsertStoryMock.mockResolvedValue({ id: "st_1", postedAt: new Date("2026-05-02T18:00:00Z") });

    const story = {
      id: "story_77",
      media_type: "IMAGE",
      media_product_type: "STORY",
      permalink: "https://www.instagram.com/stories/handle/77/",
      timestamp: "2026-05-02T18:00:00Z",
      caption: null,
      thumbnail_url: null,
    };
    const insights = {
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
    };

    const r = await persistStorySnapshot("conn_ig", story, insights);
    expect(r.id).toBe("st_1");
    expect(upsertStoryMock).toHaveBeenCalledTimes(1);
    const call = upsertStoryMock.mock.calls[0][0];
    expect(call.where).toEqual({ mediaId: "story_77" });
    expect(call.create.tapsForward).toBe(800);
    expect(call.create.tapsBack).toBe(50);
    expect(call.create.tapsExit).toBe(30);
    expect(call.create.swipeForward).toBe(200);
    expect(call.create.replies).toBe(8);
    expect(call.create.reach).toBe(800);
    expect(call.create.views).toBe(1200);
    // expiresAt should be exactly +24h after postedAt
    const posted = (call.create.postedAt as Date).getTime();
    const expires = (call.create.expiresAt as Date).getTime();
    expect(expires - posted).toBe(24 * 60 * 60 * 1000);
    // profileActivity included
    expect(call.create.profileActivity).toEqual({
      BIO_LINK_CLICKED: 5,
      CALL: 0,
      DIRECTION: 0,
      EMAIL: 0,
      TEXT: 0,
    });
    expect(recordRawMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "instagram.story.insights", connectionId: "conn_ig" }),
    );
  });

  it("handles missing insights gracefully (e.g. expired story)", async () => {
    upsertStoryMock.mockResolvedValue({ id: "st_2", postedAt: new Date() });
    await persistStorySnapshot(
      "conn_ig",
      {
        id: "story_x",
        media_type: "IMAGE",
        media_product_type: "STORY",
        permalink: null,
        timestamp: "2026-05-02T19:00:00Z",
        caption: null,
        thumbnail_url: null,
      },
      null,
    );
    const call = upsertStoryMock.mock.calls[0][0];
    expect(call.create.reach).toBeNull();
    expect(call.create.tapsForward).toBeNull();
  });
});

describe("correlateStoryToNearbyReels", () => {
  beforeEach(() => {
    findIgConnMock.mockResolvedValue({ creatorProfileId: "profile_1" });
    findCreatorProfileMock.mockResolvedValue({ userId: "user_1" });
    upsertCorrelationMock.mockResolvedValue({ id: "corr_1" });
  });

  it("links each reel within ±2h of the story", async () => {
    const storyAt = new Date("2026-05-02T18:00:00Z");
    findSubmissionsMock.mockResolvedValue([
      { id: "sub_a", createdAt: new Date("2026-05-02T17:30:00Z") }, // -30m
      { id: "sub_b", createdAt: new Date("2026-05-02T19:30:00Z") }, // +90m
    ]);

    const written = await correlateStoryToNearbyReels("st_1", "conn_ig", storyAt);
    expect(written).toBe(2);
    expect(upsertCorrelationMock).toHaveBeenCalledTimes(2);

    const deltas = upsertCorrelationMock.mock.calls.map((c) => c[0].create.deltaMinutes);
    expect(deltas).toContain(-30);
    expect(deltas).toContain(90);

    const firstCall = findSubmissionsMock.mock.calls[0][0];
    expect(firstCall.where.creatorId).toBe("user_1");
    expect(firstCall.where.postUrl.contains).toBe("instagram.com");
    const since = (firstCall.where.createdAt.gte as Date).getTime();
    const until = (firstCall.where.createdAt.lte as Date).getTime();
    expect(storyAt.getTime() - since).toBe(2 * 60 * 60 * 1000);
    expect(until - storyAt.getTime()).toBe(2 * 60 * 60 * 1000);
  });

  it("returns 0 when the connection is missing", async () => {
    findIgConnMock.mockResolvedValueOnce(null);
    const written = await correlateStoryToNearbyReels("st_1", "conn_ig", new Date());
    expect(written).toBe(0);
    expect(findSubmissionsMock).not.toHaveBeenCalled();
  });

  it("returns 0 when the creator profile is gone", async () => {
    findCreatorProfileMock.mockResolvedValueOnce(null);
    const written = await correlateStoryToNearbyReels("st_1", "conn_ig", new Date());
    expect(written).toBe(0);
    expect(findSubmissionsMock).not.toHaveBeenCalled();
  });
});
