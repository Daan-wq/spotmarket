import { describe, expect, it } from "vitest";
import {
  buildBrandChartTooltipContent,
  buildChartSeries,
  buildChartPauseAreas,
} from "./brand-views-chart";

describe("brand views chart", () => {
  it("shows the date, daily views, cumulative views, and milestones in the tooltip", () => {
    expect(buildBrandChartTooltipContent({
      date: "2026-06-08",
      views: 45000,
      cumulativeViews: 325000,
      milestones: [
        { type: "RESUMED", date: "2026-06-08", label: "Campagne hervat" },
      ],
      pausePeriods: [{ startDate: "2026-06-01", endDate: "2026-06-08" }],
    })).toEqual({
      dateLabel: "8 juni 2026",
      dailyViewsLabel: "45.000",
      cumulativeViewsLabel: "325.000",
      milestoneLabels: ["Campagne hervat"],
      pauseLabel: null,
    });
  });

  it("marks tooltip dates inside a pause and resolves closed and open chart bands", () => {
    const pausePeriods = [
      { startDate: "2026-05-24", endDate: "2026-06-06" },
      { startDate: "2026-06-09", endDate: null },
    ];

    expect(buildBrandChartTooltipContent({
      date: "2026-05-28",
      views: 18000,
      cumulativeViews: 620000,
      milestones: [],
      pausePeriods,
    }).pauseLabel).toBe("Campagne gepauzeerd");

    expect(buildChartPauseAreas(pausePeriods, [
      { date: "2026-05-21", views: 100000, cumulativeViews: 100000 },
      { date: "2026-06-10", views: 20000, cumulativeViews: 900000 },
    ])).toEqual([
      { startDate: "2026-05-24", endDate: "2026-06-06" },
      { startDate: "2026-06-09", endDate: "2026-06-10" },
    ]);
  });

  it("holds the previous completed day on the line while preserving current-day tooltip views", () => {
    expect(buildChartSeries(
      [
        { date: "2026-06-10", views: 120000, cumulativeViews: 120000 },
        { date: "2026-06-11", views: 6592, cumulativeViews: 126592 },
      ],
      [],
      [],
      "2026-06-11",
    )).toEqual([
      {
        date: "2026-06-10",
        views: 120000,
        actualViews: 120000,
        cumulativeViews: 120000,
      },
      {
        date: "2026-06-11",
        views: 120000,
        actualViews: 6592,
        cumulativeViews: 126592,
      },
    ]);
  });
});
