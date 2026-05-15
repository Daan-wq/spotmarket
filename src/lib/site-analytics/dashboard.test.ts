import { describe, expect, it } from "vitest";
import { buildSiteAnalyticsDashboardFromSnapshots } from "./dashboard";

describe("site analytics dashboard aggregation", () => {
  it("builds an empty dashboard", () => {
    const dashboard = buildSiteAnalyticsDashboardFromSnapshots([], 30);

    expect(dashboard.hasData).toBe(false);
    expect(dashboard.metrics.pageviews).toBe(0);
    expect(dashboard.lastSyncedAt).toBeNull();
  });

  it("aggregates daily snapshots", () => {
    const dashboard = buildSiteAnalyticsDashboardFromSnapshots([
      {
        periodStart: new Date("2026-05-12T00:00:00.000Z"),
        periodEnd: new Date("2026-05-12T23:59:00.000Z"),
        syncedAt: new Date("2026-05-13T00:10:00.000Z"),
        metrics: { visitors: 10, sessions: 12, pageviews: 100, signups: 5, onboardingCompletions: 2 },
        topPages: [{ path: "/", pageviews: 70 }],
        referrers: [{ source: "Direct", visits: 80 }],
        funnel: [{ label: "Pageviews", count: 100, rate: 100 }],
        recordings: [{ sessionId: "s1", path: "/", lastSeenAt: "2026-05-12T12:00:00Z", href: "https://example.com" }],
      },
      {
        periodStart: new Date("2026-05-13T00:00:00.000Z"),
        periodEnd: new Date("2026-05-13T12:00:00.000Z"),
        syncedAt: new Date("2026-05-13T12:10:00.000Z"),
        metrics: { visitors: 4, sessions: 5, pageviews: 50, signups: 5, onboardingCompletions: 3 },
        topPages: [{ path: "/", pageviews: 20 }, { path: "/sign-up", pageviews: 10 }],
        referrers: [{ source: "Direct", visits: 20 }, { source: "google.com", visits: 5 }],
        funnel: [{ label: "Pageviews", count: 50, rate: 100 }],
        recordings: [],
      },
    ], 30);

    expect(dashboard.hasData).toBe(true);
    expect(dashboard.metrics).toMatchObject({
      visitors: 14,
      sessions: 17,
      pageviews: 150,
      signups: 10,
      onboardingCompletions: 5,
      signupConversionRate: 6.7,
      onboardingCompletionRate: 50,
    });
    expect(dashboard.topPages[0]).toEqual({ path: "/", pageviews: 90 });
    expect(dashboard.referrers[0]).toEqual({ source: "Direct", visits: 100 });
    expect(dashboard.timeSeries).toHaveLength(2);
  });
});
