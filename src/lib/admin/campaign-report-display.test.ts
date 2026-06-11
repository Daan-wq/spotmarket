import { describe, expect, it } from "vitest";
import {
  audienceBarWidth,
  formatAudienceCountryLabel,
  formatAudienceShare,
  renderCampaignReportTemplate,
  reportQualityStatusLabel,
  resolveCampaignReportToken,
  sortAudienceAgeRows,
  sortAudienceGenderRows,
} from "@/lib/admin/campaign-report-display";
import {
  DEFAULT_AUDIENCE_INSIGHT_TEMPLATE,
  normalizeEditorialContent,
  normalizeSectionSettings,
} from "@/lib/admin/campaign-report-shared";

const liveData = {
  campaign: {
    brandName: "Bram's Fruit",
    name: "Zomercampagne",
    goalViews: 2_000_000,
    platforms: ["TikTok", "Instagram"],
    totalBudget: 500,
  },
  performance: {
    approvedViews: 3_500_000,
    approvedClips: 110,
    goalCompletion: 1.75,
    budgetUsed: 500,
    budgetUsedPercent: 1,
    costPerThousandViews: 0.14,
  },
  financial: {
    approvedPayableViews: 2_000_000,
    overdeliveryViews: 1_500_000,
    effectiveCpm: 0.14,
  },
  platformBreakdown: [{ platform: "TikTok", views: 3_400_000 }],
  timeline: [{ date: "2026-05-22", views: 100_000 }],
};

describe("campaign report display helpers", () => {
  it("formats audience countries as Dutch full names", () => {
    expect(formatAudienceCountryLabel("nl")).toBe("Nederland");
    expect(formatAudienceCountryLabel("in")).toBe("India");
    expect(formatAudienceCountryLabel("us")).toBe("Verenigde Staten");
  });

  it("formats audience percentages with two decimals", () => {
    expect(formatAudienceShare(0.8)).toBe("80,00%");
    expect(formatAudienceShare(0.02562)).toBe("2,56%");
    expect(formatAudienceShare(2.562)).toBe("2,56%");
  });

  it("uses the displayed audience percentage as the bar width", () => {
    expect(audienceBarWidth(0.9448)).toBe(94.48);
    expect(audienceBarWidth(0.0481)).toBe(4.81);
    expect(audienceBarWidth(94.48)).toBe(94.48);
  });

  it("orders brand audience age and gender rows consistently", () => {
    expect(sortAudienceAgeRows({
      "65+": 0.1,
      "35-44": 0.2,
      "18-24": 0.4,
      "25-34": 0.3,
    })).toEqual([
      { label: "18-24", value: 0.4 },
      { label: "25-34", value: 0.3 },
      { label: "35-44", value: 0.2 },
      { label: "65+", value: 0.1 },
    ]);

    expect(sortAudienceGenderRows({
      female: 0.5,
      other: 0.1,
      male: 0.4,
    })).toEqual([
      { label: "male", value: 0.4 },
      { label: "female", value: 0.5 },
      { label: "other", value: 0.1 },
    ]);
  });

  it("uses Dutch brand-safe quality status labels", () => {
    expect(reportQualityStatusLabel("passed")).toBe("Gecontroleerd");
    expect(reportQualityStatusLabel("passed_with_exclusions")).toBe("Gecontroleerd met uitsluitingen");
    expect(reportQualityStatusLabel("needs_attention")).toBe("Aandacht nodig");
  });

  it("maps document tokens to the current live report model", () => {
    expect(resolveCampaignReportToken("performance.currentViews", liveData)).toBe(3_500_000);
    expect(resolveCampaignReportToken("performance.targetViews", liveData)).toBe(2_000_000);
    expect(resolveCampaignReportToken("performance.overdeliveryViews", liveData)).toBe(1_500_000);
    expect(resolveCampaignReportToken("performance.deliveryProgress", liveData)).toBe(1.75);
    expect(resolveCampaignReportToken("performance.paidEligibleViews", liveData)).toBe(2_000_000);
    expect(resolveCampaignReportToken("audience.platformsLabel", liveData)).toBe("TikTok en Instagram");
    expect(resolveCampaignReportToken("platformBreakdown[0].platform", liveData)).toBe("TikTok");
  });

  it("renders live values without leaking unknown raw tokens", () => {
    expect(
      renderCampaignReportTemplate(
        "Bereik: {{performance.currentViews}}. Onbekend: {{missing.value}}.",
        liveData,
        { mode: "live" },
      ),
    ).toBe("Bereik: 3.500.000. Onbekend: geen waarde.");

    expect(
      renderCampaignReportTemplate(
        "Bereik: {{performance.currentViews}}.",
        liveData,
        { mode: "template" },
      ),
    ).toBe("Bereik: {{performance.currentViews}}.");
  });

  it("normalizes the new editor fields while retaining legacy editorial fields", () => {
    const content = normalizeEditorialContent({
      campaignType: "Awareness",
      financialNote: "Budget volledig benut.",
      templateBlocks: {
        "section.summary.title": "Campagneresultaat",
        "audience.insight": "Publieksdata is gebaseerd op beschikbare platformdata. De beschikbaarheid kan per platform verschillen.",
      },
      contentPatternTags: ["snelle hook"],
      nextCampaignPlan: ["Heractiveer topcreators"],
    });

    expect(content.campaignType).toBe("Awareness");
    expect(content.financialNote).toBe("Budget volledig benut.");
    expect(content.templateBlocks["section.summary.title"]).toBe("Campagneresultaat");
    expect(content.templateBlocks["audience.insight"]).toBe(DEFAULT_AUDIENCE_INSIGHT_TEMPLATE);
    expect(content.contentPatternTags).toEqual(["snelle hook"]);
    expect(content.nextCampaignPlan).toEqual(["Heractiveer topcreators"]);
  });

  it("maps saved legacy section settings to the standard report sections", () => {
    const sections = normalizeSectionSettings({
      campaignSetup: false,
      performance: true,
      topContent: false,
      audience: true,
      quality: true,
    });

    expect(sections.campaignAtAGlance).toBe(false);
    expect(sections.campaignPerformance).toBe(true);
    expect(sections.contentPerformance).toBe(false);
    expect(sections.audienceReach).toBe(true);
    expect(sections.qualityAssurance).toBe(true);
  });
});
