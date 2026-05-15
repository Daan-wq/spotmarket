import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import type { SiteAnalyticsDashboard } from "@/lib/site-analytics/dashboard";
import { SiteAnalyticsTrendChart } from "./site-analytics-trend-chart";

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDate(value: Date | null) {
  if (!value) return "Never synced";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

function RangeLink({ days, active }: { days: 14 | 30; active: boolean }) {
  return (
    <Link
      href={`/admin/site-analytics${days === 30 ? "" : "?range=14d"}`}
      className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold transition ${
        active ? "bg-neutral-950 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-950"
      }`}
    >
      {days}d
    </Link>
  );
}

export function SiteAnalyticsView({
  dashboard,
  showChart = true,
}: {
  dashboard: SiteAnalyticsDashboard;
  showChart?: boolean;
}) {
  const { metrics } = dashboard;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Product analytics"
        title="Site analytics"
        description="Usage signals from PostHog snapshots, excluding admin traffic from the primary numbers."
        actions={[]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
        <p className="text-sm text-neutral-500">
          Last sync: <span className="font-medium text-neutral-800">{formatDate(dashboard.lastSyncedAt)}</span>
        </p>
        <div className="flex items-center gap-2">
          <RangeLink days={14} active={dashboard.rangeDays === 14} />
          <RangeLink days={30} active={dashboard.rangeDays === 30} />
        </div>
      </div>

      {!dashboard.hasData ? (
        <section className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8">
          <h2 className="text-lg font-semibold text-neutral-950">No site analytics yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            This page will populate after the first `/api/cron/sync-site-analytics` run and after PostHog receives
            pageviews or signup/onboarding events from the new ClipProfit project.
          </p>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Usage essentials" description={`Primary site usage over the last ${dashboard.rangeDays} days.`} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Visitors" value={formatCompact(metrics.visitors)} detail="Non-admin distinct users" />
          <StatCard label="Sessions" value={formatCompact(metrics.sessions)} detail="PostHog session ids" />
          <StatCard label="Pageviews" value={formatCompact(metrics.pageviews)} detail="Tracked route views" />
          <StatCard label="Signup conversion" value={formatPercent(metrics.signupConversionRate)} detail={`${metrics.signups} signup events`} />
          <StatCard label="Onboarding" value={formatPercent(metrics.onboardingCompletionRate)} detail={`${metrics.onboardingCompletions} completions`} />
        </div>
      </section>

      <section>
        <SectionHeader title="Timeline" description="Daily pageviews and signups from stored snapshots." />
        {showChart ? <SiteAnalyticsTrendChart data={dashboard.timeSeries} /> : null}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <SectionHeader title="Top pages" />
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {dashboard.topPages.length === 0 ? (
              <p className="p-5 text-sm text-neutral-500">No page data yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {dashboard.topPages.map((page) => (
                  <div key={page.path} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="truncate text-sm font-medium text-neutral-800">{page.path}</span>
                    <span className="text-sm font-semibold text-neutral-950">{formatCompact(page.pageviews)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="Referrers and UTMs" />
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {dashboard.referrers.length === 0 ? (
              <p className="p-5 text-sm text-neutral-500">No referrer data yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {dashboard.referrers.map((referrer) => (
                  <div key={referrer.source} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="truncate text-sm font-medium text-neutral-800">{referrer.source}</span>
                    <span className="text-sm font-semibold text-neutral-950">{formatCompact(referrer.visits)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <SectionHeader title="Signup funnel" />
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="space-y-3">
              {dashboard.funnel.map((step) => (
                <div key={step.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-800">{step.label}</span>
                    <span className="font-semibold text-neutral-950">
                      {formatCompact(step.count)} · {formatPercent(step.rate)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100">
                    <div className="h-2 rounded-full bg-neutral-950" style={{ width: `${Math.min(step.rate, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <SectionHeader title="Recent recordings" />
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {dashboard.recordings.length === 0 ? (
              <p className="p-5 text-sm text-neutral-500">No session recording links yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {dashboard.recordings.map((recording) => (
                  <a
                    key={recording.sessionId}
                    href={recording.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-neutral-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-neutral-800">{recording.path}</span>
                      <span className="block truncate text-xs text-neutral-500">{recording.sessionId}</span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
