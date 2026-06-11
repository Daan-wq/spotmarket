import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createEmptyEditorialContent, DEFAULT_CAMPAIGN_REPORT_SECTIONS } from "@/lib/admin/campaign-report-shared";
import type { BrandReportLiveData } from "@/lib/brand-report-portal";
import { BrandReportActions } from "./brand-report-actions";
import { BrandReportDocument } from "./brand-report-document";

const data = {
  generatedAt: "2026-06-10T00:00:00.000Z",
  period: { start: null, end: null },
  campaign: {
    id: "campaign-1",
    brandId: "brand-1",
    brandName: "Bram's Fruit",
    name: "Fruit campagne",
    platforms: ["TikTok"],
    totalBudget: 1000,
    businessCpm: 0.8,
  },
  performance: {
    currentViews: 2_000_000,
    targetViews: 1_250_000,
    paidEligibleViews: 1_250_000,
    overdeliveryViews: 750_000,
    deliveryProgress: 1.6,
    budgetUsed: 1000,
    budgetUsedPercent: 1,
    budgetRemaining: 0,
    businessCpm: 0.8,
    effectiveCpm: 0.5,
    approvedClips: 7,
    uniquePages: 4,
    totalEngagement: 200_000,
  },
  timeline: [],
  platformBreakdown: [{
    platform: "TikTok",
    views: 2_000_000,
    clips: 7,
    engagement: 200_000,
    engagementRate: 0.1,
    effectiveCpm: 0.5,
  }],
  topContent: Array.from({ length: 7 }, (_, index) => ({
    id: `clip-${index}`,
    creator: `Creator ${index}`,
    platform: "TikTok",
    postUrl: `https://tiktok.com/video/${index}`,
    thumbnailUrl: null,
    views: 100_000 - index * 1000,
    engagement: 10_000,
  })),
  creators: [],
  quality: {
    status: "passed_with_exclusions",
    reviewedClips: 8,
    excludedClips: 1,
    excludedViews: 2500,
  },
  audience: {
    sampleCount: 0,
    platformsLabel: "Instagram",
    ageBuckets: {},
    genderSplit: {},
    topCountries: [],
    fitStatus: "Onvoldoende data",
  },
} as unknown as BrandReportLiveData;

