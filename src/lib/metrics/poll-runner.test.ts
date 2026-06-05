import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstSignalMock = vi.fn();
const createSignalMock = vi.fn();
const updateSignalMock = vi.fn();
const findManySubmissionMock = vi.fn();
const updateSubmissionMock = vi.fn();
const updateManySubmissionMock = vi.fn();
const findUniqueCampaignMock = vi.fn();
const findFirstTikTokConnectionMock = vi.fn();
const transactionMock = vi.fn();
const createMetricSnapshotMock = vi.fn();
const findManyMetricSnapshotMock = vi.fn();
const createMetricPollFailureMock = vi.fn();
const findFirstCampaignBenchmarkMock = vi.fn();
const findFirstPlatformAccountSnapshotMock = vi.fn();
const publishEventMock = vi.fn();
const routeMetricMock = vi.fn();
const fetchTikTokMetricsByVideoIdsMock = vi.fn();
const scoreVelocityMock = vi.fn();
const syncAntiBotSignalMock = vi.fn();
const reconcileReferralPayoutForSubmissionMock = vi.fn();
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
    $transaction: (...args: unknown[]) => transactionMock(...args),
    campaign: {
      findUnique: (...args: unknown[]) => findUniqueCampaignMock(...args),
    },
    campaignSubmission: {
      findMany: (...args: unknown[]) => findManySubmissionMock(...args),
      update: (...args: unknown[]) => updateSubmissionMock(...args),
      updateMany: (...args: unknown[]) => updateManySubmissionMock(...args),
    },
    creatorTikTokConnection: {
      findFirst: (...args: unknown[]) => findFirstTikTokConnectionMock(...args),
    },
    metricSnapshot: {
      create: (...args: unknown[]) => createMetricSnapshotMock(...args),
      findMany: (...args: unknown[]) => findManyMetricSnapshotMock(...args),
    },
    metricPollFailure: {
      create: (...args: unknown[]) => createMetricPollFailureMock(...args),
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

vi.mock("./tiktok", () => ({
  fetchTikTokMetricsByVideoIds: (...args: unknown[]) => fetchTikTokMetricsByVideoIdsMock(...args),
}));

vi.mock("@/lib/velocity-scorer", () => ({
  scoreVelocity: (...args: unknown[]) => scoreVelocityMock(...args),
}));

vi.mock("./anti-bot-signal", () => ({
  syncAntiBotSignal: (...args: unknown[]) => syncAntiBotSignalMock(...args),
}));

vi.mock("@/lib/referral-reconciliation", () => ({
  reconcileReferralPayoutForSubmission: (...args: unknown[]) =>
    reconcileReferralPayoutForSubmissionMock(...args),
}));

import { emitFlag, pollSubmissions } from "./poll-runner";

beforeEach(() => {
  findFirstSignalMock.mockReset();
  createSignalMock.mockReset();
  updateSignalMock.mockReset();
  findManySubmissionMock.mockReset();
  updateSubmissionMock.mockReset();
  updateManySubmissionMock.mockReset();
  findUniqueCampaignMock.mockReset();
  findFirstTikTokConnectionMock.mockReset();
  transactionMock.mockReset();
  createMetricSnapshotMock.mockReset();
  findManyMetricSnapshotMock.mockReset();
  createMetricPollFailureMock.mockReset();
  findFirstCampaignBenchmarkMock.mockReset();
  findFirstPlatformAccountSnapshotMock.mockReset();
  publishEventMock.mockReset();
  routeMetricMock.mockReset();
  fetchTikTokMetricsByVideoIdsMock.mockReset();
  scoreVelocityMock.mockReset();
  syncAntiBotSignalMock.mockReset();
  reconcileReferralPayoutForSubmissionMock.mockReset();

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
  updateManySubmissionMock.mockResolvedValue({ count: 1 });
  findUniqueCampaignMock.mockResolvedValue(null);
  findFirstTikTokConnectionMock.mockResolvedValue(null);
  fetchTikTokMetricsByVideoIdsMock.mockResolvedValue(new Map());
  transactionMock.mockImplementation(async (callback) =>
    callback({
      campaign: { findUnique: (...args: unknown[]) => findUniqueCampaignMock(...args) },
      campaignSubmission: { update: (...args: unknown[]) => updateSubmissionMock(...args) },
    }),
  );
  createMetricSnapshotMock.mockResolvedValue({
    id: "snap_1",
    viewCount: BigInt(0),
    capturedAt: new Date("2026-05-12T10:00:00.000Z"),
  });
  createMetricPollFailureMock.mockResolvedValue({ id: "failure_1" });
  findManyMetricSnapshotMock.mockResolvedValue([]);
  scoreVelocityMock.mockReturnValue({
    velocity: null,
    ratios: null,
    flags: [],
    velocityScore: null,
    antiBot: null,
  });
  syncAntiBotSignalMock.mockResolvedValue({ action: "unchanged" });
  reconcileReferralPayoutForSubmissionMock.mockResolvedValue({ action: "unchanged" });
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
    expect(reconcileReferralPayoutForSubmissionMock).toHaveBeenCalledWith(
      expect.any(Object),
      "sub_1",
    );
  });

  it("keeps refreshed views but caps refreshed earnings at the remaining campaign budget", async () => {
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
    findManyMetricSnapshotMock.mockResolvedValueOnce([
      {
        capturedAt,
        viewCount: BigInt(5000),
        likeCount: 100,
        commentCount: 10,
        shareCount: 5,
      },
    ]);
    findUniqueCampaignMock.mockResolvedValueOnce({
      totalBudget: 60,
      creatorCpv: 0.01,
      campaignSubmissions: [
        {
          id: "older_sub",
          eligibleViews: 5000,
          earnedAmount: 50,
          reviewedAt: new Date("2026-05-12T08:00:00.000Z"),
          createdAt: new Date("2026-05-12T07:55:00.000Z"),
          settledAt: null,
          payoutRunItems: [],
        },
        {
          id: "sub_1",
          eligibleViews: 5000,
          earnedAmount: 50,
          reviewedAt: new Date("2026-05-12T09:00:00.000Z"),
          createdAt: new Date("2026-05-12T08:55:00.000Z"),
          settledAt: null,
          payoutRunItems: [],
        },
      ],
    });

    const result = await pollSubmissions({ tier: "hot", limit: 1 });

    expect(result.succeeded).toBe(1);
    expect(updateSubmissionMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "sub_1" },
        data: expect.objectContaining({
          viewCount: 5000,
          eligibleViews: 5000,
          earnedAmount: 50,
        }),
      }),
    );
    expect(updateSubmissionMock).toHaveBeenNthCalledWith(
      2,
      {
        where: { id: "sub_1" },
        data: { earnedAmount: 10 },
      },
    );
    expect(reconcileReferralPayoutForSubmissionMock).toHaveBeenCalledWith(
      expect.any(Object),
      "sub_1",
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

  it("syncs the latest anti-bot payload after a successful poll even when no BOT flag is emitted", async () => {
    const capturedAt = new Date("2026-05-12T10:00:00.000Z");
    const antiBotPayload = {
      reason: "Anti-bot risk 0/100",
      riskScore: 0,
      confidence: "LOW",
      reasons: [],
      evidence: [],
      evaluatedAt: capturedAt.toISOString(),
      version: "anti-bot-v3",
    };
    findManySubmissionMock.mockResolvedValueOnce([
      {
        id: "sub_healthy",
        postUrl: "https://www.tiktok.com/@u/video/1",
        creatorId: "creator_1",
        campaignId: "campaign_1",
        status: "PENDING",
        sourceConnectionType: "TT",
        sourceConnectionId: "tt-conn-1",
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
      source: "OAUTH_TT",
      viewCount: BigInt(10000),
      likeCount: 400,
      commentCount: 30,
      shareCount: 20,
      saveCount: null,
      watchTimeSec: null,
      reachCount: null,
      metricAvailability: availableCoreMetrics,
      raw: null,
      connection: { type: "TT", id: "tt-conn-1" },
    });
    createMetricSnapshotMock.mockResolvedValueOnce({
      id: "snap_healthy",
      viewCount: BigInt(10000),
      capturedAt,
    });
    findManyMetricSnapshotMock.mockResolvedValueOnce([
      {
        capturedAt: new Date("2026-05-12T09:45:00.000Z"),
        viewCount: BigInt(9000),
        likeCount: 360,
        commentCount: 30,
        shareCount: 20,
        saveCount: null,
        metricAvailability: availableCoreMetrics,
      },
      {
        capturedAt,
        viewCount: BigInt(10000),
        likeCount: 400,
        commentCount: 30,
        shareCount: 20,
        saveCount: null,
        metricAvailability: availableCoreMetrics,
      },
    ]);
    scoreVelocityMock.mockReturnValueOnce({
      velocity: null,
      ratios: null,
      flags: [],
      velocityScore: null,
      antiBot: antiBotPayload,
    });

    await pollSubmissions({ tier: "hot", limit: 1 });

    expect(syncAntiBotSignalMock).toHaveBeenCalledWith("sub_healthy", antiBotPayload);
    expect(findFirstSignalMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "BOT_SUSPECTED" }),
      }),
    );
  });

  it("does not emit duplicate BOT_SUSPECTED flags after syncing the anti-bot payload", async () => {
    const capturedAt = new Date("2026-05-12T10:00:00.000Z");
    const antiBotPayload = {
      reason: "Anti-bot risk 45/100",
      riskScore: 45,
      confidence: "MEDIUM",
      reasons: ["risk"],
      evidence: [],
      evaluatedAt: capturedAt.toISOString(),
      version: "anti-bot-v3",
    };
    findManySubmissionMock.mockResolvedValueOnce([
      {
        id: "sub_warn",
        postUrl: "https://www.tiktok.com/@u/video/2",
        creatorId: "creator_1",
        campaignId: "campaign_1",
        status: "PENDING",
        sourceConnectionType: "TT",
        sourceConnectionId: "tt-conn-1",
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
      source: "OAUTH_TT",
      viewCount: BigInt(10000),
      likeCount: 20,
      commentCount: 0,
      shareCount: 0,
      saveCount: null,
      watchTimeSec: null,
      reachCount: null,
      metricAvailability: availableCoreMetrics,
      raw: null,
      connection: { type: "TT", id: "tt-conn-1" },
    });
    createMetricSnapshotMock.mockResolvedValueOnce({
      id: "snap_warn",
      viewCount: BigInt(10000),
      capturedAt,
    });
    findManyMetricSnapshotMock.mockResolvedValueOnce([
      {
        capturedAt,
        viewCount: BigInt(10000),
        likeCount: 20,
        commentCount: 0,
        shareCount: 0,
        saveCount: null,
        metricAvailability: availableCoreMetrics,
      },
    ]);
    scoreVelocityMock.mockReturnValueOnce({
      velocity: null,
      ratios: null,
      flags: [
        {
          type: "BOT_SUSPECTED",
          severity: "WARN",
          payload: antiBotPayload,
        },
      ],
      velocityScore: null,
      antiBot: antiBotPayload,
    });

    await pollSubmissions({ tier: "hot", limit: 1 });

    expect(syncAntiBotSignalMock).toHaveBeenCalledWith("sub_warn", antiBotPayload);
    expect(findFirstSignalMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "BOT_SUSPECTED" }),
      }),
    );
  });
});

