import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  fetchInstagramProfile,
  fetchRecentMedia,
  fetchAccountDailyInsights,
  fetchDemographicSnapshots,
  fetchMediaInsights,
  computeEngagementRate,
  computeDemographicStats,
  mergeDailyPostCounts,
} from "@/lib/instagram";
import type { MediaInsights } from "@/lib/instagram";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostGrid } from "./_components/post-grid";

interface PageDetailProps {
  params: Promise<{ connectionId: string }>;
}

export default async function PageDetailPage({ params }: PageDetailProps) {
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

  // Verify the connection belongs to this creator
  const conn = await prisma.creatorIgConnection.findFirst({
    where: { id: connectionId, creatorProfileId: profile.id },
  });

  if (!conn || !conn.accessToken || !conn.accessTokenIv || !conn.igUserId) {
    notFound();
  }

  // Decrypt token
  const accessToken = decrypt(conn.accessToken, conn.accessTokenIv);
  const igUserId = conn.igUserId;

  // Fetch all data in parallel
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sinceUnix = Math.floor(thirtyDaysAgo.getTime() / 1000);
  const untilUnix = Math.floor(now.getTime() / 1000);

  const [igProfile, recentMedia, dailyInsights, demographics] = await Promise.allSettled([
    fetchInstagramProfile(accessToken, igUserId),
    fetchRecentMedia(accessToken, igUserId, 100),
    fetchAccountDailyInsights(igUserId, accessToken, sinceUnix, untilUnix),
    fetchDemographicSnapshots(igUserId, accessToken),
  ]);

  const profileData = igProfile.status === "fulfilled" ? igProfile.value : null;
  const mediaData = recentMedia.status === "fulfilled" ? recentMedia.value : [];
  const insightsResult = dailyInsights.status === "fulfilled" ? dailyInsights.value : null;
  const insightsData = insightsResult ? mergeDailyPostCounts(insightsResult.daily, mediaData) : [];
  const windowTotals = insightsResult?.windowTotals ?? { views: 0, accountsEngaged: 0, totalInteractions: 0, likes: 0, comments: 0, saves: 0, shares: 0, reposts: 0, replies: 0, follows: null, unfollows: null, profileLinksTaps: null };
  const demographicData = demographics.status === "fulfilled" ? demographics.value : null;

  // Persist profile pic URL for the pages listing
  if (profileData?.profilePictureUrl && profileData.profilePictureUrl !== conn.profilePicUrl) {
    try {
      await prisma.creatorIgConnection.update({
        where: { id: conn.id },
        data: { profilePicUrl: profileData.profilePictureUrl },
      });
    } catch {
      // Non-fatal
    }
  }
  const demographicStats = computeDemographicStats(demographicData?.legacyJson ?? null);

  // P2.9: enrich engagement signal with per-media reach/views for the 10 most recent
  // posts. Capped at 10 to avoid N=100 parallel Graph calls on page load.
  const sampleMedia = mediaData.slice(0, 10);
  const perMediaInsights = await Promise.allSettled(
    sampleMedia.map((m) => {
      const type = m.media_product_type === "REELS" ? "REEL"
        : m.media_product_type === "STORY" ? "STORY"
        : "FEED";
      return fetchMediaInsights(m.id, accessToken, type);
    })
  );
  const mediaInsightsForEngagement: MediaInsights[] = sampleMedia.map((m, i) => {
    const settled = perMediaInsights[i];
    const r = settled.status === "fulfilled" ? settled.value : null;
    return {
      mediaId: m.id,
      impressions: 0,
      reach: r?.reach ?? 0,
      videoViews: r?.views ?? 0,
      likeCount: r?.likes ?? m.like_count,
      commentCount: r?.comments ?? m.comments_count,
    };
  });
  const engagementRate = computeEngagementRate(
    mediaInsightsForEngagement,
    profileData?.followersCount ?? conn.followerCount ?? 0
  );

  const totalReach = insightsData.reduce((s, d) => s + (d.reach ?? 0), 0);
  const totalViews = windowTotals.views;
  const totalInteractions = windowTotals.totalInteractions;

  // Get active campaign applications for this creator to enable "Submit Post" links
  const activeApplications = await prisma.campaignApplication.findMany({
    where: {
      creatorProfileId: profile.id,
      status: { in: ["pending", "approved", "active"] },
      campaign: { status: "active" },
    },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb + Header */}
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
      {profileData && (
        <div
          className="rounded-lg p-6 border flex flex-col md:flex-row items-start md:items-center gap-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-4 flex-1">
            {profileData.profilePictureUrl ? (
              <img
                src={profileData.profilePictureUrl}
                alt={profileData.username}
                width={72}
                height={72}
                className="rounded-full shrink-0"
              />
            ) : (
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                {conn.igUsername[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                @{profileData.username}
              </h1>
              {profileData.name && (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{profileData.name}</p>
              )}
              {profileData.biography && (
                <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {profileData.biography}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-6 text-center shrink-0">
            <Stat label="Followers" value={profileData.followersCount.toLocaleString()} />
            <Stat label="Following" value={profileData.followsCount.toLocaleString()} />
            <Stat label="Posts" value={profileData.mediaCount.toLocaleString()} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="30d Reach" value={totalReach.toLocaleString()} color="#6366F1" />
        <MetricCard label="30d Views" value={totalViews.toLocaleString()} color="#8B5CF6" />
        <MetricCard label="30d Interactions" value={totalInteractions.toLocaleString()} color="#EC4899" />
        <MetricCard label="Engagement" value={`${engagementRate}%`} color="#14b8a6" />
      </div>

      {/* Submit Post to Campaign */}
      {activeApplications.length > 0 && (
        <div
          className="rounded-lg p-5 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Submit a Post to Campaign
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeApplications.map((app) => (
              <Link
                key={app.id}
                href={`/creator/applications/${app.id}/submit`}
                className="text-xs px-3 py-2 rounded-lg font-medium border transition-all hover:shadow-sm"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {app.campaign.name}
              </Link>
            ))}
          </div>
        </div>
      )}

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

          {demographicStats.topCountry && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Top Country</div>
              <div className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                {demographicStats.topCountry} ({demographicStats.topCountryPercent}%)
              </div>
            </div>
          )}

          {demographicStats.malePercent !== null && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Gender</div>
              <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                <div className="rounded-full" style={{ width: `${demographicStats.malePercent}%`, background: "#6366F1" }} />
                <div className="rounded-full flex-1" style={{ background: "#EC4899" }} />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                <span>Male {demographicStats.malePercent}%</span>
                <span>Female {(100 - demographicStats.malePercent).toFixed(1)}%</span>
              </div>
            </div>
          )}

          {demographicData?.legacyJson?.ages && (
            <div>
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Age</div>
              <div className="space-y-1">
                {Object.entries(demographicData.legacyJson.ages)
                  .filter(([, v]) => v > 0)
                  .map(([age, count]) => {
                    const total = Object.values(demographicData.legacyJson.ages).reduce((s, v) => s + (v ?? 0), 0);
                    const pct = total > 0 ? ((count ?? 0) / total * 100) : 0;
                    return (
                      <div key={age} className="flex items-center gap-2">
                        <span className="text-xs w-10 text-right" style={{ color: "var(--text-secondary)" }}>{age}</span>
                        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#6366F1" }} />
                        </div>
                        <span className="text-xs w-8" style={{ color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {!demographicData && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Demographics require 100+ followers.
            </p>
          )}
        </div>

        {/* Daily Insights */}
        <div
          className="rounded-lg p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Daily Insights
          </h3>
          {insightsData.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--text-secondary)" }} className="border-b">
                    <th className="text-left py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Date</th>
                    <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Reach</th>
                    <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Followers</th>
                    <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Reels</th>
                    <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Carousels</th>
                    <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Stories</th>
                    <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Images</th>
                  </tr>
                </thead>
                <tbody>
                  {insightsData.slice().reverse().map((day) => {
                    const totalPosts = day.reelsPosted + day.carouselsPosted + day.storiesPosted + day.imagesPosted;
                    return (
                      <tr key={day.date} className="border-b" style={{ borderColor: "var(--border)" }}>
                        <td className="py-1.5 px-1 text-xs" style={{ color: "var(--text-primary)" }}>
                          {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                          {(day.reach ?? 0).toLocaleString()}
                        </td>
                        <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                          {(day.followerCount ?? 0).toLocaleString()}
                        </td>
                        <td className="py-1.5 px-1 text-right text-xs" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {day.reelsPosted || "–"}
                        </td>
                        <td className="py-1.5 px-1 text-right text-xs" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {day.carouselsPosted || "–"}
                        </td>
                        <td className="py-1.5 px-1 text-right text-xs" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {day.storiesPosted || "–"}
                        </td>
                        <td className="py-1.5 px-1 text-right text-xs" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {day.imagesPosted || "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No insights data available yet.
            </p>
          )}
        </div>
      </div>

      {/* Recent Posts Grid */}
      <div
        className="rounded-lg p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Posts
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {mediaData.length} posts
          </span>
        </div>
        <PostGrid media={mediaData} activeApplications={activeApplications.map(a => ({ id: a.id, campaign: { id: a.campaign.id, name: a.campaign.name } }))} />
      </div>

      {/* Footer info */}
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        @{conn.igUsername}
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
