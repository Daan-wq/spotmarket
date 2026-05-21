import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstSignalMock = vi.fn();
const createSignalMock = vi.fn();
const findManySubmissionMock = vi.fn();
const updateSubmissionMock = vi.fn();
const createMetricSnapshotMock = vi.fn();
const findManyMetricSnapshotMock = vi.fn();
const publishEventMock = vi.fn();
const routeMetricMock = vi.fn();
const scoreVelocityMock = vi.fn();

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
  findManySubmissionMock.mockReset();
  updateSubmissionMock.mockReset();
  createMetricSnapshotMock.mockReset();
  findManyMetricSnapshotMock.mockReset();
  publishEventMock.mockReset();
  routeMetricMock.mockReset();
  scoreVelocityMock.mockReset();

  findFirstSignalMock.mockResolvedValue(null);
  createSignalMock.mockResolvedValue({
    id: "sig_1",
    createdAt: new Date("2026-05-12T10:00:00.000Z"),
  });
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
      select: { id: true },
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
    expect(publishEventMock).not.toHaveBeenCalled();
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
        status: "APPROVED",
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
      raw: null,
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
});
