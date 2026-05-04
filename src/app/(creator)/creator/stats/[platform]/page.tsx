import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRange } from "@/lib/stats/range";
import { PLATFORM_LABEL, isPlatformSlug, type PlatformSlug, slugToConnectionType } from "@/lib/stats/types";
import {
  getCreatorPlatformStats,
  getCreatorDemographics,
  getAccountGrowth,
} from "@/lib/stats/creator";
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

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ range?: string }>;
}

export default async function CreatorPlatformStatsPage({ params, searchParams }: PageProps) {
  const { platform } = await params;
  if (!isPlatformSlug(platform)) notFound();

  const sp = await searchParams;
  const range = parseRange(sp);
  const { userId } = await requireAuth("creator");

  const stats = await getCreatorPlatformStats(userId, platform, range);
  if (!stats) notFound();

  // Common data
  const submissionIdsPromise = (async () => {
    // Resolve creator's submission ids on this platform via the helper that builds platform stats
    const user = await prisma.user.findUnique({ where: { supabaseId: userId }, select: { id: true } });
    if (!user) return [] as string[];
    const subs = await prisma.campaignSubmission.findMany({
      where: { creatorId: user.id },
      select: {
        id: true,
        sourcePlatform: true,
        metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { source: true } },
      },
    });
    const out: string[] = [];
    for (const s of subs) {
      const src = s.metricSnapshots[0]?.source;
      let slug: PlatformSlug | null = null;
      if (src === "OAUTH_IG") slug = "ig";
      else if (src === "OAUTH_TT") slug = "tt";
      else if (src === "OAUTH_YT") slug = "yt";
      else if (src === "OAUTH_FB") slug = "fb";
      else if (s.sourcePlatform === "INSTAGRAM") slug = "ig";
      else if (s.sourcePlatform === "TIKTOK") slug = "tt";
      else if (s.sourcePlatform === "FACEBOOK") slug = "fb";
      if (slug === platform) out.push(s.id);
    }
    return out;
  })();

  const submissionIds = await submissionIdsPromise;

  const [dailySeries, contentRows, follower, engaged, accountGrowth] = await Promise.all([
    getDailyViewsSeries(submissionIds, range),
    getContentRows({ submissionIds, range, platform }),
    getCreatorDemographics(userId, platform, "FOLLOWER"),
    platform === "ig" ? getCreatorDemographics(userId, "ig", "ENGAGED") : Promise.resolve(null),
    getAccountGrowth(userId, platform, range),
  ]);

  // Platform-specific Trends data
  let trendsContent: React.ReactNode = null;
  if (platform === "yt") {
    // Need creator's YT connection ids
    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { creatorProfile: { select: { id: true } } },
    });
    const creatorProfileId = user?.creatorProfile?.id;
    if (creatorProfileId) {
      const ytConns = await prisma.creatorYtConnection.findMany({
        where: { creatorProfileId },
        select: { id: true },
      });
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
    }
  } else if (platform === "ig") {
    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { creatorProfile: { select: { id: true } } },
    });
    const creatorProfileId = user?.creatorProfile?.id;
    if (creatorProfileId) {
      const igConns = await prisma.creatorIgConnection.findMany({
        where: { creatorProfileId },
        select: { id: true },
      });
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
    }
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
    // TT — posting cadence (count of posts per day from contentRows)
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
          Posting cadence
        </p>
        {cadence.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No posts in this range.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {cadence.map(({ date, count }) => (
              <li key={date} className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--text-secondary)", width: 100 }}>{date}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                  <div style={{ width: `${Math.min(100, count * 12)}%`, height: "100%", background: "#010101" }} />
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)", width: 50 }}>
                  {count} post{count !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Audience tab combines account growth + demographics
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
        follower={follower ?? { ageBuckets: {}, genderSplit: {}, topCountries: [], sampleCount: 0 }}
        engaged={engaged ?? undefined}
        showKindToggle={platform === "ig"}
      />
    </div>
  );

  // Overview tab: KPI cards + chart + connections list
  const overviewTab = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Followers" value={stats.followerCount.toLocaleString()} hint="Latest snapshot" />
        <KpiCard label="Views" value={stats.windowViews.toLocaleString()} trend={stats.viewsDelta} hint={range.label} />
        <KpiCard label="Engagement" value={stats.windowEngagement.toLocaleString()} trend={stats.engagementDelta} hint="Likes+comments+shares" />
        <KpiCard
          label="Top post"
          value={stats.topPost ? stats.topPost.views.toLocaleString() : "—"}
          hint={stats.topPost ? truncate(stats.topPost.title, 26) : range.label}
        />
      </div>
      <DailyViewsChart data={dailySeries} />
      <ConnectionsList platform={platform} connections={stats.connections} rangeKey={range.key} />
    </div>
  );

  const contentTab = <ContentTable platform={platform} rows={contentRows} />;

  return (
    <div className="w-full p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Breadcrumbs
            items={[
              { label: "Stats", href: "/creator/stats" },
              { label: PLATFORM_LABEL[platform] },
            ]}
          />
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
            {PLATFORM_LABEL[platform]}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {stats.connectionCount} connection{stats.connectionCount !== 1 ? "s" : ""} · {range.label}
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

function ConnectionsList({
  platform,
  connections,
  rangeKey,
}: {
  platform: PlatformSlug;
  connections: { id: string; label: string; followerCount: number | null; lastSyncedAt: Date | null }[];
  rangeKey: string;
}) {
  if (connections.length === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No {PLATFORM_LABEL[platform]} connections yet. Connect an account from the dashboard.
        </p>
      </div>
    );
  }
  const qs = rangeKey !== "30d" ? `?range=${rangeKey}` : "";
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="px-5 py-3 text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
        Connections
      </p>
      <ul style={{ borderTop: "1px solid var(--border)" }}>
        {connections.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <Link
                href={`/creator/stats/${platform}/${c.id}${qs}`}
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--text-primary)" }}
              >
                {c.label}
              </Link>
              {c.lastSyncedAt && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Last synced {new Date(c.lastSyncedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {c.followerCount?.toLocaleString() ?? "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                followers
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// silence unused import lint warning if used elsewhere
void slugToConnectionType;
