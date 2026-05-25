import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstSignalMock = vi.fn();
const createSignalMock = vi.fn();
const updateSignalMock = vi.fn();
const findManySubmissionMock = vi.fn();
const updateSubmissionMock = vi.fn();
const createMetricSnapshotMock = vi.fn();
const findManyMetricSnapshotMock = vi.fn();
const findFirstCampaignBenchmarkMock = vi.fn();
const findFirstPlatformAccountSnapshotMock = vi.fn();
const publishEventMock = vi.fn();
const routeMetricMock = vi.fn();
const scoreVelocityMock = vi.fn();
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
    campaignSubmission: {
      findMany: (...args: unknown[]) => findManySubmissionMock(...args),
      update: (...args: unknown[]) => updateSubmissionMock(...args),
    },
    metricSnapshot: {
      create: (...args: unknown[]) => createMetricSnapshotMock(...args),
      findMany: (...args: unknown[]) => findManyMetricSnapshotMock(...args),
    },
    submissionSignal: {
      findFirst: (...args: unknown[]) => findFirstSignalMock(...args),
      create: (...args: unknown[]) => createSignalMock(...args),
      update: (...args: unknown[]) => updateSignalMock(...args),
    },
    campaignBenchmark: {
      findFirst: (...args: unknown[]) => findFirstCampaignBenchmarkMock(...args),
    },
    platformAccountSnapshot: {
      findFirst: (...args: unknown[]) => findFirstPlatformAccountSnapshotMock(...args),
    },
  },
}));

vi.mock("@/lib/event-bus", () => ({
  publishEvent: (...args: unknown[]) => publishEventMock(...args),
}));

vi.mock("./router", () => ({
  routeMetric: (...args: unknown[]) => routeMetricMock(...args),
}));

vi.mock("@/lib/velocity-scorer", () => ({
  scoreVelocity: (...args: unknown[]) => scoreVelocityMock(...args),
}));

import { emitFlag, pollSubmissions } from "./poll-runner";

beforeEach(() => {
  findFirstSignalMock.mockReset();
  createSignalMock.mockReset();
  updateSignalMock.mockReset();
  findManySubmissionMock.mockReset();
  updateSubmissionMock.mockReset();
  createMetricSnapshotMock.mockReset();
  findManyMetricSnapshotMock.mockReset();
  findFirstCampaignBenchmarkMock.mockReset();
  findFirstPlatformAccountSnapshotMock.mockReset();
  publishEventMock.mockReset();
  routeMetricMock.mockReset();
  scoreVelocityMock.mockReset();

  findFirstSignalMock.mockResolvedValue(null);
  createSignalMock.mockResolvedValue({
    id: "sig_1",
    createdAt: new Date("2026-05-12T10:00:00.000Z"),
  });
  updateSignalMock.mockResolvedValue({ id: "sig_existing" });
  findFirstCampaignBenchmarkMock.mockResolvedValue(null);
  findFirstPlatformAccountSnapshotMock.mockResolvedValue(null);
  findManySubmissionMock.mockResolvedValue([]);
  updateSubmissionMock.mockResolvedValue({});
  createMetricSnapshotMock.mockResolvedValue({
    id: "snap_1",
    viewCount: BigInt(0),
    capturedAt: new Date("2026-05-12T10:00:00.000Z"),
  });
  findManyMetricSnapshotMock.mockResolvedValue([]);
  scoreVelocityMock.mockReturnValue({
    velocity: null,
    ratios: null,
    flags: [],
    velocityScore: null,
  });
});

describe("emitFlag", () => {
  it("creates and publishes a signal when no open signal exists for the same submission and type", async () => {
    await emitFlag("sub_1", {
      type: "BOT_SUSPECTED",
      severity: "WARN",
      payload: { reason: "low engagement on high view delta" },
    });

    expect(findFirstSignalMock).toHaveBeenCalledWith({
      where: {
        submissionId: "sub_1",
        type: "BOT_SUSPECTED",
        resolvedAt: null,
      },
      select: { id: true, severity: true, payload: true },
    });
    expect(createSignalMock).toHaveBeenCalledTimes(1);
    expect(publishEventMock).toHaveBeenCalledWith({
      type: "submission.flagged",
      submissionId: "sub_1",
      signalId: "sig_1",
      signal: "BOT_SUSPECTED",
      severity: "WARN",
      occurredAt: "2026-05-12T10:00:00.000Z",
    });
  });

  it("skips duplicate open signals for the same submission and type", async () => {
    findFirstSignalMock.mockResolvedValueOnce({ id: "sig_existing" });

    await emitFlag("sub_1", {
      type: "VELOCITY_DROP",
      severity: "INFO",
      payload: { reason: "views per hour dropped" },
    });

    expect(createSignalMock).not.toHaveBeenCalled();
    expect(updateSignalMock).not.toHaveBeenCalled();
    expect(publishEventMock).not.toHaveBeenCalled();
  });

  it("allows a new signal after an older one was resolved", async () => {
    await emitFlag("sub_1", {
      type: "BOT_SUSPECTED",
      severity: "WARN",
      payload: { reason: "new suspicious traffic after previous resolution" },
    });

    expect(findFirstSignalMock).toHaveBeenCalledWith({
      where: {
        submissionId: "sub_1",
        type: "BOT_SUSPECTED",
        resolvedAt: null,
      },
      select: { id: true, severity: true, payload: true },
    });
    expect(createSignalMock).toHaveBeenCalledTimes(1);
  });

  it("updates an open BOT_SUSPECTED signal when new evidence is stronger", async () => {
    findFirstSignalMock.mockResolvedValueOnce({
      id: "sig_existing",
      severity: "WARN",
      payload: { riskScore: 42, reason: "old evidence" },
    });

    await emitFlag("sub_1", {
      type: "BOT_SUSPECTED",
      severity: "CRITICAL",
      payload: { reason: "new evidence", riskScore: 78 },
    });

    expect(createSignalMock).not.toHaveBeenCalled();
    expect(updateSignalMock).toHaveBeenCalledWith({
      where: { id: "sig_existing" },
      data: {
        severity: "CRITICAL",
        payload: { reason: "new evidence", riskScore: 78 },
      },
    });
  });
});