describe("pollSubmissions scheduling", () => {
  function dueSubmission(overrides: Record<string, unknown> = {}) {
    return {
      id: "sub_due",
      postUrl: "https://www.instagram.com/reel/test",
      normalizedPlatform: "INSTAGRAM",
      platformVideoId: "test",
      creatorId: "creator_1",
      campaignId: "campaign_1",
      status: "APPROVED",
      sourceConnectionType: "IG",
      sourceConnectionId: "ig-conn-1",
      baselineViews: 0,
      settledAt: null,
      metricsRefreshFailures: 0,
      payoutRunItems: [],
      campaign: {
        status: "active",
        deadline: new Date("2026-05-20T00:00:00.000Z"),
        creatorCpv: 0.01,
        minimumPaidViews: 0,
        maximumPaidViews: null,
      },
      ...overrides,
    };
  }

  function successfulMetric(source = "OAUTH_IG") {
    return {
      ok: true,
      source,
      viewCount: BigInt(5000),
      likeCount: 100,
      commentCount: 10,
      shareCount: 5,
      saveCount: null,
      watchTimeSec: null,
      reachCount: null,
      metricAvailability: availableCoreMetrics,
      raw: null,
      connection: { type: source === "OAUTH_TT" ? "TT" : "IG", id: source === "OAUTH_TT" ? "tt-conn-1" : "ig-conn-1" },
    };
  }

  it("stores failed attempts outside MetricSnapshot and preserves the last successful refresh", async () => {
    findManySubmissionMock.mockResolvedValueOnce([
      dueSubmission({
        id: "sub_failed",
        normalizedPlatform: "INSTAGRAM",
        sourceConnectionType: "IG",
        sourceConnectionId: "ig-conn-1",
      }),
    ]);
    routeMetricMock.mockResolvedValueOnce({
      ok: false,
      source: "OAUTH_FAILED",
      reason: "API_SCHEMA_ERROR",
      message: "invalid views field",
      connection: { type: "IG", id: "ig-conn-1" },
      details: {
        httpStatus: 400,
        providerCode: 100,
        providerType: "OAuthException",
        raw: { error: { code: 100 } },
      },
    });

    await pollSubmissions({ tier: "hot", limit: 1 });

    expect(createMetricSnapshotMock).not.toHaveBeenCalled();
    expect(createMetricPollFailureMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: "sub_failed",
        reason: "API_SCHEMA_ERROR",
        httpStatus: 400,
        providerCode: 100,
        providerType: "OAuthException",
        connectionType: "IG",
        connectionId: "ig-conn-1",
      }),
    });
    expect(updateSubmissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub_failed" },
        data: expect.objectContaining({
          lastMetricsErrorCode: "API_SCHEMA_ERROR",
          lastMetricsErrorMessage: "invalid views field",
          lastMetricsErrorAt: expect.any(Date),
        }),
      }),
    );
    const update = updateSubmissionMock.mock.calls.at(-1)?.[0];
    expect(update.data).not.toHaveProperty("lastMetricsRefreshAt");
  });

  it("selects hot rows from active campaigns by nextMetricsPollAt instead of submission age", async () => {
    await pollSubmissions({ tier: "hot", limit: 5 });

    expect(findManySubmissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { status: { in: ["PENDING", "APPROVED", "FLAGGED"] } },
            expect.objectContaining({
              campaign: expect.objectContaining({ status: "active" }),
            }),
            expect.objectContaining({
              OR: [
                { nextMetricsPollAt: null },
                { nextMetricsPollAt: expect.any(Object) },
              ],
            }),
          ]),
        }),
      }),
    );
  });

  it("schedules active campaign successes 15 minutes after capture", async () => {
    const capturedAt = new Date("2026-05-12T10:00:00.000Z");
    findManySubmissionMock.mockResolvedValueOnce([dueSubmission()]);
    routeMetricMock.mockResolvedValueOnce(successfulMetric());
    createMetricSnapshotMock.mockResolvedValueOnce({
      id: "snap_active",
      viewCount: BigInt(5000),
      capturedAt,
    });

    await pollSubmissions({ tier: "hot", limit: 1 });

    expect(updateSubmissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub_due" },
        data: expect.objectContaining({
          nextMetricsPollAt: new Date("2026-05-12T10:15:00.000Z"),
          metricsPollLockedAt: null,
        }),
      }),
    );
  });

  it("keeps old ended campaigns on a weekly cadence instead of turning them off", async () => {
    const capturedAt = new Date("2026-05-12T10:00:00.000Z");
    findManySubmissionMock.mockResolvedValueOnce([
      dueSubmission({
        campaign: {
          status: "completed",
          deadline: new Date("2026-01-01T00:00:00.000Z"),
          creatorCpv: 0.01,
          minimumPaidViews: 0,
          maximumPaidViews: null,
        },
      }),
    ]);
    routeMetricMock.mockResolvedValueOnce(successfulMetric());
    createMetricSnapshotMock.mockResolvedValueOnce({
      id: "snap_old",
      viewCount: BigInt(5000),
      capturedAt,
    });

    await pollSubmissions({ tier: "cold", limit: 1 });

    expect(updateSubmissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub_due" },
        data: expect.objectContaining({
          nextMetricsPollAt: new Date("2026-05-19T10:00:00.000Z"),
          metricsPollLockedAt: null,
        }),
      }),
    );
  });

  it("prefetches TikTok metrics in batches by stored source connection", async () => {
    const capturedAt = new Date("2026-05-12T10:00:00.000Z");
    const subA = dueSubmission({
      id: "sub_tt_a",
      postUrl: "https://www.tiktok.com/@u/video/vid_a",
      normalizedPlatform: "TIKTOK",
      platformVideoId: "vid_a",
      sourceConnectionType: "TT",
      sourceConnectionId: "tt-conn-1",
    });
    const subB = dueSubmission({
      id: "sub_tt_b",
      postUrl: "https://www.tiktok.com/@u/video/vid_b",
      normalizedPlatform: "TIKTOK",
      platformVideoId: "vid_b",
      sourceConnectionType: "TT",
      sourceConnectionId: "tt-conn-1",
    });
    findManySubmissionMock.mockResolvedValueOnce([subA, subB]);
    findFirstTikTokConnectionMock.mockResolvedValueOnce({ id: "tt-conn-1" });
    fetchTikTokMetricsByVideoIdsMock.mockResolvedValueOnce(
      new Map([
        ["sub_tt_a", successfulMetric("OAUTH_TT")],
        ["sub_tt_b", successfulMetric("OAUTH_TT")],
      ]),
    );
    createMetricSnapshotMock
      .mockResolvedValueOnce({ id: "snap_a", viewCount: BigInt(5000), capturedAt })
      .mockResolvedValueOnce({ id: "snap_b", viewCount: BigInt(5000), capturedAt });

    await pollSubmissions({ tier: "hot", limit: 2 });

    expect(fetchTikTokMetricsByVideoIdsMock).toHaveBeenCalledWith(
      { id: "tt-conn-1" },
      [
        { submissionId: "sub_tt_a", videoId: "vid_a" },
        { submissionId: "sub_tt_b", videoId: "vid_b" },
      ],
    );
    expect(routeMetricMock).not.toHaveBeenCalled();
  });
});
