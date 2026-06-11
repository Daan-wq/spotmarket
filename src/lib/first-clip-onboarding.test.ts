import { describe, expect, it } from "vitest";
import {
  buildFirstClipOnboardingStatus,
  shouldForceFirstClipOnboarding,
} from "./first-clip-onboarding";

describe("buildFirstClipOnboardingStatus", () => {
  it("starts creators without Discord at the Discord connection step", () => {
    const status = buildFirstClipOnboardingStatus({
      discordConnected: false,
      accountConnected: false,
      joinedApplicationId: null,
      firstClipSubmitted: false,
    });

    expect(status.nextStep).toBe("discord");
    expect(status.nextHref).toContain("/api/auth/discord");
  });

  it("moves Discord-connected creators to social account connection", () => {
    const status = buildFirstClipOnboardingStatus({
      discordConnected: true,
      accountConnected: false,
      joinedApplicationId: null,
      firstClipSubmitted: false,
    });

    expect(status.nextStep).toBe("connect_account");
    expect(status.nextHref).toBe("/creator/connections?firstClip=1");
  });

  it("moves creators with a verified account to campaign joining", () => {
    const status = buildFirstClipOnboardingStatus({
      discordConnected: true,
      accountConnected: true,
      joinedApplicationId: null,
      firstClipSubmitted: false,
    });

    expect(status.nextStep).toBe("join_campaign");
    expect(status.nextHref).toBe("/creator/campaigns?firstClip=1");
  });

  it("sends creators with an open campaign application to submit their clip", () => {
    const status = buildFirstClipOnboardingStatus({
      discordConnected: true,
      accountConnected: true,
      joinedApplicationId: "application-1",
      firstClipSubmitted: false,
    });

    expect(status.hasJoinedCampaign).toBe(true);
    expect(status.nextStep).toBe("submit_clip");
    expect(status.nextHref).toBe("/creator/applications/application-1/submit?firstClip=1");
  });

  it("hides itself once the first clip has been submitted", () => {
    const status = buildFirstClipOnboardingStatus({
      discordConnected: true,
      accountConnected: true,
      joinedApplicationId: "application-1",
      firstClipSubmitted: true,
    });

    expect(status.nextStep).toBe("done");
    expect(status.nextHref).toBe("/creator/videos");
  });

  it("marks preview test overrides in the returned status", () => {
    const status = buildFirstClipOnboardingStatus({
      discordConnected: true,
      accountConnected: true,
      joinedApplicationId: "application-1",
      firstClipSubmitted: false,
      testOverrideActive: true,
    });

    expect(status.testOverrideActive).toBe(true);
    expect(status.nextStep).toBe("submit_clip");
  });
});

describe("shouldForceFirstClipOnboarding", () => {
  it("does nothing without configured test users", () => {
    expect(shouldForceFirstClipOnboarding("user-1", undefined)).toBe(false);
    expect(shouldForceFirstClipOnboarding("user-1", "")).toBe(false);
  });

  it("matches a configured user id from a comma-separated list", () => {
    expect(
      shouldForceFirstClipOnboarding(
        "user-2",
        " user-1, user-2 ,user-3 ",
      ),
    ).toBe(true);
  });
});
