import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  BrandCampaignDashboard,
  buildGoalMeterState,
} from "./brand-campaign-dashboard";
import type { BrandCampaignDashboardData } from "@/lib/brand-report-portal";

vi.mock("./brand-views-chart", () => ({
  BrandViewsChart: ({ pausePeriods }: { pausePeriods: unknown[] }) => (
    <div data-testid="brand-views-chart" data-pause-count={pausePeriods.length}>chart</div>
  ),
}));

const data: BrandCampaignDashboardData = {
  generatedAt: "2026-06-09T12:00:00.000Z",
  campaign: {
    id: "campaign-active",
    name: "Summer launch",
    brandId: "brand-1",
    brandName: "ClipProfit Brand",
    platforms: ["TikTok", "Instagram"],
    totalBudget: 5000,
    businessCpm: 14,
    goalViews: 500000,
    startsAt: "2026-06-01T00:00:00.000Z",
    deadline: "2026-07-01T00:00:00.000Z",
  },
  performance: {
    currentViews: 325000,
    targetViews: 500000,
    deliveryProgress: 0.65,
    budgetUsed: 2750,
    budgetUsedPercent: 0.55,
    budgetRemaining: 2250,
    businessCpm: 14,
    effectiveCpm: 8.46,
    overdeliveryViews: 0,
    overdeliveryPercent: 0,
    totalSubmissions: 18,
    approvedClips: 12,
    uniquePages: 7,
    averageViewsPerApprovedClip: 27083.33,
    totalEngagement: 14500,
    engagementRate: 0.0446,
    expectedGoalDate: "2026-06-14",
    forecast: {
      status: "active",
      expectedGoalDate: "2026-06-14",
      averageViewsPerActiveDay: 40625,
      activeDays: 8,
      excludedPauseDays: 1,
    },
  },
  timeline: [{ date: "2026-06-08", views: 45000, cumulativeViews: 325000 }],
  pausePeriods: [{ startDate: "2026-06-05", endDate: "2026-06-06" }],
  milestones: [
    { type: "STARTED", date: "2026-06-01", label: "Campagne gestart" },
    { type: "PLANNED_END", date: "2026-07-01", label: "Geplande einddatum" },
  ],
  platformBreakdown: [
    {
      platform: "TikTok",
      views: 250000,
      clips: 8,
      engagement: 12000,
      engagementRate: 0.048,
      effectiveCpm: 8.4,
    },
  ],
  topContent: [
    {
      id: "clip-1",
      creator: "Creator One",
      platform: "TikTok",
      postUrl: "https://example.com/clip-1",
      thumbnailUrl: "https://example.com/clip-1.jpg",
      views: 180000,
      engagement: 12500,
    },
  ],
  creators: [
    {
      creator: "Creator One",
      submissions: 4,
      approvedSubmissions: 4,
      views: 180000,
      approvalRate: 1,
      reliabilityStatus: "Aanbevolen",
    },
  ],
  audience: {
    sampleCount: 2,
    platformsLabel: "Instagram",
    ageBuckets: { "18-24": 0.62, "25-34": 0.38 },
    genderSplit: { vrouw: 0.58, man: 0.42 },
    topCountries: [
      { code: "NL", share: 0.7 },
      { code: "US", share: 0.05 },
      { code: "BE", share: 0.025 },
    ],
    fitStatus: "Sterke match",
  },
  quality: {
    status: "passed" as const,
    reviewedClips: 12,
    excludedClips: 0,
    excludedViews: 0,
  },
};

describe("BrandCampaignDashboard", () => {
  it("builds a capped goal meter for normal progress, overdelivery, and missing goals", () => {
    expect(buildGoalMeterState(0.65, 500000)).toEqual({
      label: "65%",
      degrees: 234,
      hasGoal: true,
    });
    expect(buildGoalMeterState(1.2, 500000)).toEqual({
      label: "120%",
      degrees: 360,
      hasGoal: true,
    });
    expect(buildGoalMeterState(null, null)).toEqual({
      label: "–",
      degrees: 0,
      hasGoal: false,
    });
  });

  it("renders the selected campaign, status tags, core metrics, and engagement guidance", () => {
    const html = renderToStaticMarkup(
      <BrandCampaignDashboard selectedCampaignId="campaign-active" selectedCampaignStatus="active" data={data} />,
    );

    expect(html).toContain("Summer launch");
    expect(html).toContain("Actief");
    expect(html).not.toContain("Spring launch");
    expect(html).toContain("Totale views");
    expect(html).toContain("Budgetverbruik");
    expect(html).toContain("Budget resterend");
    expect(html).toContain("Afgesproken CPM");
    expect(html).toContain("Effectieve CPM");
    expect(html).toContain("Verwachte doeldatum");
    expect(html).toContain("40.625 views per actieve dag");
    expect(html).toContain("1 pauzedag uitgesloten");
    expect(html).toContain('data-pause-count="1"');
    expect(html).toContain("Postende accounts");
    expect(html).toContain("Clips ingezonden");
    expect(html).toContain("Platformoverzicht");
    expect(html).toContain("Creatorbijdrage");
    expect(html).toContain("Publiek en bereik");
    expect(html).toContain("Budget en waarde");
    expect(html).toContain("Kwaliteitscontrole");
    expect(html).not.toContain("Kwaliteitsstatus");
    expect(html).toContain("Sterke match");
    expect(html).toContain("Nederland");
    expect(html).toContain("width:70%");
    expect(html).toContain("width:5%");
    expect(html).toContain("Over-delivery");
    expect(html).toContain("Reageer op deze video’s voor extra engagement en bereik via je eigen socials.");
    expect(html).toContain("https://example.com/clip-1");
    expect(html).toContain("/brand/content?campaignId=campaign-active");
    expect(html).not.toContain("bots");
    expect(html).not.toContain("flags");
    expect(html).not.toContain("earnedAmount");
  });

  it("shows clear empty states when approved content and platform data are not available yet", () => {
    const html = renderToStaticMarkup(
      <BrandCampaignDashboard
        selectedCampaignId="campaign-active"
        selectedCampaignStatus="active"
        data={{ ...data, platformBreakdown: [], topContent: [] }}
      />,
    );

    expect(html).toContain("Nog geen platformdata beschikbaar.");
    expect(html).toContain("Nog geen goedgekeurde topcontent");
  });

  it("shows a clear empty state when no brand-visible countries are available", () => {
    const html = renderToStaticMarkup(
      <BrandCampaignDashboard
        selectedCampaignId="campaign-active"
        selectedCampaignStatus="active"
        data={{
          ...data,
          audience: {
            ...data.audience,
            topCountries: [],
          },
        }}
      />,
    );

    expect(html).toContain("Geen landen beschikbaar");
    expect(html).toContain("Leeftijd");
    expect(html).toContain("Gender");
  });

  it("suppresses the forecast date while the campaign is paused", () => {
    const pausedData: BrandCampaignDashboardData = {
      ...data,
      performance: {
        ...data.performance,
        expectedGoalDate: null,
        forecast: {
          ...data.performance.forecast,
          status: "paused",
          expectedGoalDate: null,
        },
      },
    };

    const html = renderToStaticMarkup(
      <BrandCampaignDashboard
        selectedCampaignId="campaign-active"
        selectedCampaignStatus="active"
        data={pausedData}
      />,
    );

    expect(html).toContain("Forecast hervat zodra de campagne actief is");
  });
});
