import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createEmptyEditorialContent, DEFAULT_CAMPAIGN_REPORT_SECTIONS } from "@/lib/admin/campaign-report-shared";
import type { BrandReportLiveData } from "@/lib/brand-report-portal";
import { BrandReportActions } from "./brand-report-actions";
import { BrandReportDocument } from "./brand-report-document";

const data = {
  campaign: {
    brandName: "Bram's Fruit",
    name: "Fruit campagne",
  },
  performance: {},
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
    const html = renderToStaticMarkup(<BrandReportActions />);
    expect(html).toContain("PDF downloaden");
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
          audience: {
            sampleCount: 1,
            platformsLabel: "Instagram",
            ageBuckets: { "18-24": 0.7, "25-34": 0.3 },
            genderSplit: { vrouw: 0.6, man: 0.4 },
            topCountries: [],
            fitStatus: "Beperkte match",
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
});
