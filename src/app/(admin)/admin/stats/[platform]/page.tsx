import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseRange } from "@/lib/stats/range";
import { PLATFORM_LABEL, isPlatformSlug, type PlatformSlug } from "@/lib/stats/types";
import {
  getAdminFleetPlatformStats,
  getAdminAccountGrowth,
  getAdminDemographics,
} from "@/lib/stats/admin";
import { getContentRows } from "@/lib/stats/content";
import {
  getDailyViewsSeries,
  getYtBreakdowns,
  getStoriesActivity,
  getStoryReelCorrelations,
  getAggregateRetentionCurve,
  getFbReactionsOverTime,
} from "@/lib/stats/trends";
import { KpiCard } from "@/components/admin/kpi-card";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import { Breadcrumbs } from "@/components/stats/Breadcrumbs";
import { StatsTabs } from "@/components/stats/StatsTabs";
import { DailyViewsChart } from "@/components/stats/DailyViewsChart";
import { ContentTable } from "@/components/stats/ContentTable";
import { AudienceDemographics } from "@/components/stats/AudienceDemographics";
import { AccountGrowthChart } from "@/components/stats/AccountGrowthChart";
import { DimensionalBreakdown } from "@/components/stats/DimensionalBreakdown";
import { StoryReelCorrelationTable } from "@/components/stats/StoryReelCorrelationTable";
import { StoriesActivityFeed } from "@/components/stats/StoriesActivityFeed";
import { FbReactionsChart } from "@/components/stats/FbReactionsChart";
import { RetentionCurveChart } from "@/components/stats/RetentionCurveChart";
import { metricSourceToSlug } from "@/lib/stats/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ range?: string }>;
}

async function getFleetSubmissionIdsForPlatform(slug: PlatformSlug): Promise<string[]> {
  const subs = await prisma.campaignSubmission.findMany({
    select: {
      id: true,
      sourcePlatform: true,
      metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { source: true } },
    },
  });
  const out: string[] = [];
  for (const s of subs) {
    const src = s.metricSnapshots[0]?.source;
    let inferred: PlatformSlug | null = src ? metricSourceToSlug(src) : null;
    if (!inferred && s.sourcePlatform) {
      if (s.sourcePlatform === "INSTAGRAM") inferred = "ig";
      else if (s.sourcePlatform === "TIKTOK") inferred = "tt";
      else if (s.sourcePlatform === "FACEBOOK") inferred = "fb";
    }
    if (inferred === slug) out.push(s.id);
  }
  return out;
}

