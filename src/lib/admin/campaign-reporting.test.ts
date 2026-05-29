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
    expect(report.performance.goalCompletion).toBe(0.4);
    expect(report.performance.budgetUsed).toBe(320);
    expect(report.performance.budgetUsedPercent).toBe(0.32);
    expect(report.performance.costPerThousandViews).toBe(0.8);
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
        engagementRate: 0.0525,
      }),
    ]);
    expect(report.topContent[1]).toMatchObject({ id: "sub-2", views: 90_000 });
    expect(report.performance.pacingStatus).toBe("Behind pace");
    expect(report.financial).toMatchObject({
      totalBudget: 1000,
      budgetUsed: 320,
      budgetRemaining: 680,
      approvedPayableViews: 400_000,
      effectiveCpv: 0.0008,
      costPerApprovedClip: 320,
      costPerActiveCreator: 160,
    });
    expect(report.quality.openSignals).toBe(1);
    expect(report.quality.resolvedSignals).toBe(1);
    expect(report.quality.trafficQualityStatus).toBe("Passed with exclusions");
    expect(report.quality.excludedClips).toBe(2);
    expect(report.quality.excludedViews).toBe(130_000);
    expect(report.audience.sampleCount).toBe(1);
    expect(report.audience.ageBuckets["18-24"]).toBe(60);
    expect(report.audience.fitStatus).toBe("Strong match");
    expect(report.creators[0]).toMatchObject({
      creator: "Alice",
      approvalRate: 0.5,
      reliabilityStatus: "Needs review",
    });
    expect(report.referral.inviteCount).toBe(1);
    expect(report.defaults.editorialContent.campaignType).toBe("Awareness");
    expect(report.defaults.editorialContent.contentInsights.length).toBeGreaterThan(0);
    expect(report.defaults.title).toBe("Bram's Fruit campagnerapport");
    expect(report.defaults.executiveSummary).toContain("goedgekeurde views");
    expect(report.defaults.keyTakeaways.length).toBeGreaterThanOrEqual(3);
  });
});

describe("normalizeSectionSettings", () => {
  it("keeps unknown input safe and preserves known booleans", () => {
    const settings = normalizeSectionSettings({ audience: false, unknown: false });

    expect(settings.audience).toBe(false);
    expect(settings.cover).toBe(true);
    expect("unknown" in settings).toBe(false);
  });
});
