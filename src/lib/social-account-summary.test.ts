import { describe, expect, it } from "vitest";
import {
  applyLatestAccountSnapshots,
  type SocialAccountSummary,
} from "./social-account-summary";

function account(
  overrides: Partial<SocialAccountSummary> = {},
): SocialAccountSummary {
  return {
    platform: "yt",
    connectionType: "YT",
    id: "yt-1",
    creatorProfileId: "creator-1",
    label: "ClipProfit",
    handle: "ClipProfit",
    matchHandle: "ClipProfit",
    audienceCount: null,
    countLabel: "subscribers",
    isVerified: true,
    tokenExpiresAt: null,
    accountRefreshStatus: "SUCCESS",
    lastRefreshAttemptAt: null,
    lastSuccessfulRefreshAt: new Date("2026-05-17T10:00:00.000Z"),
    lastRefreshFailedAt: null,
    lastRefreshErrorCode: null,
    lastRefreshErrorMessage: null,
    ...overrides,
  };
}

describe("applyLatestAccountSnapshots", () => {
  it("uses the latest PlatformAccountSnapshot audienceCount for YouTube subscribers", () => {
    const [summary] = applyLatestAccountSnapshots(
      [account()],
      [
        {
          connectionType: "YT",
          connectionId: "yt-1",
          audienceCount: 100,
          capturedAt: new Date("2026-05-16T10:00:00.000Z"),
        },
        {
          connectionType: "YT",
          connectionId: "yt-1",
          audienceCount: 250,
          capturedAt: new Date("2026-05-17T10:00:00.000Z"),
        },
      ],
    );

    expect(summary.audienceCount).toBe(250);
    expect(summary.countLabel).toBe("subscribers");
  });

  it("does not borrow a snapshot from another platform with the same id", () => {
    const [summary] = applyLatestAccountSnapshots(
      [account({ platform: "ig", connectionType: "IG", id: "shared", countLabel: "followers" })],
      [
        {
          connectionType: "YT",
          connectionId: "shared",
          audienceCount: 999,
          capturedAt: new Date("2026-05-17T10:00:00.000Z"),
        },
      ],
    );

    expect(summary.audienceCount).toBeNull();
  });
});
