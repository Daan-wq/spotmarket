import { describe, expect, it } from "vitest";
import {
  buildBrandPausePeriods,
  buildBrandTimeline,
  buildBrandMilestones,
  calculateBrandForecast,
  calculateBrandGoalDelivery,
  calculateExpectedGoalDate,
  buildBrandPortalCampaignWhere,
  buildBrandVisibleReportWhere,
  sanitizeBrandCampaignDashboardData,
  sanitizeBrandReportLiveData,
  selectBrandPortalCampaign,
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
      currentViews: 190000,
      targetViews: 180000,
      targetViewsSource: "budget_cpm",
      paidEligibleViews: 180000,
      overdeliveryViews: 25000,
      overdeliveryPercent: 0.14,
      deliveryProgress: 1.13,
      cpmPerThousand: 10,
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
      approvedSubmissions: 2,
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
        campaignAtAGlance: true,
        campaignPerformance: true,
        contentPerformance: true,
        platformPerformance: true,
        creatorContribution: true,
        audienceReach: true,
        budgetValue: true,
        qualityAssurance: true,
        nextCampaign: true,
        appendix: false,
      },
      editorialContent: {
        templateBlocks: {},
        contentPatternTags: [],
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
        coverImageUrl: null,
      },
    },
  };
}

describe("brand report portal helpers", () => {
  it("limits brand dashboards to active and completed campaigns for authorized brands", () => {
    expect(buildBrandPortalCampaignWhere(["brand-1", "brand-2"])).toEqual({
      brandId: { in: ["brand-1", "brand-2"] },
      brand: { portalEnabled: true },
      status: { in: ["active", "completed"] },
    });

    expect(buildBrandPortalCampaignWhere(null)).toEqual({
      brand: { portalEnabled: true },
      status: { in: ["active", "completed"] },
    });
  });

  it("keeps a requested authorized campaign selected and safely falls back to the newest active campaign", () => {
    const campaigns = [
      {
        id: "completed-new",
        status: "completed" as const,
        startsAt: new Date("2026-04-01T00:00:00.000Z"),
        deadline: new Date("2026-05-31T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      {
        id: "active-old",
        status: "active" as const,
        startsAt: new Date("2026-05-01T00:00:00.000Z"),
        deadline: new Date("2026-06-30T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
      },
      {
        id: "active-new",
        status: "active" as const,
        startsAt: new Date("2026-06-01T00:00:00.000Z"),
        deadline: new Date("2026-07-31T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ];

    expect(selectBrandPortalCampaign(campaigns, "completed-new")?.id).toBe("completed-new");
    expect(selectBrandPortalCampaign(campaigns, "not-authorized")?.id).toBe("active-new");
  });

  it("falls back to the most recent completed campaign when no active campaign exists", () => {
    const campaigns = [
      {
        id: "completed-old",
        status: "completed" as const,
        startsAt: null,
        deadline: new Date("2026-04-30T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
      },
      {
        id: "completed-new",
        status: "completed" as const,
        startsAt: null,
        deadline: new Date("2026-05-31T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ];

    expect(selectBrandPortalCampaign(campaigns, null)?.id).toBe("completed-new");
  });

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
      status: "needs_attention",
      reviewedClips: 5,
      excludedClips: 1,
      excludedViews: 15000,
    });
    expect(sanitized.quality).not.toHaveProperty("signalCounts");
    expect(sanitized.creators[0]).toEqual({
      creator: "Internal Creator Name",
      submissions: 2,
      approvedSubmissions: 2,
      views: 100000,
      approvalRate: 1,
      reliabilityStatus: "Aanbevolen",
    });
    expect(sanitized.creators[0]).not.toHaveProperty("earnedAmount");
    expect(sanitized).not.toHaveProperty("defaults");
    expect(sanitized.performance.overdeliveryViews).toBe(10000);
    expect(sanitized.performance.overdeliveryPercent).toBeCloseTo(10000 / 180000);
    expect(sanitized.topContent[0]).toEqual({
      id: "submission-1",
      creator: "Internal Creator Name",
      platform: "TikTok",
      postUrl: "https://tiktok.com/@creator/video/1",
      thumbnailUrl: "https://example.com/thumb.jpg",
      views: 100000,
      engagement: 4200,
    });
  });

  it("creates the expanded dashboard projection with goal-based delivery and approved top content", () => {
    const data = liveData();
    data.timeline = [
      { date: "2026-05-01", views: 1000, likes: 25, comments: 4, shares: 2 },
      { date: "2026-05-02", views: 2500, likes: 50, comments: 8, shares: 4 },
    ];
    data.topContent = [
      {
        id: "rejected-high",
        creator: "Rejected Creator",
        platform: "TikTok",
        postUrl: "https://example.com/rejected",
        thumbnailUrl: null,
        views: 900000,
        engagement: 10000,
        earnedAmount: 0,
        status: "REJECTED",
      },
      {
        id: "approved-low",
        creator: "Approved Creator",
        platform: "Instagram",
        postUrl: "https://example.com/approved-low",
        thumbnailUrl: null,
        views: 50000,
        engagement: 2000,
        earnedAmount: 500,
        status: "APPROVED",
      },
      {
        id: "approved-high",
        creator: "Approved Creator",
        platform: "TikTok",
        postUrl: "https://example.com/approved-high",
        thumbnailUrl: null,
        views: 150000,
        engagement: 5000,
        earnedAmount: 1000,
        status: "APPROVED",
      },
    ];

    const dashboard = sanitizeBrandCampaignDashboardData(data);

    expect(dashboard).toEqual({
      generatedAt: "2026-06-01T12:00:00.000Z",
      campaign: {
        id: "campaign-1",
        name: "Fruit launch",
        brandId: "brand-1",
        brandName: "Bram's Fruit",
        platforms: ["TikTok"],
        totalBudget: 2500,
        businessCpm: 14,
        goalViews: 180000,
        startsAt: "2026-05-01T00:00:00.000Z",
        deadline: "2026-05-31T00:00:00.000Z",
      },
      performance: {
        currentViews: 190000,
        targetViews: 180000,
        deliveryProgress: 1.13,
        budgetUsed: 2500,
        budgetUsedPercent: 1,
        budgetRemaining: 0,
        businessCpm: 14,
        effectiveCpm: 12.2,
        overdeliveryViews: 10000,
        overdeliveryPercent: 10000 / 180000,
        totalSubmissions: 5,
        approvedClips: 4,
        uniquePages: 3,
        averageViewsPerApprovedClip: 47500,
        totalEngagement: 8200,
        engagementRate: 8200 / 190000,
        expectedGoalDate: "2026-06-01",
        forecast: {
          status: "reached",
          expectedGoalDate: "2026-06-01",
          averageViewsPerActiveDay: 95000,
          activeDays: 2,
          excludedPauseDays: 0,
        },
      },
      timeline: [
        { date: "2026-05-01", views: 1000, cumulativeViews: 1000 },
        { date: "2026-05-02", views: 2500, cumulativeViews: 3500 },
      ],
      pausePeriods: [],
      milestones: [
        { type: "STARTED", date: "2026-05-01", label: "Campagne gestart" },
        { type: "PLANNED_END", date: "2026-05-31", label: "Geplande einddatum" },
      ],
      platformBreakdown: [{
        platform: "TikTok",
        views: 205000,
        clips: 4,
        engagement: 8200,
        engagementRate: 0.04,
        effectiveCpm: 12.2,
      }],
      topContent: [
        {
          id: "approved-high",
          platform: "TikTok",
          postUrl: "https://example.com/approved-high",
          thumbnailUrl: null,
          views: 150000,
          engagement: 5000,
        },
        {
          id: "approved-low",
          platform: "Instagram",
          postUrl: "https://example.com/approved-low",
          thumbnailUrl: null,
          views: 50000,
          engagement: 2000,
        },
      ],
    });
    expect(dashboard).not.toHaveProperty("quality");
    expect(dashboard).not.toHaveProperty("creators");
    expect(dashboard).not.toHaveProperty("referral");
  });

  it("limits the dashboard preview to the five highest-view approved clips", () => {
    const data = liveData();
    data.topContent = [
      {
        id: "rejected-high",
        creator: "Rejected Creator",
        platform: "TikTok",
        postUrl: "https://example.com/rejected",
        thumbnailUrl: null,
        views: 900000,
        engagement: 10000,
        earnedAmount: 0,
        status: "REJECTED",
      },
      ...Array.from({ length: 7 }, (_, index) => ({
        id: `approved-${index}`,
        creator: "Approved Creator",
        platform: "Instagram",
        postUrl: `https://example.com/approved-${index}`,
        thumbnailUrl: null,
        views: 70000 - index * 10000,
        engagement: 1000 - index * 100,
        earnedAmount: 100,
        status: "APPROVED" as const,
      })),
    ];

    const dashboard = sanitizeBrandCampaignDashboardData(data);

    expect(dashboard.topContent.map((row) => row.id)).toEqual([
      "approved-0",
      "approved-1",
      "approved-2",
      "approved-3",
      "approved-4",
    ]);
  });

  it("defines brand overdelivery only as approved views above the campaign goal", () => {
    expect(calculateBrandGoalDelivery(864453, 2625000)).toEqual({
      overdeliveryViews: 0,
      overdeliveryPercent: 0,
    });
    expect(calculateBrandGoalDelivery(2800000, 2625000)).toEqual({
      overdeliveryViews: 175000,
      overdeliveryPercent: 175000 / 2625000,
    });
    expect(calculateBrandGoalDelivery(1000, null)).toEqual({
      overdeliveryViews: 0,
      overdeliveryPercent: null,
    });
  });

  it("calculates the expected goal date from average approved views per calendar day", () => {
    expect(calculateExpectedGoalDate({
      startsAt: "2026-05-01T10:00:00.000Z",
      generatedAt: "2026-05-10T12:00:00.000Z",
      approvedViews: 100000,
      goalViews: 200000,
      timeline: [{ date: "2026-05-10", views: 100000 }],
    })).toBe("2026-05-20");
  });

  it("builds closed, multiple, and open pause periods from chronological campaign events", () => {
    expect(buildBrandPausePeriods([
      { type: "RESUMED", occurredAt: new Date("2026-05-05T00:00:00.000Z") },
      { type: "PAUSED", occurredAt: new Date("2026-05-10T09:00:00.000Z") },
      { type: "PAUSED", occurredAt: new Date("2026-05-11T09:00:00.000Z") },
      { type: "RESUMED", occurredAt: new Date("2026-05-12T09:00:00.000Z") },
      { type: "PAUSED", occurredAt: new Date("2026-05-20T09:00:00.000Z") },
    ])).toEqual([
      { startDate: "2026-05-10", endDate: "2026-05-12" },
      { startDate: "2026-05-20", endDate: null },
    ]);
  });

  it("excludes pause days from the forecast divisor while retaining all approved views", () => {
    expect(calculateBrandForecast({
      startsAt: "2026-05-01T10:00:00.000Z",
      generatedAt: "2026-05-10T12:00:00.000Z",
      approvedViews: 100000,
      goalViews: 200000,
      timeline: [{ date: "2026-05-10", views: 100000 }],
      pausePeriods: [{ startDate: "2026-05-03", endDate: "2026-05-06" }],
    })).toEqual({
      status: "active",
      expectedGoalDate: "2026-05-17",
      averageViewsPerActiveDay: 100000 / 7,
      activeDays: 7,
      excludedPauseDays: 3,
    });

    expect(calculateExpectedGoalDate({
      startsAt: "2026-05-01T10:00:00.000Z",
      generatedAt: "2026-05-10T12:00:00.000Z",
      approvedViews: 100000,
      goalViews: 200000,
      timeline: [{ date: "2026-05-10", views: 100000 }],
      pausePeriods: [{ startDate: "2026-05-03", endDate: "2026-05-06" }],
    })).toBe("2026-05-17");
  });

  it("excludes 24 May through 5 June from the Bram's Fruit forecast", () => {
    expect(calculateBrandForecast({
      startsAt: "2026-05-21T00:00:00.000Z",
      generatedAt: "2026-06-10T12:00:00.000Z",
      approvedViews: 876894,
      goalViews: 2625000,
      timeline: [{ date: "2026-06-09", views: 10000 }],
      pausePeriods: [{ startDate: "2026-05-24", endDate: "2026-06-06" }],
    })).toEqual({
      status: "active",
      expectedGoalDate: "2026-06-23",
      averageViewsPerActiveDay: 876894 / 7,
      activeDays: 7,
      excludedPauseDays: 13,
    });
  });

  it("suppresses the date during an open pause and handles reached or unavailable forecasts", () => {
    expect(calculateBrandForecast({
      startsAt: "2026-05-01T00:00:00.000Z",
      generatedAt: "2026-05-10T12:00:00.000Z",
      approvedViews: 100000,
      goalViews: 200000,
      timeline: [{ date: "2026-05-10", views: 100000 }],
      pausePeriods: [{ startDate: "2026-05-08", endDate: null }],
    })).toEqual({
      status: "paused",
      expectedGoalDate: null,
      averageViewsPerActiveDay: 100000 / 7,
      activeDays: 7,
      excludedPauseDays: 3,
    });

    expect(calculateBrandForecast({
      startsAt: "2026-05-01T00:00:00.000Z",
      generatedAt: "2026-05-02T12:00:00.000Z",
      approvedViews: 110000,
      goalViews: 100000,
      timeline: [
        { date: "2026-05-01", views: 60000 },
        { date: "2026-05-02", views: 50000 },
      ],
      pausePeriods: [],
    })).toEqual({
      status: "reached",
      expectedGoalDate: "2026-05-02",
      averageViewsPerActiveDay: 55000,
      activeDays: 2,
      excludedPauseDays: 0,
    });

    expect(calculateBrandForecast({
      startsAt: "2026-05-01T00:00:00.000Z",
      generatedAt: "2026-05-02T12:00:00.000Z",
      approvedViews: 1000,
      goalViews: 100000,
      timeline: [{ date: "2026-05-02", views: 1000 }],
      pausePeriods: [{ startDate: "2026-05-01", endDate: null }],
    })).toEqual({
      status: "paused",
      expectedGoalDate: null,
      averageViewsPerActiveDay: null,
      activeDays: 0,
      excludedPauseDays: 2,
    });
  });

  it("returns the reached date and handles missing or unusable forecast inputs", () => {
    const reachedTimeline = [
      { date: "2026-05-01", views: 60000 },
      { date: "2026-05-02", views: 50000 },
    ];

    expect(calculateExpectedGoalDate({
      startsAt: "2026-05-01T00:00:00.000Z",
      generatedAt: "2026-05-02T12:00:00.000Z",
      approvedViews: 110000,
      goalViews: 100000,
      timeline: reachedTimeline,
    })).toBe("2026-05-02");
    expect(calculateExpectedGoalDate({
      startsAt: "2026-05-01T00:00:00.000Z",
      generatedAt: "2026-05-02T12:00:00.000Z",
      approvedViews: 0,
      goalViews: 100000,
      timeline: [],
    })).toBeNull();
    expect(calculateExpectedGoalDate({
      startsAt: null,
      generatedAt: "2026-05-02T12:00:00.000Z",
      approvedViews: 1000,
      goalViews: 100000,
      timeline: [],
    })).toBeNull();
    expect(calculateExpectedGoalDate({
      startsAt: "2026-05-01T00:00:00.000Z",
      generatedAt: "2026-05-02T12:00:00.000Z",
      approvedViews: 1000,
      goalViews: null,
      timeline: [],
    })).toBeNull();
  });

  it("adds cumulative approved views to each chart point", () => {
    expect(buildBrandTimeline([
      { date: "2026-05-01", views: 1000 },
      { date: "2026-05-02", views: 2500 },
      { date: "2026-05-03", views: 500 },
    ])).toEqual([
      { date: "2026-05-01", views: 1000, cumulativeViews: 1000 },
      { date: "2026-05-02", views: 2500, cumulativeViews: 3500 },
      { date: "2026-05-03", views: 500, cumulativeViews: 4000 },
    ]);
  });

  it("combines derived and stored campaign milestones without inventing history", () => {
    expect(buildBrandMilestones({
      startsAt: "2026-05-01T10:00:00.000Z",
      deadline: "2026-05-31T23:00:00.000Z",
      goalViews: 3000,
      timeline: buildBrandTimeline([
        { date: "2026-05-01", views: 1000 },
        { date: "2026-05-02", views: 2500 },
      ]),
      events: [
        { type: "STARTED", occurredAt: new Date("2026-05-01T11:00:00.000Z") },
        { type: "PAUSED", occurredAt: new Date("2026-05-10T09:00:00.000Z") },
        { type: "RESUMED", occurredAt: new Date("2026-05-12T09:00:00.000Z") },
        { type: "COMPLETED", occurredAt: new Date("2026-05-29T09:00:00.000Z") },
      ],
    })).toEqual([
      { type: "STARTED", date: "2026-05-01", label: "Campagne gestart" },
      { type: "GOAL_REACHED", date: "2026-05-02", label: "Viewdoel gehaald" },
      { type: "PAUSED", date: "2026-05-10", label: "Campagne gepauzeerd" },
      { type: "RESUMED", date: "2026-05-12", label: "Campagne hervat" },
      { type: "COMPLETED", date: "2026-05-29", label: "Campagne afgerond" },
      { type: "PLANNED_END", date: "2026-05-31", label: "Geplande einddatum" },
    ]);

    expect(buildBrandMilestones({
      startsAt: null,
      deadline: "2026-05-31T23:00:00.000Z",
      goalViews: 5000,
      timeline: [],
      events: [],
    })).toEqual([
      { type: "PLANNED_END", date: "2026-05-31", label: "Geplande einddatum" },
    ]);
  });
});