describe("BrandReportDocument", () => {
  it("renders as an A4 document without portal navigation inside the printable content", () => {
    const html = renderToStaticMarkup(
      <BrandReportDocument
        report={{
          title: "Fruit campagne eindrapport",
          updatedAt: "2026-06-10T00:00:00.000Z",
          brandVisibleAt: "2026-06-10T00:00:00.000Z",
          executiveSummary: "",
          keyTakeaways: [],
          learnings: [],
          nextCampaignRecommendations: [],
        }}
        data={data}
        editorial={{
          title: "Fruit campagne eindrapport",
          executiveSummary: "",
          keyTakeaways: [],
          learnings: [],
          nextCampaignRecommendations: [],
          sectionSettings: {
            ...DEFAULT_CAMPAIGN_REPORT_SECTIONS,
            executiveSummary: false,
            campaignAtAGlance: false,
            campaignPerformance: false,
            contentPerformance: false,
            platformPerformance: false,
            creatorContribution: false,
            audienceReach: false,
            budgetValue: false,
            qualityAssurance: false,
            nextCampaign: false,
            appendix: false,
          },
          editorialContent: createEmptyEditorialContent(),
        }}
      />,
    );

    expect(html).toContain("report-print-page");
    expect(html).toContain("max-w-[210mm]");
    expect(html).not.toContain("Terug naar rapporten");
  });

  it("labels the browser print action as a PDF download", () => {
    const html = renderToStaticMarkup(<BrandReportActions reportId="report-1" />);
    expect(html).toContain("PDF downloaden");
    expect(html).toContain("/api/brand/reports/report-1/pdf");
  });

  it("uses compact top-content rows, paired CPM values, and dashboard quality metrics", () => {
    const html = renderToStaticMarkup(
      <BrandReportDocument
        report={{
          title: "Fruit campagne eindrapport",
          updatedAt: "2026-06-10T00:00:00.000Z",
          brandVisibleAt: "2026-06-10T00:00:00.000Z",
          executiveSummary: "Sterke campagne.",
          keyTakeaways: [],
          learnings: [],
          nextCampaignRecommendations: [],
        }}
        data={data}
        editorial={{
          title: "Fruit campagne eindrapport",
          executiveSummary: "Sterke campagne.",
          keyTakeaways: [],
          learnings: [],
          nextCampaignRecommendations: [],
          sectionSettings: {
            ...DEFAULT_CAMPAIGN_REPORT_SECTIONS,
            cover: false,
            executiveSummary: false,
            campaignAtAGlance: true,
            campaignPerformance: false,
            contentPerformance: true,
            platformPerformance: true,
            creatorContribution: false,
            audienceReach: false,
            budgetValue: true,
            qualityAssurance: true,
            nextCampaign: false,
            appendix: false,
          },
          editorialContent: {
            ...createEmptyEditorialContent(),
            contentPatternTags: ["Snelle hook"],
            contentInsights: ["Dubbel contentinzicht"],
          },
        }}
      />,
    );

    expect(html.match(/data-report-content-row=/g)).toHaveLength(6);
    expect(html).toContain("Afgesproken CPM");
    expect(html).toContain("Effectieve CPM");
    expect(html).toContain("De effectieve CPM laat zien wat je werkelijk betaalt");
    expect(html).toContain("Gecontroleerde clips");
    expect(html).toContain("Uitgesloten clips");
    expect(html).toContain("Uitgesloten views");
    expect(html).not.toContain("Effectieve CPM totaal");
    expect(html).not.toContain("Kwaliteitsstatus");
    expect(html).not.toContain("Open aandachtspunten");
    expect(html).not.toContain("Snelle hook");
    expect(html).not.toContain("Dubbel contentinzicht");
  });

  it("shows a clear empty state when no brand-visible countries are available", () => {
    const html = renderToStaticMarkup(
      <BrandReportDocument
        report={{
          title: "Fruit campagne eindrapport",
          updatedAt: "2026-06-10T00:00:00.000Z",
          brandVisibleAt: "2026-06-10T00:00:00.000Z",
          executiveSummary: "",
          keyTakeaways: [],
          learnings: [],
          nextCampaignRecommendations: [],
        }}
        data={{
          ...data,
          campaign: { ...data.campaign, platforms: ["Instagram"] },
          audience: {
            sampleCount: 1,
            platformsLabel: "Instagram",
            ageBuckets: { "18-24": 0.7, "25-34": 0.3 },
            genderSplit: { vrouw: 0.6, man: 0.4 },
            topCountries: [],
            fitStatus: "Gedeeltelijke match",
          },
        }}
        editorial={{
          title: "Fruit campagne eindrapport",
          executiveSummary: "",
          keyTakeaways: [],
          learnings: [],
          nextCampaignRecommendations: [],
          sectionSettings: {
            ...DEFAULT_CAMPAIGN_REPORT_SECTIONS,
            cover: false,
            executiveSummary: false,
            campaignAtAGlance: false,
            campaignPerformance: false,
            contentPerformance: false,
            platformPerformance: false,
            creatorContribution: false,
            audienceReach: true,
            budgetValue: false,
            qualityAssurance: false,
            nextCampaign: false,
            appendix: false,
          },
          editorialContent: createEmptyEditorialContent(),
        }}
      />,
    );

    expect(html).toContain("Geen landen beschikbaar");
    expect(html).toContain("Leeftijd");
    expect(html).toContain("Gender");
  });

  it("uses the requested age and gender order in the printable demographics", () => {
    const html = renderToStaticMarkup(
      <BrandReportDocument
        report={{
          title: "Fruit campagne eindrapport",
          updatedAt: "2026-06-10T00:00:00.000Z",
          brandVisibleAt: "2026-06-10T00:00:00.000Z",
          executiveSummary: "",
          keyTakeaways: [],
          learnings: [],
          nextCampaignRecommendations: [],
        }}
        data={{
          ...data,
          campaign: { ...data.campaign, platforms: ["Instagram"] },
          audience: {
            sampleCount: 1,
            platformsLabel: "Instagram",
            ageBuckets: { "65+": 0.1, "25-34": 0.3, "18-24": 0.6 },
            genderSplit: { female: 0.5, other: 0.1, male: 0.4 },
            topCountries: [],
            fitStatus: "Onvoldoende data",
          },
        }}
        editorial={{
          title: "Fruit campagne eindrapport",
          executiveSummary: "",
          keyTakeaways: [],
          learnings: [],
          nextCampaignRecommendations: [],
          sectionSettings: {
            ...DEFAULT_CAMPAIGN_REPORT_SECTIONS,
            cover: false,
            executiveSummary: false,
            campaignAtAGlance: false,
            campaignPerformance: false,
            contentPerformance: false,
            platformPerformance: false,
            creatorContribution: false,
            audienceReach: true,
            budgetValue: false,
            qualityAssurance: false,
            nextCampaign: false,
            appendix: false,
          },
          editorialContent: createEmptyEditorialContent(),
        }}
      />,
    );

    expect(html.indexOf("18-24")).toBeLessThan(html.indexOf("25-34"));
    expect(html.indexOf("25-34")).toBeLessThan(html.indexOf("65+"));
    expect(html.indexOf(">Man<")).toBeLessThan(html.indexOf(">Vrouw<"));
    expect(html.indexOf(">Vrouw<")).toBeLessThan(html.indexOf(">Anders<"));
  });
});
