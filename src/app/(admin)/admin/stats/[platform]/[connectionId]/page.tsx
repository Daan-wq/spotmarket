import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseRange } from "@/lib/stats/range";
import { PLATFORM_LABEL, isPlatformSlug, slugToConnectionType, type PlatformSlug } from "@/lib/stats/types";
import { getAdminConnectionStats } from "@/lib/stats/admin";
import { aggregateAudience, latestPerConnection } from "@/lib/stats/audience";
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
  params: Promise<{ platform: string; connectionId: string }>;
  searchParams: Promise<{ range?: string }>;
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

async function findSubmissionIds(platform: PlatformSlug, matchHandle: string): Promise<string[]> {
  const subs = await prisma.campaignSubmission.findMany({
    where: { OR: [{ authorHandle: matchHandle }, { authorHandle: `@${matchHandle}` }] },
    select: {
      id: true,
      sourcePlatform: true,
      metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { source: true } },
    },
  });
  const out: string[] = [];
  for (const s of subs) {
    const src = s.metricSnapshots[0]?.source;
    let inferred: PlatformSlug | null = null;
    if (src === "OAUTH_IG") inferred = "ig";
    else if (src === "OAUTH_TT") inferred = "tt";
    else if (src === "OAUTH_YT") inferred = "yt";
    else if (src === "OAUTH_FB") inferred = "fb";
    else if (s.sourcePlatform === "INSTAGRAM") inferred = "ig";
    else if (s.sourcePlatform === "TIKTOK") inferred = "tt";
    else if (s.sourcePlatform === "FACEBOOK") inferred = "fb";
    if (inferred === platform) out.push(s.id);
  }
  return out;
}

async function getAccountGrowth(slug: PlatformSlug, connectionId: string, range: ReturnType<typeof parseRange>) {
  const cap = range.start ? { gte: range.start, lte: range.end } : undefined;
  const snaps = await prisma.platformAccountSnapshot.findMany({
    where: {
      connectionType: slugToConnectionType(slug),
      connectionId,
      ...(cap ? { capturedAt: cap } : {}),
    },
    orderBy: { capturedAt: "asc" },
  });
  return snaps.map((s) => ({
    date: s.capturedAt.toISOString().slice(0, 10),
    followers: s.followerCount,
    following: s.followingCount,
    videoCount: s.videoCount,
    totalLikes: s.totalLikes ? Number(s.totalLikes) : null,
  }));
}

async function getConnectionDemographics(platform: PlatformSlug, connectionId: string, kind: "FOLLOWER" | "ENGAGED") {
  const snaps = await prisma.audienceSnapshot.findMany({
    where: { connectionType: slugToConnectionType(platform), connectionId },
    orderBy: { capturedAt: "desc" },
  });
  return aggregateAudience(latestPerConnection(snaps), kind);
}

export default async function AdminConnectionStatsPage({ params, searchParams }: PageProps) {
  const { platform, connectionId } = await params;
  if (!isPlatformSlug(platform)) notFound();

  const sp = await searchParams;
  const range = parseRange(sp);

  const meta = await getAdminConnectionStats(platform, connectionId, range);
  if (!meta) notFound();

  const matchHandle = await getMatchHandle(platform, connectionId);
  const submissionIds = matchHandle ? await findSubmissionIds(platform, matchHandle) : [];

  const [dailySeries, contentRows, accountGrowth, follower, engaged] = await Promise.all([
    getDailyViewsSeries(submissionIds, range),
    getContentRows({ submissionIds, range, platform }),
    getAccountGrowth(platform, connectionId, range),
    getConnectionDemographics(platform, connectionId, "FOLLOWER"),
    platform === "ig" ? getConnectionDemographics(platform, connectionId, "ENGAGED") : Promise.resolve(null),
  ]);

  // Trends
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
    trendsContent = (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No platform-specific trends for TikTok beyond audience and content tabs.
        </p>
      </div>
    );
  }

  const overviewTab = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Followers" value={meta.followerCount?.toLocaleString() ?? "—"} hint="Latest snapshot" />
        <KpiCard label="Posts in range" value={contentRows.length.toLocaleString()} hint={range.label} />
        <KpiCard
          label="Total views (range)"
          value={contentRows.reduce((s, r) => s + r.views, 0).toLocaleString()}
        />
        <KpiCard label="Status" value={meta.isVerified ? "Verified" : "Unverified"} tone={meta.isVerified ? "success" : "warning"} />
      </div>
      <DailyViewsChart data={dailySeries} />
    </div>
  );

  const contentTab = <ContentTable platform={platform} rows={contentRows} />;

  const audienceTab = (
    <div className="space-y-4">
      <AccountGrowthChart data={accountGrowth} />
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
              { label: PLATFORM_LABEL[platform], href: `/admin/stats/${platform}` },
              { label: meta.label },
            ]}
          />
          <h1 className="text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
            {meta.label}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Owned by{" "}
            <a href={`/admin/creators/${meta.creatorProfileId}`} className="underline" style={{ color: "var(--text-secondary)" }}>
              {meta.creatorDisplayName}
            </a>
            {meta.handle && <span> · {meta.handle}</span>}
            {meta.lastSyncedAt && <span> · Last synced {new Date(meta.lastSyncedAt).toLocaleDateString()}</span>}
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
