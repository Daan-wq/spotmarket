import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  fetchInstagramProfile,
  fetchRecentMedia,
  fetchAccountDailyInsights,
  fetchDemographicSnapshots,
  computeEngagementRate,
  computeDemographicStats,
  mergeDailyPostCounts,
} from "@/lib/instagram";
import type { IgMediaItem } from "@/types/instagram";
import Link from "next/link";

export default async function InstagramPage() {
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

  // Find connected Instagram account with OAuth token
  const igConnection = await prisma.creatorIgConnection.findFirst({
    where: {
      creatorProfileId: profile.id,
      isVerified: true,
      accessToken: { not: null },
      igUserId: { not: null },
    },
  });

  // Not connected — show connect prompt
  if (!igConnection?.accessToken || !igConnection.accessTokenIv || !igConnection.igUserId) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Instagram Analytics
        </h1>
        <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
          Connect your Instagram account to view analytics and insights.
        </p>
        <div
          className="rounded-lg p-8 border text-center"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" style={{ color: "var(--text-muted)" }}>
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            No Instagram account connected
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Connect your Instagram to unlock real-time analytics, audience demographics, and content performance data.
          </p>
          <a
            href="/api/auth/instagram"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            Connect Instagram Account
          </a>
        </div>
      </div>
    );
  }

  // Decrypt token and fetch data
  const accessToken = decrypt(igConnection.accessToken, igConnection.accessTokenIv);
  const igUserId = igConnection.igUserId;

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
  const mediaData = igProfile.status === "fulfilled" && recentMedia.status === "fulfilled" ? recentMedia.value : [];
  const insightsResult = dailyInsights.status === "fulfilled" ? dailyInsights.value : null;
  const insightsData = insightsResult ? mergeDailyPostCounts(insightsResult.daily, mediaData) : [];
  const windowTotals = insightsResult?.windowTotals ?? { views: 0, accountsEngaged: 0, totalInteractions: 0, likes: 0, comments: 0, saves: 0, shares: 0, reposts: 0, replies: 0, follows: null, unfollows: null, profileLinksTaps: null };
  const demographicData = demographics.status === "fulfilled" ? demographics.value : null;
  const demographicStats = computeDemographicStats(demographicData?.legacyJson ?? null);

  // Compute engagement from media
  const mediaInsightsForEngagement = mediaData.map((m) => ({
    mediaId: m.id,
    impressions: 0,
    reach: 0,
    videoViews: 0,
    likeCount: m.like_count,
    commentCount: m.comments_count,
  }));
  const engagementRate = computeEngagementRate(
    mediaInsightsForEngagement,
    profileData?.followersCount ?? igConnection.followerCount ?? 0
  );

  // Aggregate insights
  const totalReach = insightsData.reduce((s, d) => s + (d.reach ?? 0), 0);
  const totalViews = windowTotals.views;
  const totalInteractions = windowTotals.totalInteractions;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Instagram Analytics
        </h1>
        <Link
          href="/creator/verify"
          className="text-sm px-4 py-2 rounded-lg border transition-colors"
          style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
        >
          Manage Connection
        </Link>
      </div>

      {/* Profile Card */}
      {profileData && (
        <div
          className="rounded-lg p-6 border flex items-center gap-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {profileData.profilePictureUrl && (
            <img
              src={profileData.profilePictureUrl}
              alt={profileData.username}
              width={80}
              height={80}
              className="rounded-full"
            />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              @{profileData.username}
            </h2>
            {profileData.name && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{profileData.name}</p>
            )}
            {profileData.biography && (
              <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                {profileData.biography}
              </p>
            )}
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {profileData.followersCount.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Followers</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {profileData.followsCount.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Following</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {profileData.mediaCount.toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Posts</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="30d Reach" value={totalReach.toLocaleString()} color="#6366F1" />
        <StatCard label="30d Views" value={totalViews.toLocaleString()} color="#8B5CF6" />
        <StatCard label="30d Interactions" value={totalInteractions.toLocaleString()} color="#EC4899" />
        <StatCard label="Engagement Rate" value={`${engagementRate}%`} color="#14b8a6" />
      </div>

      {/* Demographics + Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audience Demographics */}
        <div
          className="rounded-lg p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Audience Demographics
          </h3>

          {/* Top Country */}
          {demographicStats.topCountry && (
            <div className="mb-4">
              <div className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Top Country</div>
              <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {demographicStats.topCountry} ({demographicStats.topCountryPercent}%)
              </div>
            </div>
          )}

          {/* Gender Split */}
          {demographicStats.malePercent !== null && (
            <div className="mb-4">
              <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Gender</div>
              <div className="flex gap-2 h-4 rounded-full overflow-hidden">
                <div
                  className="rounded-full"
                  style={{ width: `${demographicStats.malePercent}%`, background: "#6366F1" }}
                  title={`Male: ${demographicStats.malePercent}%`}
                />
                <div
                  className="rounded-full flex-1"
                  style={{ background: "#EC4899" }}
                  title={`Female: ${(100 - demographicStats.malePercent).toFixed(1)}%`}
                />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                <span>Male {demographicStats.malePercent}%</span>
                <span>Female {(100 - demographicStats.malePercent).toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Age Distribution */}
          {demographicData?.legacyJson?.ages && (
            <div>
              <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Age Distribution</div>
              <div className="space-y-1.5">
                {Object.entries(demographicData.legacyJson.ages)
                  .filter(([, v]) => v > 0)
                  .map(([age, count]) => {
                    const total = Object.values(demographicData.legacyJson.ages).reduce((s, v) => s + (v ?? 0), 0);
                    const pct = total > 0 ? ((count ?? 0) / total * 100) : 0;
                    return (
                      <div key={age} className="flex items-center gap-3">
                        <span className="text-xs w-12 text-right" style={{ color: "var(--text-secondary)" }}>{age}</span>
                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#6366F1" }} />
                        </div>
                        <span className="text-xs w-10" style={{ color: "var(--text-secondary)" }}>{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
              </div>
              {demographicStats.age18PlusPercent !== null && (
                <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {demographicStats.age18PlusPercent}% of audience is 18+
                </div>
              )}
            </div>
          )}

          {!demographicData && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Demographics require 100+ followers. Data may take up to 24h to appear.
            </p>
          )}
        </div>

        {/* Daily Insights Table */}
        <div
          className="rounded-lg p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Daily Insights (Last 30 Days)
          </h3>
          {insightsData.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--text-secondary)" }} className="border-b" >
                    <th className="text-left py-2 px-2 sticky top-0" style={{ background: "var(--bg-card)" }}>Date</th>
                    <th className="text-right py-2 px-2 sticky top-0" style={{ background: "var(--bg-card)" }}>Reach</th>
                    <th className="text-right py-2 px-2 sticky top-0" style={{ background: "var(--bg-card)" }}>Followers</th>
                    <th className="text-right py-2 px-2 sticky top-0" style={{ background: "var(--bg-card)" }}>Reels</th>
                    <th className="text-right py-2 px-2 sticky top-0" style={{ background: "var(--bg-card)" }}>Carousels</th>
                    <th className="text-right py-2 px-2 sticky top-0" style={{ background: "var(--bg-card)" }}>Stories</th>
                    <th className="text-right py-2 px-2 sticky top-0" style={{ background: "var(--bg-card)" }}>Images</th>
                  </tr>
                </thead>
                <tbody>
                  {insightsData.slice().reverse().map((day) => {
                    const totalPosts = day.reelsPosted + day.carouselsPosted + day.storiesPosted + day.imagesPosted;
                    return (
                      <tr key={day.date} className="border-b" style={{ borderColor: "var(--border)" }}>
                        <td className="py-2 px-2" style={{ color: "var(--text-primary)" }}>
                          {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-2 px-2 text-right" style={{ color: "var(--text-secondary)" }}>
                          {(day.reach ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right" style={{ color: "var(--text-secondary)" }}>
                          {(day.followerCount ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {day.reelsPosted || "–"}
                        </td>
                        <td className="py-2 px-2 text-right" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {day.carouselsPosted || "–"}
                        </td>
                        <td className="py-2 px-2 text-right" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {day.storiesPosted || "–"}
                        </td>
                        <td className="py-2 px-2 text-right" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
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
              No daily insights data available yet. Data may take up to 24h after connecting.
            </p>
          )}
        </div>
      </div>

      {/* Recent Media Grid */}
      <div
        className="rounded-lg p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Recent Posts
        </h3>
        {mediaData.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaData.map((item: IgMediaItem) => (
              <a
                key={item.id}
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-lg overflow-hidden border transition-all hover:shadow-lg"
                style={{ borderColor: "var(--border)", aspectRatio: "1" }}
              >
                {(item.thumbnail_url || item.media_url) ? (
                  <img
                    src={item.thumbnail_url ?? item.media_url ?? ""}
                    alt={item.caption?.slice(0, 50) ?? "Instagram post"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: "var(--bg-primary)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {item.media_type}
                    </span>
                  </div>
                )}
                {/* Overlay with stats */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm">
                  <span className="flex items-center gap-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    {item.like_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    {item.comments_count.toLocaleString()}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No recent posts found.
          </p>
        )}
      </div>

      {/* Token Info */}
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        Connected as @{igConnection.igUsername}
        {igConnection.tokenExpiresAt && (
          <> &middot; Token expires {new Date(igConnection.tokenExpiresAt).toLocaleDateString()}</>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg p-6 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">{label}</p>
      <p style={{ color, fontSize: "32px" }} className="font-bold">{value}</p>
    </div>
  );
}
