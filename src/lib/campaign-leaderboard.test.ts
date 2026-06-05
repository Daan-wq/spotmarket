import { describe, expect, it } from "vitest";
import {
  buildCampaignLeaderboardDisplayRows,
  buildCampaignLeaderboardRows,
  campaignLeaderboardEarnings,
  campaignLeaderboardPayableViews,
  campaignLeaderboardTotalViews,
  selectCampaignLeaderboardRows,
  type CampaignLeaderboardSubmission,
  type ScoredCampaignLeaderboardRow,
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

  it("keeps stored zero earnings instead of recalculating an uncapped amount", () => {
    expect(campaignLeaderboardPayableViews(submission())).toBe(7_500);
    expect(campaignLeaderboardEarnings(submission())).toBe(0);
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
    expect(campaignLeaderboardEarnings(imported)).toBe(0);
  });

  it("ignores failed metric snapshots when a previous valid total exists", () => {
    const imported = submission({
      viewCount: 0,
      eligibleViews: 0,
      metricSnapshots: [
        { source: "OAUTH_FAILED", viewCount: 0 },
        { source: "OAUTH_TT", viewCount: 394_522 },
      ],
    });

    expect(campaignLeaderboardTotalViews(imported)).toBe(394_522);
  });

  it("keeps stored earned amount when it is already tracked", () => {
    expect(campaignLeaderboardEarnings(submission({ earnedAmount: "12.34" }))).toBe(12.34);
  });

  it("keeps stored zero earnings when positive eligible views are budget-capped", () => {
    expect(
      campaignLeaderboardEarnings(
        submission({ eligibleViews: 10_000, earnedAmount: 0 }),
      ),
    ).toBe(0);
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
        totalEarned: 5,
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

  it("selects the global top five and preserves the current creator's true rank", () => {
    const rows = Array.from({ length: 8 }, (_, index) =>
      leaderboardRow({
        creatorId: `creator_${index + 1}`,
        totalViews: 8_000 - index * 1_000,
      }),
    );

    const selected = selectCampaignLeaderboardRows(rows, {
      sort: "views",
      currentUserId: "creator_8",
      limit: 5,
    });

    expect(selected.leaderboard.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(selected.currentUserEntry).toEqual(
      expect.objectContaining({ creatorId: "creator_8", rank: 8 }),
    );
    expect(selected.totalClippers).toBe(8);
  });

  it("marks a current creator in the top five without adding a duplicate row", () => {
    const rows = Array.from({ length: 6 }, (_, index) =>
      leaderboardRow({
        creatorId: `creator_${index + 1}`,
        totalViews: 6_000 - index * 1_000,
      }),
    );
    const selected = selectCampaignLeaderboardRows(rows, {
      sort: "views",
      currentUserId: "creator_2",
      limit: 5,
    });

    const displayed = buildCampaignLeaderboardDisplayRows(
      selected.leaderboard,
      selected.currentUserEntry,
    );

    expect(displayed).toHaveLength(5);
    expect(displayed.filter((entry) => entry.isCurrentUser)).toHaveLength(1);
    expect(displayed.find((entry) => entry.isCurrentUser)?.row.rank).toBe(2);
  });

  it("adds the current creator below the top five when ranked lower", () => {
    const rows = Array.from({ length: 8 }, (_, index) =>
      leaderboardRow({
        creatorId: `creator_${index + 1}`,
        totalViews: 8_000 - index * 1_000,
      }),
    );
    const selected = selectCampaignLeaderboardRows(rows, {
      sort: "views",
      currentUserId: "creator_8",
      limit: 5,
    });

    const displayed = buildCampaignLeaderboardDisplayRows(
      selected.leaderboard,
      selected.currentUserEntry,
    );

    expect(displayed).toHaveLength(6);
    expect(displayed.at(-1)).toEqual(
      expect.objectContaining({
        isCurrentUser: true,
        isAdditional: true,
        row: expect.objectContaining({ creatorId: "creator_8", rank: 8 }),
      }),
    );
  });

  it("recalculates the current creator's rank for each selected sort", () => {
    const rows = [
      leaderboardRow({
        creatorId: "current",
        totalViews: 100,
        totalEarned: 500,
        score: 10,
      }),
      leaderboardRow({
        creatorId: "views_leader",
        totalViews: 1_000,
        totalEarned: 100,
        score: 20,
      }),
      leaderboardRow({
        creatorId: "score_leader",
        totalViews: 500,
        totalEarned: 200,
        score: 99,
      }),
    ];

    expect(
      selectCampaignLeaderboardRows(rows, {
        sort: "views",
        currentUserId: "current",
      }).currentUserEntry?.rank,
    ).toBe(3);
    expect(
      selectCampaignLeaderboardRows(rows, {
        sort: "earnings",
        currentUserId: "current",
      }).currentUserEntry?.rank,
    ).toBe(1);
    expect(
      selectCampaignLeaderboardRows(rows, {
        sort: "score",
        currentUserId: "current",
      }).currentUserEntry?.rank,
    ).toBe(3);
  });
});

function leaderboardRow(
  overrides: Partial<ScoredCampaignLeaderboardRow> = {},
): ScoredCampaignLeaderboardRow {
  return {
    creatorId: "creator_1",
    creatorProfileId: "profile_1",
    displayName: "Creator",
    avatarUrl: null,
    submissionCount: 1,
    totalViews: 1_000,
    totalEarned: 10,
    bestPostUrl: "https://example.com/post",
    bestPostViews: 1_000,
    score: 50,
    ...overrides,
  };
}
