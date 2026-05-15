import { Prisma } from "@prisma/client";
import {
  SITE_ANALYTICS_SEGMENT,
  addHours,
  buildFunnel,
  buildMetrics,
  buildRecordingUrl,
  normalizePath,
  normalizeReferrer,
  startOfDay,
  startOfHour,
  toNumber,
  toStringValue,
  type SiteAnalyticsGranularity,
  type SiteAnalyticsReferrer,
  type SiteAnalyticsRecording,
  type SiteAnalyticsSnapshotPayload,
  type SiteAnalyticsTopPage,
} from "@/lib/site-analytics/model";
import { getPostHogQueryConfig, runPostHogHogQLQuery, toHogQLDate, type PostHogQueryConfig } from "./posthog";

type QueryRunner = (sql: string, name: string) => Promise<unknown[][]>;

interface SnapshotDelegate {
  upsert(args: Prisma.SiteAnalyticsSnapshotUpsertArgs): Promise<unknown>;
}

const TRACKED_EVENTS = ["'$pageview'", "'clipprofit_signup_completed'", "'clipprofit_onboarding_completed'"].join(", ");

function eventFilter(start: Date, end: Date) {
  const startText = toHogQLDate(start);
  const endText = toHogQLDate(end);

  return `
    timestamp >= toDateTime('${startText}')
    AND timestamp < toDateTime('${endText}')
    AND event IN (${TRACKED_EVENTS})
    AND (properties.$current_url IS NULL OR properties.$current_url NOT LIKE '%/admin%')
    AND (properties.$pathname IS NULL OR properties.$pathname NOT LIKE '/admin%')
    AND (person.properties.role IS NULL OR person.properties.role != 'admin')
  `;
}

function totalsQuery(start: Date, end: Date) {
  return `
    SELECT
      uniq(distinct_id) AS visitors,
      uniqIf(properties.$session_id, properties.$session_id IS NOT NULL) AS sessions,
      countIf(event = '$pageview') AS pageviews,
      countIf(event = 'clipprofit_signup_completed') AS signups,
      countIf(event = 'clipprofit_onboarding_completed') AS onboarding_completions
    FROM events
    WHERE ${eventFilter(start, end)}
  `;
}

function topPagesQuery(start: Date, end: Date) {
  return `
    SELECT
      properties.$current_url AS url,
      count() AS pageviews
    FROM events
    WHERE ${eventFilter(start, end)}
      AND event = '$pageview'
    GROUP BY url
    ORDER BY pageviews DESC
    LIMIT 20
  `;
}

function referrersQuery(start: Date, end: Date) {
  return `
    SELECT
      coalesce(properties.utm_source, properties.$referring_domain, properties.$referrer, 'Direct') AS source,
      count() AS visits
    FROM events
    WHERE ${eventFilter(start, end)}
      AND event = '$pageview'
    GROUP BY source
    ORDER BY visits DESC
    LIMIT 20
  `;
}

function recordingsQuery(start: Date, end: Date) {
  return `
    SELECT
      properties.$session_id AS session_id,
      max(timestamp) AS last_seen_at,
      any(properties.$current_url) AS url
    FROM events
    WHERE ${eventFilter(start, end)}
      AND properties.$session_id IS NOT NULL
    GROUP BY session_id
    ORDER BY last_seen_at DESC
    LIMIT 8
  `;
}

export function parseTotalsRows(rows: unknown[][]) {
  const row = rows[0] ?? [];
  return buildMetrics({
    visitors: toNumber(row[0]),
    sessions: toNumber(row[1]),
    pageviews: toNumber(row[2]),
    signups: toNumber(row[3]),
    onboardingCompletions: toNumber(row[4]),
  });
}

