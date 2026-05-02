import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchTikTokProfile, fetchTikTokVideos, computeTikTokDailyInsights } from "@/lib/tiktok";
import { getFreshTikTokAccessToken } from "@/lib/token-refresh";
import { VideoGrid } from "@/components/shared/VideoGrid";
import Link from "next/link";
import { notFound } from "next/navigation";
import DailyInsightsCard from "@/components/insights/DailyInsightsCard";

const TT_DAILY_INSIGHTS_METRICS = [
  { key: "views", label: "Views", color: "#6366F1" },
  { key: "likes", label: "Likes", color: "#EF4444" },
  { key: "comments", label: "Comments", color: "#F59E0B" },
  { key: "shares", label: "Shares", color: "#10B981" },
  { key: "videosPosted", label: "Posts", color: "#8B5CF6" },
];

interface PageDetailProps {
  params: Promise<{ connectionId: string }>;
}

export default async function TikTokPageDetailPage({ params }: PageDetailProps) {
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

  const conn = await prisma.creatorTikTokConnection.findFirst({
    where: { id: connectionId, creatorProfileId: profile.id },
  });

  if (!conn || !conn.accessToken || !conn.accessTokenIv) notFound();

  const accessToken = await getFreshTikTokAccessToken(conn);
  if (!accessToken) notFound();

  const [profileResult, videosResult] = await Promise.allSettled([
    fetchTikTokProfile(accessToken),
    fetchTikTokVideos(accessToken, 20),
  ]);

  const ttProfile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const videos = videosResult.status === "fulfilled" ? videosResult.value.videos : [];

  // Demographics auto-pull replaces the prior screenshot review flow.
  // The latest AudienceSnapshot for this connection is rendered below;
  // populated by the `poll-demographics` cron via TikTok Business API
  // (gated on TIKTOK_BUSINESS_API approval).
  const latestAudience = await prisma.audienceSnapshot.findFirst({
    where: { connectionType: "TT", connectionId: conn.id },
    orderBy: { capturedAt: "desc" },
  });
  const audienceAges =
    latestAudience && typeof latestAudience.ageBuckets === "object" && latestAudience.ageBuckets !== null
      ? (latestAudience.ageBuckets as Record<string, number>)
      : {};
  const audienceGenders =
    latestAudience && typeof latestAudience.genderSplit === "object" && latestAudience.genderSplit !== null
      ? (latestAudience.genderSplit as { male?: number; female?: number; other?: number })
      : {};
  const audienceCountries: { code: string; share: number }[] =
    latestAudience && Array.isArray(latestAudience.topCountries)
      ? (latestAudience.topCountries as { code: string; share: number }[])
      : [];

  const activeApplications = await prisma.campaignApplication.findMany({
    where: {
      creatorProfileId: profile.id,
      status: { in: ["pending", "approved", "active"] },
      campaign: { status: "active" },
    },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  // Persist updated profile data
  if (ttProfile) {
    try {
      await prisma.creatorTikTokConnection.update({
        where: { id: conn.id },
        data: {
          displayName: ttProfile.displayName,
          username: ttProfile.username,
          profilePicUrl: ttProfile.avatarUrl ?? undefined,
          followerCount: ttProfile.followerCount ?? undefined,
        },
      });
    } catch {
      // Non-fatal
    }
  }

  const displayName = ttProfile?.displayName ?? conn.displayName ?? conn.username;
  const username = ttProfile?.username ?? conn.username;
  const avatarUrl = ttProfile?.avatarUrl ?? conn.profilePicUrl;
  const followerCount = ttProfile?.followerCount ?? conn.followerCount;
  const followingCount = ttProfile?.followingCount ?? null;
  const likesCount = ttProfile?.likesCount ?? null;
  const videoCount = ttProfile?.videoCount ?? null;

  const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
  const engagementRate =
    followerCount && followerCount > 0 && videos.length > 0
      ? ((totalLikes + videos.reduce((s, v) => s + v.commentCount, 0)) / videos.length / followerCount * 100).toFixed(2)
      : "0.00";

  const dailyInsights = computeTikTokDailyInsights(videos, 30);

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
      <div
        className="rounded-lg p-6 border flex flex-col md:flex-row items-start md:items-center gap-6"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4 flex-1">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              width={72}
              height={72}
              className="rounded-full shrink-0 object-cover"
            />
          ) : (
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
              style={{ background: "#010101", color: "#fff" }}
            >
              {displayName[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {displayName}
              </h1>
            </div>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>@{username}</p>
          </div>
        </div>
        <div className="flex gap-6 text-center shrink-0">
          <Stat label="Followers" value={followerCount != null ? followerCount.toLocaleString() : "—"} />
          <Stat label="Following" value={followingCount != null ? followingCount.toLocaleString() : "—"} />
          <Stat label="Videos" value={videoCount != null ? videoCount.toLocaleString() : "—"} />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Likes" value={likesCount != null ? formatCount(likesCount) : "—"} color="#010101" />
        <MetricCard label="Recent Views" value={formatCount(totalViews)} color="#8B5CF6" />
        <MetricCard label="Recent Likes" value={formatCount(totalLikes)} color="#EC4899" />
        <MetricCard label="Avg. Engagement" value={`${engagementRate}%`} color="#14b8a6" />
      </div>

      {/* Demographics + Daily Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audience Demographics */}
        <div
          className="rounded-lg p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Audience
            </h3>
            {latestAudience && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase"
                style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>
                AUTO-PULL
              </span>
            )}
          </div>

          {latestAudience && audienceCountries.length > 0 ? (
            <>
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Top Countries</div>
                <div className="space-y-1">
                  {audienceCountries.slice(0, 5).map((c) => (
                    <div key={c.code} className="flex items-center gap-2">
                      <span className="text-xs w-10" style={{ color: "var(--text-secondary)" }}>{c.code}</span>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round(c.share * 100)}%`, background: "#14b8a6" }} />
                      </div>
                      <span className="text-xs w-10 text-right" style={{ color: "var(--text-muted)" }}>{Math.round(c.share * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Gender</div>
                <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>Male {Math.round((audienceGenders.male ?? 0) * 100)}%</span>
                  <span>Female {Math.round((audienceGenders.female ?? 0) * 100)}%</span>
                  {audienceGenders.other ? <span>Other {Math.round(audienceGenders.other * 100)}%</span> : null}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Age</div>
                <div className="space-y-1">
                  {Object.entries(audienceAges)
                    .filter(([, pct]) => pct > 0)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([age, pct]) => (
                      <div key={age} className="flex items-center gap-2">
                        <span className="text-xs w-14 text-right" style={{ color: "var(--text-secondary)" }}>{age}</span>
                        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.round(pct * 100)}%`, background: "#6366F1" }} />
                        </div>
                        <span className="text-xs w-8" style={{ color: "var(--text-muted)" }}>{Math.round(pct * 100)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Audience demographics will appear here automatically once TikTok Business API
              data is available for this account.
            </p>
          )}
        </div>

        {/* Daily Insights */}
        <DailyInsightsCard
          data={dailyInsights}
          metrics={TT_DAILY_INSIGHTS_METRICS}
          isEmpty={dailyInsights.length === 0}
          emptyMessage="No insights data available yet."
        >
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-secondary)" }} className="border-b">
                  <th className="text-left py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Date</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Posts</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Views</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Likes</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Comments</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Shares</th>
                </tr>
              </thead>
              <tbody>
                {dailyInsights.slice().reverse().map((day) => (
                  <tr key={day.date} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-1.5 px-1 text-xs" style={{ color: "var(--text-primary)" }}>
                      {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: day.videosPosted > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {day.videosPosted || "–"}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {day.views.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {day.likes.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {day.comments.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {day.shares.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DailyInsightsCard>
      </div>

      {/* Recent Videos Grid */}
      <div
        className="rounded-lg p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Videos
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {videos.length} videos
          </span>
        </div>

        <VideoGrid
          videos={videos.map((v) => ({
            id: v.id,
            title: v.title,
            thumbnailUrl: v.coverImageUrl,
            shareUrl: v.shareUrl,
            viewCount: v.viewCount,
            likeCount: v.likeCount,
            commentCount: v.commentCount,
          }))}
          platform="tiktok"
          username={username}
          activeApplications={activeApplications.map((a) => ({ id: a.id, campaign: { id: a.campaign.id, name: a.campaign.name } }))}
        />
      </div>

      {/* Footer */}
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        @{username}
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

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}