export default async function AdminPlatformStatsPage({ params, searchParams }: PageProps) {
  const { platform } = await params;
  if (!isPlatformSlug(platform)) notFound();

  const sp = await searchParams;
  const range = parseRange(sp);

  const [stats, submissionIds, accountGrowth] = await Promise.all([
    getAdminFleetPlatformStats(platform, range),
    getFleetSubmissionIdsForPlatform(platform),
    getAdminAccountGrowth(platform, range),
  ]);

  const [dailySeries, contentRows, follower, engaged] = await Promise.all([
    getDailyViewsSeries(submissionIds, range),
    getContentRows({ submissionIds, range, platform, includeCreator: true }),
    getAdminDemographics(platform, "FOLLOWER"),
    platform === "ig" ? getAdminDemographics("ig", "ENGAGED") : Promise.resolve(null),
  ]);

  // Trends content
  let trendsContent: React.ReactNode = null;
  if (platform === "yt") {
    const ytConns = await prisma.creatorYtConnection.findMany({ select: { id: true } });
    const ids = ytConns.map((c) => c.id);
    const breakdowns = await getYtBreakdowns(ids, range);
    trendsContent = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DimensionalBreakdown title="Traffic source" data={breakdowns.trafficSourceBreakdown} />
        <DimensionalBreakdown title="Playback location" data={breakdowns.playbackLocationBreakdown} />
        <DimensionalBreakdown title="Device type" data={breakdowns.deviceTypeBreakdown} />
        <DimensionalBreakdown title="Content type" data={breakdowns.contentTypeBreakdown} />
        <DimensionalBreakdown title="Subscribed status" data={breakdowns.subscribedStatusBreakdown} />
      </div>
    );
  } else if (platform === "ig") {
    const igConns = await prisma.creatorIgConnection.findMany({ select: { id: true } });
    const ids = igConns.map((c) => c.id);
    const [stories, correlations] = await Promise.all([
      getStoriesActivity(ids, range),
      getStoryReelCorrelations(submissionIds),
    ]);
    trendsContent = (
      <div className="space-y-4">
        <StoriesActivityFeed rows={stories} />
        <StoryReelCorrelationTable rows={correlations} />
      </div>
    );
  } else if (platform === "fb") {
    const [reactions, retention] = await Promise.all([
      getFbReactionsOverTime(submissionIds, range),
      getAggregateRetentionCurve(submissionIds, range),
    ]);
    trendsContent = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FbReactionsChart data={reactions} />
        <RetentionCurveChart data={retention} />
      </div>
    );
  } else {
    const cadenceMap = new Map<string, number>();
    for (const r of contentRows) {
      const key = r.capturedAt.toISOString().slice(0, 10);
      cadenceMap.set(key, (cadenceMap.get(key) ?? 0) + 1);
    }
    const cadence = Array.from(cadenceMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    trendsContent = (
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
          Posting cadence (fleet)
        </p>
        {cadence.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No posts in this range.</p>
        ) : (
          <ul className="space-y-1.5">
            {cadence.map(({ date, count }) => (
              <li key={date} className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--text-secondary)", width: 100 }}>{date}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                  <div style={{ width: `${Math.min(100, count * 5)}%`, height: "100%", background: "#010101" }} />
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)", width: 50 }}>{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Tabs
  const overviewTab = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Fleet followers" value={stats.followerCount.toLocaleString()} hint="Latest snapshot" />
        <KpiCard label="Views" value={stats.windowViews.toLocaleString()} trend={stats.viewsDelta} hint={range.label} />
        <KpiCard label="Engagement" value={stats.windowEngagement.toLocaleString()} trend={stats.engagementDelta} />
        <KpiCard label="Connections" value={stats.connectionCount.toLocaleString()} hint="Across all creators" />
      </div>
      <DailyViewsChart data={dailySeries} />
      <TopCreators rows={stats.topCreators} platform={platform} />
    </div>
  );

  const contentTab = <ContentTable platform={platform} rows={contentRows} showCreator />;

  const audienceTab = (
    <div className="space-y-4">
      <AccountGrowthChart data={accountGrowth.map((p) => ({
        date: p.date,
        followers: p.followers,
        following: p.following,
        videoCount: p.videoCount,
        totalLikes: p.totalLikes,
      }))} />
      <AudienceDemographics
        follower={follower}
        engaged={engaged ?? undefined}
        showKindToggle={platform === "ig"}
      />
    </div>
  );

  return (
    <div className="w-full p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Breadcrumbs
            items={[
              { label: "Stats", href: "/admin/stats" },
              { label: PLATFORM_LABEL[platform] },
            ]}
          />
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
            {PLATFORM_LABEL[platform]} (fleet)
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {stats.connectionCount} connections · {range.label}
          </p>
        </div>
        <TimeRangeSelector value={range.key} />
      </div>

      <StatsTabs
        tabs={[
          { id: "overview", label: "Overview", content: overviewTab },
          { id: "content", label: "Content", content: contentTab },
          { id: "audience", label: "Audience", content: audienceTab },
          { id: "trends", label: "Trends", content: trendsContent },
        ]}
      />
    </div>
  );
}

function TopCreators({
  rows,
}: {
  rows: { creatorId: string; displayName: string; views: number }[];
  platform: PlatformSlug;
}) {
  if (rows.length === 0) return null;
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="px-5 py-3 text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
        Top creators on this platform
      </p>
      <ul style={{ borderTop: "1px solid var(--border)" }}>
        {rows.map((r) => (
          <li
            key={r.creatorId}
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <Link
              href={`/admin/creators/${r.creatorId}`}
              className="text-sm font-medium hover:underline"
              style={{ color: "var(--text-primary)" }}
            >
              {r.displayName}
            </Link>
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {r.views.toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                views
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
