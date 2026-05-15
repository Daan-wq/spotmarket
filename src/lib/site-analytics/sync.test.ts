import { describe, expect, it, vi } from "vitest";
import {
  parseReferrersRows,
  parseTopPagesRows,
  parseTotalsRows,
  upsertSiteAnalyticsSnapshot,
} from "./sync";

describe("site analytics sync parsing", () => {
  it("parses totals and computes conversion rates", () => {
    expect(parseTotalsRows([[10, 8, 100, 5, 2]])).toEqual({
      visitors: 10,
      sessions: 8,
      pageviews: 100,
      signups: 5,
      onboardingCompletions: 2,
      signupConversionRate: 5,
      onboardingCompletionRate: 40,
    });
  });

  it("merges top pages and drops admin routes", () => {
    expect(parseTopPagesRows([
      ["https://clipprofit.com/", 4],
      ["https://clipprofit.com/admin", 99],
      ["https://clipprofit.com/?utm_source=x", 3],
    ])).toEqual([
      { path: "/", pageviews: 4 },
      { path: "/?utm_source=x", pageviews: 3 },
    ]);
  });

  it("normalizes referrers", () => {
    expect(parseReferrersRows([
      ["https://www.google.com/search?q=clipprofit", 3],
      ["instagram", 2],
      ["", 1],
    ])).toEqual([
      { source: "google.com", visits: 3 },
      { source: "instagram", visits: 2 },
      { source: "Direct", visits: 1 },
    ]);
  });

  it("upserts by granularity, segment, and period start", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const periodStart = new Date("2026-05-13T00:00:00.000Z");
    const periodEnd = new Date("2026-05-13T01:00:00.000Z");

    await upsertSiteAnalyticsSnapshot({ upsert }, {
      granularity: "hourly",
      segment: "non_admin",
      periodStart,
      periodEnd,
      metrics: {
        visitors: 1,
        sessions: 1,
        pageviews: 2,
        signups: 0,
        onboardingCompletions: 0,
        signupConversionRate: 0,
        onboardingCompletionRate: 0,
      },
      topPages: [],
      referrers: [],
      funnel: [],
      recordings: [],
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        granularity_segment_periodStart: {
          granularity: "hourly",
          segment: "non_admin",
          periodStart,
        },
      },
      create: expect.objectContaining({ periodStart, periodEnd }),
      update: expect.objectContaining({ periodEnd }),
    }));
  });
});
