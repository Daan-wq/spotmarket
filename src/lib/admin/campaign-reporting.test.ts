import { describe, expect, it } from "vitest";
import { buildCampaignReportLiveData, normalizeSectionSettings } from "./campaign-reporting";

const campaign = {
  id: "campaign-1",
  name: "Bram's Fruit Clipping",
  description: "Fruit awareness",
  platforms: ["TIKTOK", "INSTAGRAM"],
  totalBudget: 1000,
  creatorCpv: 0.0006,
  adminMargin: 0.0002,
  businessCpv: 0.0008,
  goalViews: 1_000_000,
  minimumPaidViews: 5000,
  maximumPaidViews: 250_000,
  startsAt: new Date("2026-05-01T00:00:00.000Z"),
  deadline: new Date("2026-05-31T00:00:00.000Z"),
  requirements: "#bramsfruit\nMention the shirt",
  contentGuidelines: "Show the product early.",
  requiredHashtags: ["#bramsfruit"],
  targetCountry: "NL",
  targetCountryPercent: 60,
  targetMinAge18Percent: 95,
  targetMalePercent: 45,
  minFollowers: 10000,
  minEngagementRate: 3,
  brand: { id: "brand-1", name: "Bram's Fruit", currency: "EUR" },
};

describe("buildCampaignReportLiveData", () => {
  it("calculates campaign delivery, platform breakdown, quality, and fallback top content", () => {
    const report = buildCampaignReportLiveData({
      campaign,
      periodStart: new Date("2026-05-01T00:00:00.000Z"),
      periodEnd: new Date("2026-05-31T00:00:00.000Z"),
      submissions: [
        {
          id: "sub-1",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://tiktok.com/@alice/video/1",
          sourcePlatform: "TIKTOK",
          status: "APPROVED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          eligibleViews: 400_000,
          claimedViews: 380_000,
          likeCount: 20_000,
          commentCount: 300,
          shareCount: 700,
          earnedAmount: 320,
          metricSnapshots: [
            { capturedAt: new Date("2026-05-02T00:00:00.000Z"), source: "OAUTH_TT", viewCount: 100_000, likeCount: 5000, commentCount: 100, shareCount: 100 },
            { capturedAt: new Date("2026-05-03T00:00:00.000Z"), source: "OAUTH_TT", viewCount: 400_000, likeCount: 20_000, commentCount: 300, shareCount: 700 },
          ],
          signals: [{ type: "RATIO_ANOMALY", severity: "WARN", resolvedAt: null }],
          qcReviews: [{ decision: "APPROVED", brandFitScore: 8 }],
        },
        {
          id: "sub-2",
          creatorId: "creator-2",
          creatorLabel: "Bob",
          postUrl: "https://instagram.com/reel/2",
          sourcePlatform: "INSTAGRAM",
          status: "REJECTED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          viewCount: 90_000,
          claimedViews: 100_000,
          earnedAmount: 0,
          metricSnapshots: [],
          signals: [{ type: "LOGO_MISSING", severity: "WARN", resolvedAt: new Date("2026-05-04T00:00:00.000Z") }],
          qcReviews: [{ decision: "REJECTED", brandFitScore: 3 }],
        },
        {
          id: "sub-3",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://instagram.com/reel/3",
          sourcePlatform: "INSTAGRAM",
          status: "NEEDS_REVISION",
          createdAt: new Date("2026-05-03T00:00:00.000Z"),
          claimedViews: 40_000,
          earnedAmount: 0,
          metricSnapshots: [],
          signals: [],
          qcReviews: [{ decision: "REVISION", brandFitScore: 6 }],
        },
      ],
      attributions: [
        {
          referrerId: "creator-1",
          referrerLabel: "Alice",
          referredUserId: "creator-3",
          clickedAt: new Date("2026-05-01T00:00:00.000Z"),
          signedUpAt: new Date("2026-05-01T01:00:00.000Z"),
          onboardedAt: new Date("2026-05-01T02:00:00.000Z"),
          firstSubmissionAt: new Date("2026-05-03T00:00:00.000Z"),
          activeAt: null,
          earnedAmount: 0,
        },
      ],
      audienceSnapshots: [
        {
          connectionType: "TT",
          connectionId: "tt-1",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-01T00:00:00.000Z"),
          ageBuckets: { "18-24": 40 },
          genderSplit: { male: 30, female: 70 },
          topCountries: [{ code: "NL", share: 50 }],
        },
        {
          connectionType: "TT",
          connectionId: "tt-1",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-05T00:00:00.000Z"),
          ageBuckets: { "18-24": 60 },
          genderSplit: { male: 35, female: 65 },
          topCountries: [{ code: "NL", share: 65 }],
        },
      ],
    });

    expect(report.performance.approvedViews).toBe(400_000);
    expect(report.performance.currentViews).toBe(400_000);
    expect(report.performance.paidEligibleViews).toBe(400_000);
    expect(report.performance.targetViews).toBe(1_666_666);
    expect(report.performance.targetViewsSource).toBe("budget_cpm");
    expect(report.performance.goalCompletion).toBeCloseTo(0.24);
    expect(report.performance.budgetUsed).toBe(320);
    expect(report.performance.budgetUsedPercent).toBe(0.32);
    expect(report.performance.costPerThousandViews).toBe(0.8);
    expect(report.performance.approvalRate).toBeCloseTo(1 / 3);
    expect(report.platformBreakdown).toEqual([
      {
        platform: "TikTok",
        views: 400_000,
        clips: 1,
        engagement: 21_000,
        cost: 320,
        averageViewsPerClip: 400_000,
        engagementRate: 0.0525,
        effectiveCpm: 0.8,
      },
    ]);
    expect(report.topContent[1]).toMatchObject({ id: "sub-2", views: 90_000 });
    expect(report.quality.openSignals).toBe(1);
    expect(report.quality.resolvedSignals).toBe(1);
    expect(report.audience.sampleCount).toBe(1);
    expect(report.audience.ageBuckets["18-24"]).toBe(0.6);
    expect(report.audience.topCountries[0]).toEqual({ code: "NL", share: 0.65 });
    expect(report.referral.inviteCount).toBe(1);
    expect(report.defaults.title).toBe("Bram's Fruit campagnerapport");
    expect(report.defaults.executiveSummary).toContain("goedgekeurde views");
    expect(report.defaults.keyTakeaways.length).toBeGreaterThanOrEqual(3);
    expect(report.defaults.editorialContent.templateBlocks["summary.body"]).toContain("{{performance.currentViews}}");
  });

  it("averages account-level audience demographics and prefers engaged snapshots per account", () => {
    const report = buildCampaignReportLiveData({
      campaign,
      submissions: [],
      attributions: [],
      audienceSnapshots: [
        {
          connectionType: "IG",
          connectionId: "ig-1",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-01T00:00:00.000Z"),
          ageBuckets: { "18-24": 0.5, "25-34": 0.5 },
          genderSplit: { male: 0.2, female: 0.8 },
          topCountries: [{ code: "NL", share: 0.6 }, { code: "BE", share: 0.4 }],
        },
        {
          connectionType: "IG",
          connectionId: "ig-1",
          kind: "ENGAGED",
          capturedAt: new Date("2026-05-02T00:00:00.000Z"),
          ageBuckets: { "18-24": 0.8, "25-34": 0.2 },
          genderSplit: { male: 0.1, female: 0.9 },
          topCountries: [{ code: "NL", share: 0.9 }, { code: "BE", share: 0.1 }],
        },
        {
          connectionType: "IG",
          connectionId: "ig-2",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-02T00:00:00.000Z"),
          ageBuckets: { "18-24": 0.6, "25-34": 0.4 },
          genderSplit: { male: 0.4, female: 0.6 },
          topCountries: [{ code: "NL", share: 0.7 }, { code: "IN", share: 0.3 }],
        },
      ],
    });

    expect(report.audience.sampleCount).toBe(2);
    expect(report.audience.ageBuckets["18-24"]).toBeCloseTo(0.7);
    expect(report.audience.genderSplit.female).toBeCloseTo(0.75);
    expect(report.audience.topCountries[0]?.code).toBe("NL");
    expect(report.audience.topCountries[0]?.share).toBeCloseTo(0.8);
  });

  it("shows live approved views and overdelivery above the CPM target", () => {
    const report = buildCampaignReportLiveData({
      campaign: { ...campaign, totalBudget: 500, creatorCpv: 0.00025, goalViews: 100_000 },
      submissions: [
        {
          id: "sub-over",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://tiktok.com/@alice/video/over",
          sourcePlatform: "TIKTOK",
          status: "APPROVED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          eligibleViews: 2_000_000,
          viewCount: 2_600_000,
          earnedAmount: 500,
          metricSnapshots: [],
          signals: [],
          qcReviews: [],
        },
      ],
      attributions: [],
      audienceSnapshots: [],
    });

    expect(report.performance.targetViews).toBe(2_000_000);
    expect(report.performance.currentViews).toBe(2_600_000);
    expect(report.performance.paidEligibleViews).toBe(2_000_000);
    expect(report.performance.overdeliveryViews).toBe(600_000);
    expect(report.defaults.executiveSummary).toContain("overdelivery");
  });

  it("keeps internal metric failure sources out of client-facing platform breakdowns", () => {
    const report = buildCampaignReportLiveData({
      campaign,
      submissions: [
        {
          id: "sub-oauth-failed-tiktok",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://www.tiktok.com/@alice/video/7123456789012345678",
          sourcePlatform: "TIKTOK",
          status: "APPROVED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          viewCount: 12_000,
          earnedAmount: 0,
          metricSnapshots: [
            { capturedAt: new Date("2026-05-03T00:00:00.000Z"), source: "OAUTH_FAILED", viewCount: 0 },
          ],
          signals: [],
          qcReviews: [],
        },
        {
          id: "sub-oauth-failed-invalid",
          creatorId: "creator-2",
          creatorLabel: "Bob",
          postUrl: "https://example.com/codex-test-credit-usdc-solana-2026-05-25",
          sourcePlatform: null,
          status: "APPROVED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          viewCount: 0,
          earnedAmount: 0,
          metricSnapshots: [
            { capturedAt: new Date("2026-05-03T00:00:00.000Z"), source: "OAUTH_FAILED", viewCount: 0 },
          ],
          signals: [],
          qcReviews: [],
        },
      ],
      attributions: [],
      audienceSnapshots: [],
    });

    expect(report.platformBreakdown).toHaveLength(1);
    expect(report.platformBreakdown[0]).toMatchObject({
      platform: "TikTok",
      clips: 1,
      views: 0,
    });
    expect(report.platformBreakdown.map((row) => row.platform)).not.toContain("Oauth Failed");
    expect(report.platformBreakdown.map((row) => row.platform)).not.toContain("Unknown");
  });
});

describe("normalizeSectionSettings", () => {
  it("keeps unknown input safe and preserves known booleans", () => {
    const settings = normalizeSectionSettings({ audience: false, unknown: false });

    expect(settings.audienceReach).toBe(false);
    expect(settings.cover).toBe(true);
    expect("unknown" in settings).toBe(false);
  });
});
