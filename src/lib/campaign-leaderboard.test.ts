import { describe, expect, it } from "vitest";
import {
  buildCampaignLeaderboardRows,
  campaignLeaderboardEarnings,
  campaignLeaderboardPayableViews,
  campaignLeaderboardTotalViews,
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
  it("uses stored positive eligible views before recalculating payable views", () => {
    expect(campaignLeaderboardPayableViews(submission({ eligibleViews: 1_234 }))).toBe(1_234);
  });

  it("falls back to campaign payable views when stored earned amount is zero", () => {
    expect(campaignLeaderboardPayableViews(submission())).toBe(7_500);
    expect(campaignLeaderboardEarnings(submission())).toBe(7.5);
  });

  it("does not treat stored zero eligible views as final when imported views are available", () => {
    expect(
      campaignLeaderboardPayableViews(
        submission({
          eligibleViews: 0,
          viewCount: 5_882,
          baselineViews: 0,
          campaign: {
            creatorCpv: 0.0004,
            minimumPaidViews: 2_000,
            maximumPaidViews: 100_000,
          },
        }),
      ),
    ).toBe(5_882);
  });

  it("shows total imported views separately from payable views", () => {
    const imported = submission({
      eligibleViews: 0,
      viewCount: 249,
      baselineViews: 1_000,
      campaign: {
        creatorCpv: 0.0004,
        minimumPaidViews: 2_000,
        maximumPaidViews: 100_000,
      },
    });

    expect(campaignLeaderboardTotalViews(imported)).toBe(249);
    expect(campaignLeaderboardPayableViews(imported)).toBe(0);
  });

  it("prefers latest metric snapshot for displayed and payable views", () => {
    const imported = submission({
      viewCount: 0,
      eligibleViews: 0,
      metricSnapshots: [{ viewCount: "10000" }],
    });

    expect(campaignLeaderboardTotalViews(imported)).toBe(10_000);
    expect(campaignLeaderboardPayableViews(imported)).toBe(7_500);
    expect(campaignLeaderboardEarnings(imported)).toBe(7.5);
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
        totalViews: 30_000,
        totalEarned: 12.5,
        bestPostUrl: "https://example.com/better",
        bestPostViews: 20_000,
      }),
    ]);
  });

  it("omits excluded test accounts", () => {
    const rows = buildCampaignLeaderboardRows([
      submission({
        creatorId: "test_user",
        creator: {
          email: "daan0529@icloud.com",
          discordUsername: "daans03",
          creatorProfile: { id: "test_profile", username: null, avatarUrl: null },
        },
      }),
      submission({ creatorId: "real_user" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.creatorId).toBe("real_user");
  });
});
