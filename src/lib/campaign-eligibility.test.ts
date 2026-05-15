import { describe, expect, it } from "vitest";
import {
  buildConnectRequiredMessage,
  evaluateCampaignJoinEligibility,
} from "./campaign-eligibility";

describe("evaluateCampaignJoinEligibility", () => {
  it("allows a creator with a verified matching platform", () => {
    const result = evaluateCampaignJoinEligibility(["TIKTOK"], {
      tiktok: true,
    });

    expect(result.eligible).toBe(true);
    expect(result.matchedPlatforms).toEqual(["TIKTOK"]);
    expect(result.missingPlatforms).toEqual([]);
  });

  it("blocks a creator without a matching platform and reports the required label", () => {
    const result = evaluateCampaignJoinEligibility(["YOUTUBE_SHORTS"], {
      tiktok: true,
    });

    expect(result.eligible).toBe(false);
    expect(result.missingPlatforms).toEqual(["YOUTUBE_SHORTS"]);
    expect(result.missingPlatformLabels).toEqual(["YouTube"]);
  });

  it("allows any matching platform when a campaign supports multiple platforms", () => {
    const result = evaluateCampaignJoinEligibility(["INSTAGRAM", "TIKTOK"], {
      instagram: true,
      tiktok: false,
    });

    expect(result.eligible).toBe(true);
    expect(result.matchedPlatforms).toEqual(["INSTAGRAM"]);
  });

  it("allows any verified supported account for legacy empty platform campaigns", () => {
    const result = evaluateCampaignJoinEligibility([], {
      facebook: true,
    });

    expect(result.eligible).toBe(true);
    expect(result.requiredPlatforms).toEqual([
      "INSTAGRAM",
      "TIKTOK",
      "YOUTUBE_SHORTS",
      "FACEBOOK",
    ]);
  });

  it("keeps X as missing until X connections exist", () => {
    const result = evaluateCampaignJoinEligibility(["X"], {
      instagram: true,
      tiktok: true,
      youtube: true,
      facebook: true,
    });

    expect(result.eligible).toBe(false);
    expect(result.missingPlatforms).toEqual(["X"]);
    expect(result.missingPlatformLabels).toEqual(["X"]);
  });
});

describe("buildConnectRequiredMessage", () => {
  it("formats a single account requirement", () => {
    expect(buildConnectRequiredMessage(["TikTok"])).toBe(
      "Connect your TikTok account to join this campaign.",
    );
  });

  it("formats multiple account requirements", () => {
    expect(buildConnectRequiredMessage(["Instagram", "TikTok", "YouTube"])).toBe(
      "Connect your Instagram, TikTok, or YouTube accounts to join this campaign.",
    );
  });
});
