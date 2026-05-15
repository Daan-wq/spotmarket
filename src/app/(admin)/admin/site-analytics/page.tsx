import { getSiteAnalyticsDashboard } from "@/lib/site-analytics/dashboard";
import { SiteAnalyticsView } from "./site-analytics-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

function parseRangeDays(range?: string) {
  return range === "14d" ? 14 : 30;
}

export default async function AdminSiteAnalyticsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const dashboard = await getSiteAnalyticsDashboard(parseRangeDays(sp.range));
  return <SiteAnalyticsView dashboard={dashboard} />;
}
