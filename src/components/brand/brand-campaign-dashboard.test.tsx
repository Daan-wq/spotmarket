import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  BrandCampaignDashboard,
  buildGoalMeterState,
} from "./brand-campaign-dashboard";
import type { BrandCampaignDashboardData } from "@/lib/brand-report-portal";

vi.mock("./brand-views-chart", () => ({
  BrandViewsChart: () => <div data-testid="brand-views-chart">chart</div>,
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
  },
  timeline: [{ date: "2026-06-08", views: 45000, cumulativeViews: 325000 }],
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
      platform: "TikTok",
      postUrl: "https://example.com/clip-1",
      thumbnailUrl: "https://example.com/clip-1.jpg",
      views: 180000,
      engagement: 12500,
    },
  ],
};

const campaigns = [
  {
    id: "campaign-active",
    name: "Summer launch",
    status: "active" as const,
    brandName: "ClipProfit Brand",
  },
  {
    id: "campaign-completed",
    name: "Spring launch",
    status: "completed" as const,
    brandName: "ClipProfit Brand",
  },
];

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
      <BrandCampaignDashboard campaigns={campaigns} selectedCampaignId="campaign-active" data={data} />,
    );

    expect(html).toContain("Summer launch");
    expect(html).toContain("Actief");
    expect(html).toContain("Spring launch");
    expect(html).toContain("Afgerond");
    expect(html).toContain("Totale views");
    expect(html).toContain("Budgetverbruik");
    expect(html).toContain("Budget resterend");
    expect(html).toContain("Afgesproken CPM");
    expect(html).toContain("Effectieve CPM");
    expect(html).toContain("Verwachte doeldatum");
    expect(html).toContain("Postende accounts");
    expect(html).toContain("Clips ingezonden");
    expect(html).toContain("Platformoverzicht");
    expect(html).toContain("Over-delivery");
    expect(html).toContain("Reageer op deze video’s voor extra engagement en bereik via je eigen socials.");
    expect(html).toContain("https://example.com/clip-1");
    expect(html).toContain("/brand/content?campaignId=campaign-active");
    expect(html).not.toContain("bots");
    expect(html).not.toContain("flags");
  });

  it("shows clear empty states when approved content and platform data are not available yet", () => {
    const html = renderToStaticMarkup(
      <BrandCampaignDashboard
        campaigns={campaigns}
        selectedCampaignId="campaign-active"
        data={{ ...data, platformBreakdown: [], topContent: [] }}
      />,
    );

    expect(html).toContain("Nog geen platformdata beschikbaar.");
    expect(html).toContain("Nog geen goedgekeurde topcontent");
  });
});
