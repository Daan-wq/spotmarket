import { describe, expect, it } from "vitest";
import {
  buildCampaignLeaderboardRows,
  campaignLeaderboardEarnings,
  campaignLeaderboardViews,
  type CampaignLeaderboardSubmission,
} from "./campaign-leaderboard";

function submission(
  overrides: Partial<CampaignLeaderboardSubmission> = {},
): CampaignLeaderboardSubmission {
  return {
    creatorId: "user_1",
    postUrl: "https://example.com/post",
    viewCount: 10_000,
    claimedViews: 0,
    eligibleViews: null,
    baselineViews: 1_000,
    earnedAmount: 0,
    campaign: {
      creatorCpv: 0.001,
      minimumPaidViews: 2_000,
      maximumPaidViews: 7_500,
    },
    creator: {
      email: "creator@example.com",
      discordUsername: "discord_creator",
      creatorProfile: {
        id: "profile_1",
        username: "profile_creator",
        avatarUrl: null,
      },
    },
    ...overrides,
  };
}

describe("campaign leaderboard helpers", () => {
  it("uses stored eligible views before recalculating payable views", () => {
    expect(campaignLeaderboardViews(submission({ eligibleViews: 1_234 }))).toBe(1_234);
  });

  it("falls back to campaign payable views when stored earned amount is zero", () => {
    expect(campaignLeaderboardViews(submission())).toBe(7_500);
    expect(campaignLeaderboardEarnings(submission())).toBe(7.5);
  });

  it("keeps stored earned amount when it is already tracked", () => {
    expect(campaignLeaderboardEarnings(submission({ earnedAmount: "12.34" }))).toBe(12.34);
  });

  it("aggregates earnings and views per creator", () => {
    const rows = buildCampaignLeaderboardRows([
      submission({ creatorId: "user_1", viewCount: 10_000, earnedAmount: 0 }),
      submission({
        creatorId: "user_1",
        postUrl: "https://example.com/better",
        viewCount: 20_000,
        earnedAmount: 5,
      }),
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        creatorId: "user_1",
        displayName: "discord_creator",
        submissionCount: 2,
        totalViews: 15_000,
        totalEarned: 12.5,
        bestPostUrl: "https://example.com/post",
        bestPostViews: 7_500,
      }),
    ]);
  });
});