export function parseTopPagesRows(rows: unknown[][]): SiteAnalyticsTopPage[] {
  const merged = new Map<string, number>();

  for (const row of rows) {
    const path = normalizePath(row[0]);
    if (path.startsWith("/admin")) continue;
    merged.set(path, (merged.get(path) ?? 0) + toNumber(row[1]));
  }

  return [...merged.entries()]
    .map(([path, pageviews]) => ({ path, pageviews }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 12);
}

export function parseReferrersRows(rows: unknown[][]): SiteAnalyticsReferrer[] {
  const merged = new Map<string, number>();

  for (const row of rows) {
    const source = normalizeReferrer(row[0]);
    merged.set(source, (merged.get(source) ?? 0) + toNumber(row[1]));
  }

  return [...merged.entries()]
    .map(([source, visits]) => ({ source, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 12);
}

export function parseRecordingRows(
  rows: unknown[][],
  config: Pick<PostHogQueryConfig, "host" | "projectId">,
): SiteAnalyticsRecording[] {
  return rows
    .map((row) => {
      const sessionId = toStringValue(row[0]);
      if (!sessionId) return null;
      const lastSeenAt = toStringValue(row[1]) || new Date().toISOString();
      return {
        sessionId,
        lastSeenAt,
        path: normalizePath(row[2]),
        href: buildRecordingUrl(config.host, config.projectId, sessionId),
      };
    })
    .filter((item): item is SiteAnalyticsRecording => Boolean(item));
}

export async function fetchSiteAnalyticsSnapshot(
  granularity: SiteAnalyticsGranularity,
  periodStart: Date,
  periodEnd: Date,
  config = getPostHogQueryConfig(),
  queryRunner: QueryRunner = (sql, name) => runPostHogHogQLQuery(sql, name, config),
): Promise<SiteAnalyticsSnapshotPayload> {
  const [totalsRows, topPagesRows, referrersRows, recordingsRows] = await Promise.all([
    queryRunner(totalsQuery(periodStart, periodEnd), `clipprofit ${granularity} site analytics totals`),
    queryRunner(topPagesQuery(periodStart, periodEnd), `clipprofit ${granularity} top pages`),
    queryRunner(referrersQuery(periodStart, periodEnd), `clipprofit ${granularity} referrers`),
    queryRunner(recordingsQuery(periodStart, periodEnd), `clipprofit ${granularity} recordings`),
  ]);

  const metrics = parseTotalsRows(totalsRows);

  return {
    granularity,
    segment: SITE_ANALYTICS_SEGMENT,
    periodStart,
    periodEnd,
    metrics,
    topPages: parseTopPagesRows(topPagesRows),
    referrers: parseReferrersRows(referrersRows),
    funnel: buildFunnel(metrics),
    recordings: parseRecordingRows(recordingsRows, config),
  };
}

export async function upsertSiteAnalyticsSnapshot(
  delegate: SnapshotDelegate,
  snapshot: SiteAnalyticsSnapshotPayload,
) {
  const data: Prisma.SiteAnalyticsSnapshotUpdateInput = {
    periodEnd: snapshot.periodEnd,
    metrics: snapshot.metrics as unknown as Prisma.InputJsonValue,
    topPages: snapshot.topPages as unknown as Prisma.InputJsonValue,
    referrers: snapshot.referrers as unknown as Prisma.InputJsonValue,
    funnel: snapshot.funnel as unknown as Prisma.InputJsonValue,
    recordings: snapshot.recordings as unknown as Prisma.InputJsonValue,
    syncedAt: new Date(),
  };
  const create: Prisma.SiteAnalyticsSnapshotCreateInput = {
    granularity: snapshot.granularity,
    segment: snapshot.segment,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    metrics: snapshot.metrics as unknown as Prisma.InputJsonValue,
    topPages: snapshot.topPages as unknown as Prisma.InputJsonValue,
    referrers: snapshot.referrers as unknown as Prisma.InputJsonValue,
    funnel: snapshot.funnel as unknown as Prisma.InputJsonValue,
    recordings: snapshot.recordings as unknown as Prisma.InputJsonValue,
    syncedAt: new Date(),
  };

  return delegate.upsert({
    where: {
      granularity_segment_periodStart: {
        granularity: snapshot.granularity,
        segment: snapshot.segment,
        periodStart: snapshot.periodStart,
      },
    },
    update: data,
    create,
  });
}

export async function syncSiteAnalyticsSnapshots(now = new Date()) {
  const { prisma } = await import("@/lib/prisma");
  const config = getPostHogQueryConfig();
  const currentHour = startOfHour(now);
  const previousHour = addHours(currentHour, -1);
  const today = startOfDay(now);

  const snapshots = await Promise.all([
    fetchSiteAnalyticsSnapshot("hourly", previousHour, currentHour, config),
    fetchSiteAnalyticsSnapshot("daily", today, now, config),
  ]);

  for (const snapshot of snapshots) {
    await upsertSiteAnalyticsSnapshot(prisma.siteAnalyticsSnapshot, snapshot);
  }

  return {
    ok: true,
    snapshots: snapshots.map((snapshot) => ({
      granularity: snapshot.granularity,
      segment: snapshot.segment,
      periodStart: snapshot.periodStart.toISOString(),
      periodEnd: snapshot.periodEnd.toISOString(),
    })),
  };
}
