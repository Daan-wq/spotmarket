import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRange } from "@/lib/stats/range";
import { PLATFORM_LABEL, isPlatformSlug, type PlatformSlug } from "@/lib/stats/types";
import {
  getCreatorConnectionStats,
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
import { aggregateAudience, latestPerConnection } from "@/lib/stats/audience";
import { slugToConnectionType } from "@/lib/stats/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ platform: string; connectionId: string }>;
  searchParams: Promise<{ range?: string }>;
}

export default async function CreatorConnectionStatsPage({ params, searchParams }: PageProps) {
  const { platform, connectionId } = await params;
  if (!isPlatformSlug(platform)) notFound();

  const sp = await searchParams;
  const range = parseRange(sp);
  const { userId } = await requireAuth("creator");

  const stats = await getCreatorConnectionStats(userId, platform, connectionId, range);
  if (!stats) notFound();

  // Submission ids strictly for this connection: re-derive from authorHandle match
  const user = await prisma.user.findUnique({ where: { supabaseId: userId }, select: { id: true } });
  if (!user) notFound();

  const matchHandle = await getMatchHandle(platform, connectionId);
  const submissionIds = matchHandle
    ? await findSubmissionIdsByHandle(user.id, platform, matchHandle)
    : [];

  const [dailySeries, contentRows, accountGrowth, audienceFollower, audienceEngaged] = await Promise.all([
    getDailyViewsSeries(submissionIds, range),
    getContentRows({ submissionIds, range, platform }),
    getAccountGrowth(userId, platform, range, connectionId),
    getConnectionDemographics(platform, connectionId, "FOLLOWER"),
    platform === "ig" ? getConnectionDemographics(platform, connectionId, "ENGAGED") : Promise.resolve(null),
  ]);

  // Trends content per platform
  let trendsContent: React.ReactNode = null;
  if (platform === "yt") {
    const breakdowns = await getYtBreakdowns([connectionId], range);
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
    const [stories, correlations] = await Promise.all([
      getStoriesActivity([connectionId], range),
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
          Posting cadence
        </p>
        {cadence.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No posts in this range.</p>
        ) : (
          <ul className="space-y-1.5">
            {cadence.map(({ date, count }) => (
              <li key={date} className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--text-secondary)", width: 100 }}>{date}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                  <div style={{ width: `${Math.min(100, count * 12)}%`, height: "100%", background: "#010101" }} />
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)", width: 50 }}>
                  {count}
                </span>
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
        <KpiCard label="Followers" value={stats.followerCount?.toLocaleString() ?? "—"} hint="Latest snapshot" />
        <KpiCard label="Views" value={stats.windowViews.toLocaleString()} hint={range.label} />
        <KpiCard label="Engagement" value={stats.windowEngagement.toLocaleString()} hint="Likes+comments+shares" />
        <KpiCard
          label="Top post"
          value={stats.topPost ? stats.topPost.views.toLocaleString() : "—"}
          hint={stats.topPost ? truncate(stats.topPost.title, 24) : range.label}
        />
      </div>
      <DailyViewsChart data={dailySeries} />
    </div>
  );

  const contentTab = <ContentTable platform={platform} rows={contentRows} />;

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
        follower={audienceFollower ?? { ageBuckets: {}, genderSplit: {}, topCountries: [], sampleCount: 0 }}
        engaged={audienceEngaged ?? undefined}
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
              { label: "Stats", href: "/creator/stats" },
              { label: PLATFORM_LABEL[platform], href: `/creator/stats/${platform}` },
              { label: stats.label },
            ]}
          />
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
            {stats.label}
          </h1>
          <div className="text-sm mt-1 flex items-center gap-2 flex-wrap" style={{ color: "var(--text-secondary)" }}>
            {stats.handle && <span>{stats.handle}</span>}
            {stats.isVerified && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
                style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
              >
                Verified
              </span>
            )}
            {stats.lastSyncedAt && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                · Last synced {new Date(stats.lastSyncedAt).toLocaleDateString()}
              </span>
            )}
          </div>
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

async function getMatchHandle(platform: PlatformSlug, connectionId: string): Promise<string | null> {
  if (platform === "ig") {
    const c = await prisma.creatorIgConnection.findUnique({ where: { id: connectionId }, select: { igUsername: true } });
    return c?.igUsername ?? null;
  }
  if (platform === "tt") {
    const c = await prisma.creatorTikTokConnection.findUnique({ where: { id: connectionId }, select: { username: true } });
    return c?.username ?? null;
  }
  if (platform === "yt") {
    const c = await prisma.creatorYtConnection.findUnique({ where: { id: connectionId }, select: { channelName: true } });
    return c?.channelName ?? null;
  }
  const c = await prisma.creatorFbConnection.findUnique({ where: { id: connectionId }, select: { pageHandle: true, pageName: true } });
  return c?.pageHandle ?? c?.pageName ?? null;
}

async function findSubmissionIdsByHandle(userId: string, platform: PlatformSlug, matchHandle: string): Promise<string[]> {
  const subs = await prisma.campaignSubmission.findMany({
    where: {
      creatorId: userId,
      OR: [{ authorHandle: matchHandle }, { authorHandle: `@${matchHandle}` }],
    },
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
}

async function getConnectionDemographics(platform: PlatformSlug, connectionId: string, kind: "FOLLOWER" | "ENGAGED") {
  const snaps = await prisma.audienceSnapshot.findMany({
    where: { connectionType: slugToConnectionType(platform), connectionId },
    orderBy: { capturedAt: "desc" },
  });
  const latest = latestPerConnection(snaps);
  return aggregateAudience(latest, kind);
}

void getCreatorDemographics; // suppress unused import lint

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
