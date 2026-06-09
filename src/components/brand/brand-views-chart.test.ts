import { describe, expect, it } from "vitest";
import { buildBrandChartTooltipContent } from "./brand-views-chart";

describe("brand views chart", () => {
  it("shows the date, daily views, cumulative views, and milestones in the tooltip", () => {
    expect(buildBrandChartTooltipContent({
      date: "2026-06-08",
      views: 45000,
      cumulativeViews: 325000,
      milestones: [
        { type: "RESUMED", date: "2026-06-08", label: "Campagne hervat" },
      ],
    })).toEqual({
      dateLabel: "8 juni 2026",
      dailyViewsLabel: "45.000",
      cumulativeViewsLabel: "325.000",
      milestoneLabels: ["Campagne hervat"],
    });
  });
});
