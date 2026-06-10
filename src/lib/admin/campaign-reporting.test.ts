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
  contentType: "Awareness",
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
      generatedAt: new Date("2026-05-29T00:00:00.000Z"),
      submissions: [
        {
          id: "sub-1",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://tiktok.com/@alice/video/1",
          normalizedPlatform: "TIKTOK",
          sourcePlatform: "TIKTOK",
          authorHandle: "alice",
          sourceConnectionType: "TT",
          sourceConnectionId: "tt-alice",
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
          normalizedPlatform: "INSTAGRAM",
          sourcePlatform: "INSTAGRAM",
          authorHandle: "bob",
          sourceConnectionType: "IG",
          sourceConnectionId: "ig-bob",
          status: "REJECTED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          viewCount: 90_000,
          claimedViews: 100_000,
          earnedAmount: 0,
          metricSnapshots: [
            { capturedAt: new Date("2026-05-03T00:00:00.000Z"), source: "OAUTH_FAILED", viewCount: 90_000, likeCount: 0, commentCount: 0, shareCount: 0 },
          ],
          signals: [{ type: "LOGO_MISSING", severity: "WARN", resolvedAt: new Date("2026-05-04T00:00:00.000Z") }],
          qcReviews: [{ decision: "REJECTED", brandFitScore: 3 }],
        },
        {
          id: "sub-3",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://instagram.com/reel/3",
          sourcePlatform: "INSTAGRAM",
          authorHandle: "alice-fruit",
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
    expect(report.performance.goalCompletion).toBe(0.4);
    expect(report.performance.budgetUsed).toBe(320);
    expect(report.performance.budgetUsedPercent).toBe(0.32);
    expect(report.performance.costPerThousandViews).toBe(0.8);
    expect(report.performance.uniqueCreators).toBe(2);
    expect(report.performance.uniquePages).toBe(3);
    expect(report.campaign.goalViewsSource).toBe("manual");
    expect(report.performance.approvalRate).toBeCloseTo(1 / 3);
    expect(report.platformBreakdown).toEqual([
      expect.objectContaining({
        platform: "TikTok",
        views: 400_000,
        clips: 1,
        engagement: 21_000,
        cost: 320,
        averageViewsPerClip: 400_000,
        effectiveCpv: 0.0008,
        effectiveCpm: 0.8,
        engagementRate: 0.0525,
      }),
    ]);
    expect(report.topContent).toEqual([
      expect.objectContaining({ id: "sub-1", platform: "TikTok", views: 400_000, status: "APPROVED" }),
    ]);
    expect(report.platformBreakdown.some((row) => row.platform === "Oauth Failed")).toBe(false);
    expect(report.performance.pacingStatus).toBe("Achter op schema");
    expect(report.financial).toMatchObject({
      totalBudget: 1000,
      budgetUsed: 320,
      budgetRemaining: 680,
      approvedPayableViews: 400_000,
      overdeliveryViews: 0,
      effectiveCpv: 0.0008,
      effectiveCpm: 0.8,
      costPerApprovedClip: 320,
      costPerActiveCreator: 160,
    });
    expect(report.quality.openSignals).toBe(1);
    expect(report.quality.resolvedSignals).toBe(1);
    expect(report.quality.trafficQualityStatus).toBe("Goedgekeurd met uitsluitingen");
    expect(report.quality.excludedClips).toBe(2);
    expect(report.quality.excludedViews).toBe(130_000);
    expect(report.audience.sampleCount).toBe(0);
    expect(report.audience.ageBuckets).toEqual({});
    expect(report.audience.fitStatus).toBe("Onvoldoende data");
    expect(report.creators[0]).toMatchObject({
      creator: "Alice",
      approvalRate: 0.5,
      reliabilityStatus: "Controleren",
    });
    expect(report.referral.inviteCount).toBe(1);
    expect(report.defaults.editorialContent.campaignType).toBe("Awareness");
    expect(report.defaults.editorialContent.contentInsights.length).toBeGreaterThan(0);
    expect(report.defaults.title).toBe("Bram's Fruit campagnerapport");
    expect(report.defaults.executiveSummary).toContain("goedgekeurde views");
    expect(report.defaults.executiveSummary).toContain("effectieve CPM");
    expect(report.defaults.executiveSummary).not.toContain("CPV");
    expect(report.defaults.editorialContent.platformRecommendations.TikTok).not.toContain("reach-tests");
    expect(report.defaults.editorialContent.platformRecommendations.TikTok).toContain("effectieve CPM");
    expect(report.defaults.editorialContent.financialNote).toContain("Overdelivery");
    expect(report.defaults.keyTakeaways.length).toBeGreaterThanOrEqual(3);
  });

  it("shows overdelivery when approved views exceed the paid CPM view basis", () => {
    const report = buildCampaignReportLiveData({
      campaign,
      periodStart: new Date("2026-05-01T00:00:00.000Z"),
      periodEnd: new Date("2026-05-31T00:00:00.000Z"),
      generatedAt: new Date("2026-05-10T00:00:00.000Z"),
      submissions: [
        {
          id: "sub-overdelivery",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://tiktok.com/@alice/video/1",
          normalizedPlatform: "TIKTOK",
          sourcePlatform: "TIKTOK",
          authorHandle: "alice",
          sourceConnectionType: "TT",
          sourceConnectionId: "tt-alice",
          status: "APPROVED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          eligibleViews: 250_000,
          viewCount: 400_000,
          earnedAmount: 200,
          metricSnapshots: [],
          signals: [],
          qcReviews: [],
        },
      ],
      attributions: [],
      audienceSnapshots: [],
    });

    expect(report.performance.approvedViews).toBe(400_000);
    expect(report.financial.approvedPayableViews).toBe(250_000);
    expect(report.financial.overdeliveryViews).toBe(150_000);
    expect(report.financial.overdeliveryRate).toBe(0.6);
    expect(report.financial.overdeliveryValue).toBe(120);
    expect(report.financial.overdeliveryExplanation).toContain("extra views");
    expect(report.defaults.keyTakeaways.some((takeaway) => takeaway.includes("overdelivery"))).toBe(true);
  });

  it("averages demographics from Instagram accounts used by campaign clips only", () => {
    const report = buildCampaignReportLiveData({
      campaign,
      generatedAt: new Date("2026-05-10T00:00:00.000Z"),
      submissions: [
        {
          id: "ig-sub-1",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://instagram.com/reel/1",
          normalizedPlatform: "INSTAGRAM",
          sourcePlatform: "INSTAGRAM",
          sourceConnectionType: "IG",
          sourceConnectionId: "ig-1",
          status: "APPROVED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          metricSnapshots: [],
          signals: [],
          qcReviews: [],
        },
        {
          id: "ig-sub-2",
          creatorId: "creator-2",
          creatorLabel: "Bob",
          postUrl: "https://instagram.com/reel/2",
          normalizedPlatform: "INSTAGRAM",
          sourcePlatform: "INSTAGRAM",
          sourceConnectionType: "IG",
          sourceConnectionId: "ig-2",
          status: "APPROVED",
          createdAt: new Date("2026-05-03T00:00:00.000Z"),
          metricSnapshots: [],
          signals: [],
          qcReviews: [],
        },
        {
          id: "tt-sub-1",
          creatorId: "creator-3",
          creatorLabel: "Charlie",
          postUrl: "https://tiktok.com/@charlie/video/1",
          normalizedPlatform: "TIKTOK",
          sourcePlatform: "TIKTOK",
          sourceConnectionType: "TT",
          sourceConnectionId: "tt-1",
          status: "APPROVED",
          createdAt: new Date("2026-05-04T00:00:00.000Z"),
          metricSnapshots: [],
          signals: [],
          qcReviews: [],
        },
      ],
      attributions: [],
      audienceSnapshots: [
        {
          connectionType: "IG",
          connectionId: "ig-1",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-01T00:00:00.000Z"),
          ageBuckets: { "18-24": 0.2, "25-34": 0.8 },
          genderSplit: { male: 0.2, female: 0.8 },
          topCountries: [{ code: "NL", share: 0.2 }],
        },
        {
          connectionType: "IG",
          connectionId: "ig-1",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-09T00:00:00.000Z"),
          ageBuckets: { "18-24": 0.6, "25-34": 0.4 },
          genderSplit: { male: 0.3, female: 0.7 },
          topCountries: [
            { code: "NL", share: 0.8 },
            { code: "IN", share: 0.1 },
            { code: "BE", share: 0.05 },
          ],
        },
        {
          connectionType: "IG",
          connectionId: "ig-2",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-08T00:00:00.000Z"),
          ageBuckets: { "18-24": 0.4, "25-34": 0.6 },
          genderSplit: { male: 0.5, female: 0.5 },
          topCountries: [
            { code: "NL", share: 0.6 },
            { code: "IN", share: 0.2 },
            { code: "US", share: 0.1 },
          ],
        },
        {
          connectionType: "TT",
          connectionId: "tt-1",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-09T00:00:00.000Z"),
          ageBuckets: { "18-24": 0.99 },
          genderSplit: { male: 0.99, female: 0.01 },
          topCountries: [{ code: "IN", share: 0.99 }],
        },
        {
          connectionType: "IG",
          connectionId: "ig-not-used",
          kind: "FOLLOWER",
          capturedAt: new Date("2026-05-09T00:00:00.000Z"),
          ageBuckets: { "18-24": 0.99 },
          genderSplit: { male: 0.99, female: 0.01 },
          topCountries: [{ code: "IN", share: 0.99 }],
        },
      ],
    });

    expect(report.audience.sampleCount).toBe(2);
    expect(report.audience.platformsLabel).toBe("Instagram");
    expect(report.audience.ageBuckets).toEqual({
      "18-24": 0.5,
      "25-34": 0.5,
    });
    expect(report.audience.genderSplit).toEqual({
      male: 0.4,
      female: 0.6,
    });
    expect(report.audience.topCountries).toEqual([
      { code: "NL", share: 0.7 },
      { code: "IN", share: 0.15 },
      { code: "US", share: 0.05 },
      { code: "BE", share: 0.025 },
    ]);
    expect(report.audience.fitStatus).toBe("Sterke match");
  });

  it("calculates a fixed goal view target from budget and business CPM when no manual target exists", () => {
    const report = buildCampaignReportLiveData({
      campaign: { ...campaign, goalViews: null },
      periodStart: new Date("2026-05-01T00:00:00.000Z"),
      periodEnd: new Date("2026-05-31T00:00:00.000Z"),
      generatedAt: new Date("2026-05-29T00:00:00.000Z"),
      submissions: [
        {
          id: "sub-1",
          creatorId: "creator-1",
          creatorLabel: "Alice",
          postUrl: "https://tiktok.com/@alice/video/1",
          normalizedPlatform: "TIKTOK",
          sourcePlatform: "TIKTOK",
          authorHandle: "alice",
          sourceConnectionType: "TT",
          sourceConnectionId: "tt-alice",
          status: "APPROVED",
          createdAt: new Date("2026-05-02T00:00:00.000Z"),
          eligibleViews: 400_000,
          earnedAmount: 320,
          metricSnapshots: [],
          signals: [],
          qcReviews: [],
        },
      ],
      attributions: [],
      audienceSnapshots: [],
    });

    expect(report.campaign.goalViews).toBe(1_250_000);
    expect(report.campaign.goalViewsSource).toBe("budget_cpm");
    expect(report.performance.goalCompletion).toBeCloseTo(0.32);
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
