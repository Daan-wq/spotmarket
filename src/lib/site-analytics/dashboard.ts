import { prisma } from "@/lib/prisma";
import {
  EMPTY_SITE_ANALYTICS_METRICS,
  SITE_ANALYTICS_SEGMENT,
  addDays,
  buildMetrics,
  startOfDay,
  sumMetrics,
  toDateKey,
  toNumber,
  type SiteAnalyticsFunnelStep,
  type SiteAnalyticsMetrics,
  type SiteAnalyticsRecording,
  type SiteAnalyticsReferrer,
  type SiteAnalyticsTimePoint,
  type SiteAnalyticsTopPage,
} from "@/lib/site-analytics/model";
import { getPostHogConfigurationStatus, type PostHogConfigurationStatus } from "@/lib/site-analytics/posthog";

interface SnapshotRow {
  periodStart: Date;
  periodEnd: Date;
  syncedAt: Date;
  metrics: unknown;
  topPages: unknown;
  referrers: unknown;
  funnel: unknown;
  recordings: unknown;
}

export interface SiteAnalyticsDashboard {
  hasData: boolean;
  rangeDays: number;
  lastSyncedAt: Date | null;
  configuration: PostHogConfigurationStatus;
  metrics: SiteAnalyticsMetrics;
  timeSeries: SiteAnalyticsTimePoint[];
  topPages: SiteAnalyticsTopPage[];
  referrers: SiteAnalyticsReferrer[];
  funnel: SiteAnalyticsFunnelStep[];
  recordings: SiteAnalyticsRecording[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function metricsFromJson(value: unknown): SiteAnalyticsMetrics {
  const record = asRecord(value);
  return buildMetrics({
    visitors: toNumber(record.visitors),
    sessions: toNumber(record.sessions),
    pageviews: toNumber(record.pageviews),
    signups: toNumber(record.signups),
    onboardingCompletions: toNumber(record.onboardingCompletions),
  });
}

function mergeTopPages(snapshots: SnapshotRow[]) {
  const merged = new Map<string, number>();
  for (const snapshot of snapshots) {
    for (const item of asArray<SiteAnalyticsTopPage>(snapshot.topPages)) {
      if (!item.path) continue;
      merged.set(item.path, (merged.get(item.path) ?? 0) + toNumber(item.pageviews));
    }
  }
  return [...merged.entries()]
    .map(([path, pageviews]) => ({ path, pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 12);
}

function mergeReferrers(snapshots: SnapshotRow[]) {
  const merged = new Map<string, number>();
  for (const snapshot of snapshots) {
    for (const item of asArray<SiteAnalyticsReferrer>(snapshot.referrers)) {
      if (!item.source) continue;
      merged.set(item.source, (merged.get(item.source) ?? 0) + toNumber(item.visits));
    }
  }
  return [...merged.entries()]
    .map(([source, visits]) => ({ source, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 12);
}

function latestRecordings(snapshots: SnapshotRow[]) {
  return snapshots
    .flatMap((snapshot) => asArray<SiteAnalyticsRecording>(snapshot.recordings))
    .filter((item) => item.sessionId && item.href)
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
    .slice(0, 8);
}

export function buildSiteAnalyticsDashboardFromSnapshots(
  snapshots: SnapshotRow[],
  rangeDays: number,
  configuration: PostHogConfigurationStatus = getPostHogConfigurationStatus(),
): SiteAnalyticsDashboard {
  const ordered = [...snapshots].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  const metricsBySnapshot = ordered.map((snapshot) => metricsFromJson(snapshot.metrics));
  const metrics = metricsBySnapshot.length > 0 ? sumMetrics(metricsBySnapshot) : EMPTY_SITE_ANALYTICS_METRICS;

  return {
    hasData: ordered.length > 0 && metrics.pageviews > 0,
    rangeDays,
    lastSyncedAt: ordered.reduce<Date | null>((latest, snapshot) => {
      if (!latest || snapshot.syncedAt > latest) return snapshot.syncedAt;
      return latest;
    }, null),
    configuration,
    metrics,
    timeSeries: ordered.map((snapshot, index) => ({
      date: toDateKey(snapshot.periodStart),
      ...metricsBySnapshot[index],
    })),
    topPages: mergeTopPages(ordered),
    referrers: mergeReferrers(ordered),
    funnel: asArray<SiteAnalyticsFunnelStep>(ordered.at(-1)?.funnel),
    recordings: latestRecordings(ordered),
  };
}

export async function getSiteAnalyticsDashboard(rangeDays = 30, now = new Date()) {
  const start = addDays(startOfDay(now), -(rangeDays - 1));
  const snapshots = await prisma.siteAnalyticsSnapshot.findMany({
    where: {
      granularity: "daily",
      segment: SITE_ANALYTICS_SEGMENT,
      periodStart: { gte: start },
    },
    orderBy: { periodStart: "asc" },
  });

  return buildSiteAnalyticsDashboardFromSnapshots(snapshots, rangeDays);
}
