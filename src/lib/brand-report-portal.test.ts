import { describe, expect, it } from "vitest";
import {
  buildBrandVisibleReportWhere,
  sanitizeBrandReportLiveData,
} from "@/lib/brand-report-portal";
import type { CampaignReportLiveData } from "@/lib/admin/campaign-reporting";

function liveData(): CampaignReportLiveData {
  return {
    generatedAt: "2026-06-01T12:00:00.000Z",
    period: { start: "2026-05-01T00:00:00.000Z", end: "2026-05-31T00:00:00.000Z" },
    campaign: {
      id: "campaign-1",
      name: "Fruit launch",
      brandId: "brand-1",
      brandName: "Bram's Fruit",
      description: "Launch campaign",
      platforms: ["TikTok"],
      totalBudget: 2500,
      creatorCpv: 0.01,
      creatorCpm: 10,
      adminMargin: 0.004,
      businessCpv: 0.014,
      businessCpm: 14,
      goalViews: 180000,
      goalViewsSource: "budget_cpm",
      minimumPaidViews: 0,
      maximumPaidViews: null,
      startsAt: "2026-05-01T00:00:00.000Z",
      deadline: "2026-05-31T00:00:00.000Z",
      requirements: "Use the brand hook",
      contentGuidelines: "Show product early",
      contentType: "Launch",
      requiredHashtags: ["#fruit"],
      target: {
        country: "NL",
        countryPercent: 70,
        minAge18Percent: 90,
        malePercent: null,
        minFollowers: 1000,
        minEngagementRate: 1.5,
      },
    },
    performance: {
      approvedViews: 190000,
      goalCompletion: 1.13,
      budgetUsed: 2500,
      budgetUsedPercent: 1,
      costPerThousandViews: 12.2,
      totalSubmissions: 5,
      approvedClips: 4,
      activeCreators: 3,
      uniqueCreators: 3,
      uniquePages: 3,
      approvalRate: 0.8,
      pacingStatus: "Voor op schema",
      statusCounts: { APPROVED: 4, REJECTED: 1, FLAGGED: 1 },
    },
    financial: {
      totalBudget: 2500,
      budgetUsed: 2500,
      budgetRemaining: 0,
      approvedPayableViews: 180000,
      overdeliveryViews: 25000,
      overdeliveryRate: 0.14,
      overdeliveryValue: 350,
      effectiveCpv: 0.0122,
      effectiveCpm: 12.2,
      costPerApprovedClip: 625,
      costPerActiveCreator: 833.33,
      forecastApprovedViews: 205000,
      forecastBudgetUsed: 2500,
      unusedBudgetExplanation: "",
      overdeliveryExplanation: "Extra bereik boven doel.",
    },
    timeline: [{ date: "2026-05-01", views: 1000, likes: 25, comments: 4, shares: 2 }],
    platformBreakdown: [{
      platform: "TikTok",
      views: 205000,
      clips: 4,
      engagement: 8200,
      cost: 2500,
      averageViewsPerClip: 51250,
      effectiveCpv: 0.0122,
      engagementRate: 0.04,
      effectiveCpm: 12.2,
    }],
    topContent: [{
      id: "submission-1",
      creator: "Internal Creator Name",
      platform: "TikTok",
      postUrl: "https://tiktok.com/@creator/video/1",
      thumbnailUrl: "https://example.com/thumb.jpg",
      views: 100000,
      engagement: 4200,
      earnedAmount: 1000,
      status: "APPROVED",
    }],
    creators: [{
      creatorId: "creator-1",
      creator: "Internal Creator Name",
      submissions: 2,
      views: 100000,
      earnedAmount: 1000,
      flagged: 1,
      approvalRate: 1,
      averageViewsPerApprovedClip: 50000,
      reliabilityStatus: "Aanbevolen",
      recommendedForNextCampaign: true,
    }],
    referral: {
      totalClicks: 10,
      signupStartedCount: 5,
      clickedOnlyCount: 2,
      inviteCount: 10,
      activeClipperCount: 3,
      inactiveClipperCount: 7,
      firstSubmissions: 3,
      approvedClipperCount: 2,
      totalEarnedByInvitedClippers: 500,
      activationRate: 0.3,
      cpaPerInvite: 250,
      cpaPerActiveClipper: 833.33,
      referrers: [],
    },
    quality: {
      openSignals: 2,
      criticalSignals: 1,
      signalCounts: { TOKEN_BROKEN: 1, RATIO_ANOMALY: 1 },
      resolvedSignals: 3,
      qcDecisionCounts: { APPROVED: 4, REJECTED: 1 },
      approvedQcReviews: 4,
      excludedClips: 1,
      excludedViews: 15000,
      trafficQualityStatus: "Aandacht nodig",
      clientSummary: "Enkele signalen vragen aandacht.",
    },
    audience: {
      sampleCount: 2,
      ageBuckets: { "18-24": 55 },
      genderSplit: { female: 65 },
      topCountries: [{ code: "NL", share: 80 }],
      fitStatus: "Sterke match",
    },
    defaults: {
      title: "Fruit launch report",
      executiveSummary: "Strong campaign.",
      keyTakeaways: ["Great reach"],
      learnings: ["Lead with product"],
      nextCampaignRecommendations: ["Repeat top hooks"],
      sectionSettings: {
        cover: true,
        executiveSummary: true,
        campaignSetup: true,
        performance: true,
        financialOverview: true,
        platformBreakdown: true,
        topContent: true,
        contentInsights: true,
        creatorPerformance: true,
        audience: true,
        communityActivation: false,
        quality: false,
        keyLearnings: true,
        nextCampaign: true,
        appendix: false,
      },
      editorialContent: {
        campaignType: "Launch",
        financialNote: "",
        contentInsights: [],
        topContentNotes: {},
        platformRecommendations: {},
        creatorRecommendations: [],
        qualityNote: "",
        keyLearnings: [],
        nextCampaignPlan: [],
        appendixNote: "",
      },
    },
  };
}

describe("brand report portal helpers", () => {
  it("filters reports to final visible reports for the brand memberships", () => {
    expect(buildBrandVisibleReportWhere(["brand-1", "brand-2"])).toEqual({
      brandId: { in: ["brand-1", "brand-2"] },
      brand: { portalEnabled: true },
      status: "FINAL",
      visibleToBrand: true,
    });
  });

  it("sanitizes live report data for brand-facing views", () => {
    const sanitized = sanitizeBrandReportLiveData(liveData());

    expect(sanitized.campaign).not.toHaveProperty("creatorCpv");
    expect(sanitized.campaign).not.toHaveProperty("adminMargin");
    expect(sanitized.performance).not.toHaveProperty("statusCounts");
    expect(sanitized).not.toHaveProperty("referral");
    expect(sanitized.quality).toEqual({
      status: "Aandacht nodig",
      reviewedClips: 4,
    });
    expect(sanitized.topContent[0]).toEqual({
      id: "submission-1",
      creator: "Creator #1",
      platform: "TikTok",
      postUrl: "https://tiktok.com/@creator/video/1",
      thumbnailUrl: "https://example.com/thumb.jpg",
      views: 100000,
      engagement: 4200,
    });
    expect(sanitized.creators[0]).toEqual({
      creator: "Creator #1",
      submissions: 2,
      approvedSubmissions: 2,
      views: 100000,
      approvalRate: 1,
    });
  });
});
