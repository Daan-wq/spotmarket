import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rawApiResponse: {
      create: (...args: unknown[]) => createMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
    },
  },
}));

import { recordRawApiResponse, pruneRawApiResponses } from "./raw-storage";

beforeEach(() => {
  createMock.mockReset();
  deleteManyMock.mockReset();
  createMock.mockResolvedValue({ id: "raw_1" });
  deleteManyMock.mockResolvedValue({ count: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordRawApiResponse", () => {
  it("persists payload with provided endpoint and connection metadata", async () => {
    await recordRawApiResponse({
      submissionId: "sub_1",
      connectionType: "IG",
      connectionId: "conn_1",
      endpoint: "instagram.media.insights",
      payload: { foo: "bar", views: 42 },
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        submissionId: "sub_1",
        connectionType: "IG",
        connectionId: "conn_1",
        endpoint: "instagram.media.insights",
        payload: { foo: "bar", views: 42 },
      },
    });
  });

  it("allows null submissionId for connection-level snapshots", async () => {
    await recordRawApiResponse({
      submissionId: null,
      connectionType: "YT",
      connectionId: "conn_yt",
      endpoint: "youtube.analytics.daily",
      payload: { rows: [] },
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ submissionId: null }),
      }),
    );
  });

  it("skips persistence when payload is null", async () => {
    await recordRawApiResponse({
      submissionId: "sub_2",
      connectionType: "IG",
      connectionId: "conn_2",
      endpoint: "instagram.media.insights",
      payload: null,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("never throws even when the database fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createMock.mockRejectedValueOnce(new Error("db down"));

    await expect(
      recordRawApiResponse({
        submissionId: "sub_3",
        connectionType: "TT",
        connectionId: "conn_3",
        endpoint: "tiktok.video.list",
        payload: { x: 1 },
      }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("pruneRawApiResponses", () => {
  it("deletes rows older than the configured TTL and returns the count", async () => {
    deleteManyMock.mockResolvedValueOnce({ count: 17 });

    const before = Date.now();
    const deleted = await pruneRawApiResponses(90);
    const after = Date.now();

    expect(deleted).toBe(17);
    expect(deleteManyMock).toHaveBeenCalledTimes(1);
    const call = deleteManyMock.mock.calls[0][0];
    expect(call.where.capturedAt.lt).toBeInstanceOf(Date);
    const cutoff = (call.where.capturedAt.lt as Date).getTime();
    const expectedMin = before - 90 * 24 * 60 * 60 * 1000;
    const expectedMax = after - 90 * 24 * 60 * 60 * 1000;
    expect(cutoff).toBeGreaterThanOrEqual(expectedMin);
    expect(cutoff).toBeLessThanOrEqual(expectedMax);
  });

  it("defaults to 90 days when no argument provided", async () => {
    await pruneRawApiResponses();
    const call = deleteManyMock.mock.calls[0][0];
    const cutoff = (call.where.capturedAt.lt as Date).getTime();
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    // within a 5-second tolerance
    expect(Math.abs(cutoff - ninetyDaysAgo)).toBeLessThan(5_000);
  });
});
