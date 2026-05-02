import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchChannelProfile,
  fetchRecentShorts,
  fetchChannelAnalytics,
  fetchVideoDemographics,
  formatWatchTime,
} from "@/lib/youtube";
import { getFreshYoutubeAccessToken } from "@/lib/token-refresh";
import { VideoGrid } from "@/components/shared/VideoGrid";
import Link from "next/link";
import { notFound } from "next/navigation";
import DailyInsightsCard from "@/components/insights/DailyInsightsCard";

const YT_DAILY_INSIGHTS_METRICS = [
  { key: "views", label: "Views", color: "#6366F1" },
  { key: "estimatedMinutesWatched", label: "Watch (min)", color: "#10B981" },
  { key: "subscribersNet", label: "Subs net", color: "#8B5CF6" },
  { key: "likes", label: "Likes", color: "#EF4444" },
];

interface PageDetailProps {
  params: Promise<{ connectionId: string }>;
}

export default async function YtPageDetailPage({ params }: PageDetailProps) {
  const { connectionId } = await params;
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Creator profile not found");

  const conn = await prisma.creatorYtConnection.findFirst({
    where: { id: connectionId, creatorProfileId: profile.id },
  });

  if (!conn || !conn.accessToken || !conn.accessTokenIv) {
    notFound();
  }

  const accessToken = await getFreshYoutubeAccessToken(conn);
  if (!accessToken) notFound();

  // Date range: last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const endDate = now.toISOString().slice(0, 10);

  const [channelResult, shortsResult, analyticsResult, demographicsResult] =
    await Promise.allSettled([
      fetchChannelProfile(accessToken),
      fetchRecentShorts(accessToken, conn.channelId, 50),
      fetchChannelAnalytics(accessToken, conn.channelId, startDate, endDate),
      fetchVideoDemographics(accessToken, conn.channelId, startDate, endDate),
    ]);

  const activeApplications = await prisma.campaignApplication.findMany({
    where: {
      creatorProfileId: profile.id,
      status: { in: ["pending", "approved", "active"] },
      campaign: { status: "active" },
    },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const channel = channelResult.status === "fulfilled" ? channelResult.value : null;
  const shorts = shortsResult.status === "fulfilled" ? shortsResult.value : [];
  const analytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : null;
  const demographics = demographicsResult.status === "fulfilled" ? demographicsResult.value : null;

  // Persist profile pic if changed
  if (channel?.profilePictureUrl && channel.profilePictureUrl !== conn.profilePicUrl) {
    try {
      await prisma.creatorYtConnection.update({
        where: { id: conn.id },
        data: {
          profilePicUrl: channel.profilePictureUrl,
          subscriberCount: channel.subscriberCount,
          videoCount: channel.videoCount,
        },
      });
    } catch {
      // Non-fatal
    }
  }

  const totals = analytics?.totals ?? {
    views: 0,
    estimatedMinutesWatched: 0,
    subscribersGained: 0,
    subscribersLost: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  };

  // Engagement rate from Analytics totals — (likes + comments + shares) / views * 100.
  // Matches the metric cards' 30d window; falls back to 0 when there are no views.
  const engagementRate =
    totals.views > 0
      ? (((totals.likes + totals.comments + totals.shares) / totals.views) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/creator/pages"
          className="text-sm inline-flex items-center gap-1 mb-3 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Pages
        </Link>
      </div>

      {/* Profile Card */}
      {channel && (
        <div
          className="rounded-lg p-6 border flex flex-col md:flex-row items-start md:items-center gap-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-4 flex-1">
            {channel.profilePictureUrl ? (
              <img
                src={channel.profilePictureUrl}
                alt={channel.channelName}
                width={72}
                height={72}
                className="rounded-full shrink-0"
              />
            ) : (
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                style={{ background: "#FF0000", color: "#fff" }}
              >
                {conn.channelName[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {channel.channelName}
              </h1>
              {channel.description && (
                <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {channel.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-6 text-center shrink-0">
            <Stat label="Subscribers" value={channel.subscriberCount.toLocaleString()} />
            <Stat label="Videos" value={channel.videoCount.toLocaleString()} />
            <Stat label="Total Views" value={formatViewCount(channel.viewCount)} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="30d Views" value={totals.views.toLocaleString()} color="#FF0000" />
        <MetricCard label="30d Watch Time" value={formatWatchTime(totals.estimatedMinutesWatched)} color="#8B5CF6" />
        <MetricCard
          label="30d Subscribers"
          value={`+${(totals.subscribersGained - totals.subscribersLost).toLocaleString()}`}
          color="#14b8a6"
        />
        <MetricCard label="Engagement" value={`${engagementRate}%`} color="#6366F1" />
      </div>

      {/* Demographics + Daily Insights side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audience Demographics */}
        <div
          className="rounded-lg p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Audience
          </h3>

          {demographics && Object.keys(demographics.countries).length > 0 ? (
            <>
              {/* Top Countries */}
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Top Countries</div>
                <div className="space-y-1">
                  {Object.entries(demographics.countries)
                    .slice(0, 5)
                    .map(([country, pct]) => (
                      <div key={country} className="flex items-center gap-2">
                        <span className="text-xs w-8" style={{ color: "var(--text-secondary)" }}>{country}</span>
                        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#FF0000" }} />
                        </div>
                        <span className="text-xs w-8" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Gender */}
              {demographics.genders.male !== undefined && (
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Gender</div>
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    <div className="rounded-full" style={{ width: `${demographics.genders.male}%`, background: "#6366F1" }} />
                    <div className="rounded-full flex-1" style={{ background: "#EC4899" }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    <span>Male {demographics.genders.male}%</span>
                    <span>Female {demographics.genders.female ?? 0}%</span>
                  </div>
                </div>
              )}

              {/* Age Groups */}
              {Object.keys(demographics.ages).length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Age</div>
                  <div className="space-y-1">
                    {Object.entries(demographics.ages)
                      .filter(([, v]) => v && v > 0)
                      .map(([age, pct]) => (
                        <div key={age} className="flex items-center gap-2">
                          <span className="text-xs w-14 text-right" style={{ color: "var(--text-secondary)" }}>
                            {age.replace("age", "")}
                          </span>
                          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#6366F1" }} />
                          </div>
                          <span className="text-xs w-8" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Demographics data not yet available.
            </p>
          )}
        </div>

        {/* Daily Insights */}
        <DailyInsightsCard
          data={(analytics?.daily ?? []).map((d) => ({
            ...d,
            subscribersNet: d.subscribersGained - d.subscribersLost,
          }))}
          metrics={YT_DAILY_INSIGHTS_METRICS}
          isEmpty={!analytics || analytics.daily.length === 0}
          emptyMessage="No insights data available yet."
        >
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-secondary)" }} className="border-b">
                  <th className="text-left py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Date</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Views</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Watch (min)</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Subs +/-</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Likes</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.daily ?? []).slice().reverse().map((day) => (
                  <tr key={day.date} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-1.5 px-1 text-xs" style={{ color: "var(--text-primary)" }}>
                      {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {day.views.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {Math.round(day.estimatedMinutesWatched).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: day.subscribersGained - day.subscribersLost > 0 ? "#16a34a" : "var(--text-muted)" }}>
                      {day.subscribersGained - day.subscribersLost > 0 ? "+" : ""}
                      {day.subscribersGained - day.subscribersLost}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {day.likes.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DailyInsightsCard>
      </div>

      {/* Recent Shorts Grid */}
      <div
        className="rounded-lg p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Shorts
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {shorts.length} shorts
          </span>
        </div>
        <VideoGrid
          videos={shorts.map((s) => ({
            id: s.id,
            title: s.title,
            thumbnailUrl: s.thumbnailUrl,
            shareUrl: `https://www.youtube.com/shorts/${s.id}`,
            viewCount: s.viewCount,
            likeCount: s.likeCount,
          }))}
          platform="youtube"
          activeApplications={activeApplications.map((a) => ({ id: a.id, campaign: { id: a.campaign.id, name: a.campaign.name } }))}
        />
      </div>

      {/* Footer */}
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {conn.channelName}
        {conn.tokenExpiresAt && (
          <> &middot; Token expires {new Date(conn.tokenExpiresAt).toLocaleDateString()}</>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg p-5 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}
