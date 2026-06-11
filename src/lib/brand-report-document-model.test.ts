import { describe, expect, it } from "vitest";
import {
  CPM_EXPLANATION,
  buildBrandReportDocumentModel,
} from "./brand-report-document-model";
import { createEmptyEditorialContent, DEFAULT_CAMPAIGN_REPORT_SECTIONS } from "./admin/campaign-report-shared";
import type { BrandReportLiveData } from "./brand-report-portal";

function buildData(platforms = ["TikTok"]): BrandReportLiveData {
  return {
    generatedAt: "2026-06-11T00:00:00.000Z",
    period: { start: "2026-05-01T00:00:00.000Z", end: "2026-05-31T00:00:00.000Z" },
    campaign: {
      id: "campaign-1",
      name: "Testcampagne",
      brandId: "brand-1",
      brandName: "Betspecialist",
      description: null,
      bannerUrl: null,
      platforms,
      totalBudget: 1000,
      businessCpm: 0.8,
      goalViews: 1_250_000,
      startsAt: "2026-05-01T00:00:00.000Z",
      deadline: "2026-05-31T00:00:00.000Z",
      requirements: null,
      contentGuidelines: null,
      contentType: "Awareness",
      requiredHashtags: [],
      target: {
        country: "NL",
        countryPercent: null,
        minAge18Percent: null,
        malePercent: null,
        minFollowers: 0,
        minEngagementRate: 0,
      },
    },
    performance: {
      approvedViews: 2_000_000,
      currentViews: 2_000_000,
      targetViews: 1_250_000,
      targetViewsSource: "manual",
      paidEligibleViews: 1_250_000,
      costPerThousandViews: 0.5,
      overdeliveryViews: 750_000,
      overdeliveryPercent: 0.6,
      deliveryProgress: 1.6,
      goalCompletion: 1.6,
      budgetUsed: 1000,
      budgetUsedPercent: 1,
      budgetRemaining: 0,
      businessCpm: 0.8,
      effectiveCpm: 0.5,
      totalSubmissions: 9,
      approvedClips: 8,
      uniquePages: 4,
      approvalRate: 8 / 9,
      totalEngagement: 200_000,
    },
    timeline: [{ date: "2026-05-02", views: 2_000_000, cumulativeViews: 2_000_000 }],
    platformBreakdown: [{
      platform: "TikTok",
      views: 2_000_000,
      clips: 8,
      engagement: 200_000,
      engagementRate: 0.1,
      effectiveCpm: 0.5,
    }],
    topContent: Array.from({ length: 8 }, (_, index) => ({
      id: `clip-${index + 1}`,
      creator: `Creator ${index + 1}`,
      platform: "TikTok",
      postUrl: `https://tiktok.com/video/${index + 1}`,
      thumbnailUrl: null,
      views: 100_000 - index * 1000,
      engagement: 10_000 - index * 100,
    })),
    creators: [{
      creator: "Creator 1",
      submissions: 2,
      approvedSubmissions: 2,
      views: 200_000,
      approvalRate: 1,
      reliabilityStatus: "Aanbevolen",
    }],
    quality: {
      status: "passed_with_exclusions",
      reviewedClips: 9,
      excludedClips: 1,
      excludedViews: 2500,
    },
    audience: {
      sampleCount: 1,
      platformsLabel: "Instagram",
      ageBuckets: { "18-24": 0.7 },
      genderSplit: { female: 0.6, male: 0.4 },
      topCountries: [{ code: "NL", share: 0.8 }],
      fitStatus: "Sterke match",
    },
  };
}

const editorial = {
  title: "Betspecialist campagnerapport",
  executiveSummary: "Sterke campagne.",
  keyTakeaways: ["Veel bereik"],
  learnings: ["Herhaal de beste hooks"],
  nextCampaignRecommendations: ["Activeer de beste creators opnieuw"],
  sectionSettings: { ...DEFAULT_CAMPAIGN_REPORT_SECTIONS },
  editorialContent: createEmptyEditorialContent(),
};

describe("buildBrandReportDocumentModel", () => {
  it("pairs agreed and effective CPM and limits top content to six compact rows", () => {
    const model = buildBrandReportDocumentModel({
      report: { title: editorial.title },
      data: buildData(),
      editorial,
    });

    expect(model.cpm).toEqual({
      agreed: 0.8,
      effective: 0.5,
      explanation: CPM_EXPLANATION,
    });
    expect(model.content?.rows).toHaveLength(6);
    expect(model.content?.rows.map((row) => row.id)).toEqual([
      "clip-1",
      "clip-2",
      "clip-3",
      "clip-4",
      "clip-5",
      "clip-6",
    ]);
    expect(model.quality).toEqual({
      reviewedClips: 9,
      excludedClips: 1,
      excludedViews: 2500,
    });
  });

  it("omits audience for TikTok-only campaigns even when stale Instagram data exists", () => {
    const model = buildBrandReportDocumentModel({
      report: { title: editorial.title },
      data: buildData(["TikTok"]),
      editorial,
    });

    expect(model.audience).toBeNull();
  });

  it("includes audience for an allowed Instagram campaign with usable snapshots", () => {
    const model = buildBrandReportDocumentModel({
      report: { title: editorial.title },
      data: buildData(["TikTok", "Instagram"]),
      editorial,
    });

    expect(model.audience?.sampleCount).toBe(1);
    expect(model.audience?.platformsLabel).toBe("Instagram");
  });
});
