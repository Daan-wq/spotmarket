import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EMPTY_SITE_ANALYTICS_METRICS } from "@/lib/site-analytics/model";
import type { SiteAnalyticsDashboard } from "@/lib/site-analytics/dashboard";
import { SiteAnalyticsView } from "./site-analytics-view";

function baseDashboard(overrides: Partial<SiteAnalyticsDashboard> = {}): SiteAnalyticsDashboard {
  return {
    hasData: false,
    rangeDays: 30,
    lastSyncedAt: null,
    configuration: {
      isConfigured: true,
      host: "https://eu.posthog.com",
      projectId: "123",
      missing: [],
    },
    metrics: EMPTY_SITE_ANALYTICS_METRICS,
    timeSeries: [],
    topPages: [],
    referrers: [],
    funnel: [],
    recordings: [],
    ...overrides,
  };
}

describe("SiteAnalyticsView", () => {
  it("renders the empty state", () => {
    const html = renderToStaticMarkup(<SiteAnalyticsView dashboard={baseDashboard()} showChart={false} />);
    expect(html).toContain("Nog geen site analytics");
    expect(html).toContain("sync-site-analytics");
  });

  it("renders missing PostHog configuration before the empty data state", () => {
    const html = renderToStaticMarkup(
      <SiteAnalyticsView
        dashboard={baseDashboard({
          configuration: {
            isConfigured: false,
            host: "https://eu.posthog.com",
            projectId: null,
            missing: ["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"],
          },
        })}
        showChart={false}
      />,
    );

    expect(html).toContain("PostHog is nog niet volledig geconfigureerd");
    expect(html).toContain("POSTHOG_PERSONAL_API_KEY");
    expect(html).toContain("POSTHOG_PROJECT_ID");
    expect(html).toContain("https://eu.posthog.com");
    expect(html).not.toContain("Deze pagina wordt gevuld na de eerste");
  });

  it("renders populated usage sections", () => {
    const html = renderToStaticMarkup(
      <SiteAnalyticsView
        showChart={false}
        dashboard={baseDashboard({
          hasData: true,
          lastSyncedAt: new Date("2026-05-13T12:00:00.000Z"),
          metrics: {
            visitors: 120,
            sessions: 140,
            pageviews: 560,
            signups: 28,
            onboardingCompletions: 14,
            signupConversionRate: 5,
            onboardingCompletionRate: 50,
          },
          topPages: [{ path: "/sign-up", pageviews: 88 }],
          referrers: [{ source: "google.com", visits: 44 }],
          funnel: [{ label: "Signups", count: 28, rate: 5 }],
          recordings: [{ sessionId: "abc", path: "/creator/campaigns", lastSeenAt: "2026-05-13T11:00:00Z", href: "https://eu.posthog.com/project/1/replay/abc" }],
        })}
      />,
    );

    expect(html).toContain("Site-analytics");
    expect(html).toContain("/sign-up");
    expect(html).toContain("google.com");
    expect(html).toContain("/creator/campaigns");
  });
});
