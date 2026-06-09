import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BrandCampaignDashboard } from "./brand-campaign-dashboard";
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
    overdeliveryViews: 25000,
    overdeliveryPercent: 0.08,
  },
  timeline: [{ date: "2026-06-08", views: 45000 }],
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
    expect(html).toContain("Over-delivery");
    expect(html).toContain("Reageer op deze video’s voor extra engagement en bereik via je eigen socials.");
    expect(html).toContain("https://example.com/clip-1");
    expect(html).not.toContain("bots");
    expect(html).not.toContain("flags");
  });

  it("shows a clear empty state when approved top content is not available yet", () => {
    const html = renderToStaticMarkup(
      <BrandCampaignDashboard
        campaigns={campaigns}
        selectedCampaignId="campaign-active"
        data={{ ...data, topContent: [] }}
      />,
    );

    expect(html).toContain("Nog geen goedgekeurde topcontent");
  });
});