describe("pollSubmissions earnings refresh", () => {
  it("updates approved unlocked submission earnings when metrics cross the campaign threshold", async () => {
    const capturedAt = new Date("2026-05-12T10:00:00.000Z");
    findManySubmissionMock.mockResolvedValueOnce([
      {
        id: "sub_1",
        postUrl: "https://www.instagram.com/reel/test",
        creatorId: "creator_1",
        campaignId: "campaign_1",
        status: "APPROVED",
        sourceConnectionType: "IG",
        sourceConnectionId: "ig-conn-1",
        baselineViews: 0,
        settledAt: null,
        payoutRunItems: [],
        campaign: {
          creatorCpv: 0.01,
          minimumPaidViews: 5000,
          maximumPaidViews: null,
        },
      },
    ]);
    routeMetricMock.mockResolvedValueOnce({
      ok: true,
      source: "OAUTH_IG",
      viewCount: BigInt(5000),
      likeCount: 100,
      commentCount: 10,
      shareCount: 5,
      saveCount: null,
      watchTimeSec: null,
      reachCount: null,
      metricAvailability: availableCoreMetrics,
      raw: null,
      connection: { type: "IG", id: "conn_1" },
    });
    createMetricSnapshotMock.mockResolvedValueOnce({
      id: "snap_1",
      viewCount: BigInt(5000),
      capturedAt,
    });
    findManyMetricSnapshotMock.mockResolvedValueOnce([
      {
        capturedAt,
        viewCount: BigInt(5000),
        likeCount: 100,
        commentCount: 10,
        shareCount: 5,
      },
    ]);

    const result = await pollSubmissions({ tier: "hot", limit: 1 });

    expect(result.succeeded).toBe(1);
    expect(updateSubmissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub_1" },
        data: expect.objectContaining({
          viewCount: 5000,
          eligibleViews: 5000,
          earnedAmount: 50,
        }),
      }),
    );
  });

  it("passes campaign benchmark and account snapshot context into the velocity scorer", async () => {
    const capturedAt = new Date("2026-05-12T10:00:00.000Z");
    const snapshots = [
      {
        capturedAt,
        viewCount: BigInt(5000),
        likeCount: 100,
        commentCount: 10,
        shareCount: 5,
      },
    ];
    findManySubmissionMock.mockResolvedValueOnce([
      {
        id: "sub_1",
        postUrl: "https://www.instagram.com/reel/test",
        creatorId: "creator_1",
        campaignId: "campaign_1",
        status: "PENDING",
        sourceConnectionType: null,
        sourceConnectionId: null,
        baselineViews: 0,
        settledAt: null,
        payoutRunItems: [],
        campaign: {
          creatorCpv: 0.01,
          minimumPaidViews: 0,
          maximumPaidViews: null,
        },
      },
    ]);
    routeMetricMock.mockResolvedValueOnce({
      ok: true,
      source: "OAUTH_IG",
      viewCount: BigInt(5000),
      likeCount: 100,
      commentCount: 10,
      shareCount: 5,
      saveCount: null,
      watchTimeSec: null,
      reachCount: null,
      metricAvailability: availableCoreMetrics,
      raw: null,
      connection: { type: "IG", id: "conn_1" },
    });
    createMetricSnapshotMock.mockResolvedValueOnce({
      id: "snap_1",
      viewCount: BigInt(5000),
      capturedAt,
    });
    findManyMetricSnapshotMock.mockResolvedValueOnce(snapshots);
    findFirstCampaignBenchmarkMock.mockResolvedValueOnce({
      velocityP50: 1000,
      velocityP90: 3000,
    });
    findFirstPlatformAccountSnapshotMock.mockResolvedValueOnce({
      audienceCount: 750,
    });

    await pollSubmissions({ tier: "hot", limit: 1 });

    expect(scoreVelocityMock).toHaveBeenCalledWith({
      snapshots,
      campaignBenchmark: { velocityP50: 1000, velocityP90: 3000 },
      accountSnapshot: { audienceCount: 750 },
      now: capturedAt,
    });
  });

  it("passes stored source connection fields into the metric router", async () => {
    findManySubmissionMock.mockResolvedValueOnce([
      {
        id: "sub_1",
        postUrl: "https://www.instagram.com/reel/test",
        creatorId: "creator_1",
        campaignId: "campaign_1",
        status: "PENDING",
        sourceConnectionType: "IG",
        sourceConnectionId: "ig-conn-1",
        baselineViews: 0,
        settledAt: null,
        payoutRunItems: [],
        campaign: {
          creatorCpv: 0.01,
          minimumPaidViews: 0,
          maximumPaidViews: null,
        },
      },
    ]);
    routeMetricMock.mockResolvedValueOnce({
      ok: false,
      source: "OAUTH_FAILED",
      reason: "POST_NOT_FOUND",
      message: "missing",
      connection: { type: "IG", id: "ig-conn-1" },
    });

    await pollSubmissions({ tier: "hot", limit: 1 });

    expect(routeMetricMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sub_1",
        sourceConnectionType: "IG",
        sourceConnectionId: "ig-conn-1",
      }),
    );
  });
});
