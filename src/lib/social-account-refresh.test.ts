import { describe, expect, it, vi } from "vitest";
import {
  normalizeAccountRefreshError,
  recordAccountRefreshFailure,
  recordAccountRefreshSuccess,
} from "./social-account-refresh";

describe("social account refresh recording", () => {
  it("records a successful YouTube refresh as an audience snapshot and status update", async () => {
    const db = {
      platformAccountSnapshot: { create: vi.fn().mockResolvedValue({}) },
      creatorIgConnection: { update: vi.fn() },
      creatorFbConnection: { update: vi.fn() },
      creatorYtConnection: { update: vi.fn().mockResolvedValue({}) },
      creatorTikTokConnection: { update: vi.fn() },
    };
    const capturedAt = new Date("2026-05-17T12:00:00.000Z");

    await recordAccountRefreshSuccess(
      {
        connectionType: "YT",
        connectionId: "yt-1",
        audienceCount: 1234,
        videoCount: 12,
        capturedAt,
      },
      db as never,
    );

    expect(db.platformAccountSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        connectionType: "YT",
        connectionId: "yt-1",
        audienceCount: 1234,
        videoCount: 12,
        capturedAt,
      }),
    });
    expect(db.creatorYtConnection.update).toHaveBeenCalledWith({
      where: { id: "yt-1" },
      data: expect.objectContaining({
        accountRefreshStatus: "SUCCESS",
        lastRefreshAttemptAt: capturedAt,
        lastSuccessfulRefreshAt: capturedAt,
        subscriberCount: 1234,
        videoCount: 12,
        lastRefreshErrorCode: null,
      }),
    });
  });

  it("records a failed refresh without clearing the last successful timestamp", async () => {
    const db = {
      creatorIgConnection: { update: vi.fn().mockResolvedValue({}) },
      creatorFbConnection: { update: vi.fn() },
      creatorYtConnection: { update: vi.fn() },
      creatorTikTokConnection: { update: vi.fn() },
    };
    const attemptedAt = new Date("2026-05-17T12:00:00.000Z");

    await recordAccountRefreshFailure(
      {
        connectionType: "IG",
        connectionId: "ig-1",
        error: new Error("Token expired"),
        code: "TOKEN_EXPIRED",
        attemptedAt,
      },
      db as never,
    );

    expect(db.creatorIgConnection.update).toHaveBeenCalledWith({
      where: { id: "ig-1" },
      data: expect.not.objectContaining({
        lastSuccessfulRefreshAt: expect.anything(),
      }),
    });
    expect(db.creatorIgConnection.update).toHaveBeenCalledWith({
      where: { id: "ig-1" },
      data: expect.objectContaining({
        accountRefreshStatus: "FAILED",
        lastRefreshAttemptAt: attemptedAt,
        lastRefreshFailedAt: attemptedAt,
        lastRefreshErrorCode: "TOKEN_EXPIRED",
        lastRefreshErrorMessage: "Token expired",
      }),
    });
  });

  it("normalizes unknown errors into a clear refresh failure message", () => {
    expect(normalizeAccountRefreshError(null)).toEqual({
      code: "REFRESH_FAILED",
      message: "Account refresh failed",
    });
  });
});
