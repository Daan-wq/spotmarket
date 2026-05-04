import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  fetchFacebookPageProfile,
  fetchRecentPagePosts,
  fetchPageDailyInsights,
  computeEngagementRate,
  mergeDailyPostCounts,
} from "@/lib/facebook";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageDetailProps {
  params: Promise<{ connectionId: string }>;
}

export default async function FbPageDetailPage({ params }: PageDetailProps) {
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

  const conn = await prisma.creatorFbConnection.findFirst({
    where: { id: connectionId, creatorProfileId: profile.id },
  });

  if (!conn || !conn.accessToken || !conn.accessTokenIv) {
    notFound();
  }

  const accessToken = decrypt(conn.accessToken, conn.accessTokenIv);
  const pageId = conn.fbPageId;

  // Fetch all data in parallel
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sinceUnix = Math.floor(thirtyDaysAgo.getTime() / 1000);
  const untilUnix = Math.floor(now.getTime() / 1000);

  const [fbProfile, recentPosts, dailyInsights] = await Promise.allSettled([
    fetchFacebookPageProfile(pageId, accessToken),
    fetchRecentPagePosts(pageId, accessToken, 100),
    fetchPageDailyInsights(pageId, accessToken, sinceUnix, untilUnix),
  ]);

  const profileData = fbProfile.status === "fulfilled" ? fbProfile.value : null;
  const postsData = recentPosts.status === "fulfilled" ? recentPosts.value : [];
  const insightsResult = dailyInsights.status === "fulfilled" ? dailyInsights.value : null;
  const insightsData = insightsResult
    ? mergeDailyPostCounts(
        insightsResult.daily,
        postsData.map((p) => ({ type: p.type, createdTime: p.createdTime }))
      )
    : [];
  const windowTotals = insightsResult?.windowTotals ?? {
    reach: 0, impressions: 0, engagedUsers: 0,
    reactions: 0, comments: 0, shares: 0, pageFans: 0,
  };

  // Persist profile pic URL for the pages listing
  if (profileData?.profilePictureUrl && profileData.profilePictureUrl !== conn.profilePicUrl) {
    try {
      await prisma.creatorFbConnection.update({
        where: { id: conn.id },
        data: { profilePicUrl: profileData.profilePictureUrl },
      });
    } catch {
      // Non-fatal
    }
  }

  const engagementRate = computeEngagementRate(
    postsData,
    profileData?.followerCount ?? conn.followerCount ?? 0
  );

  const totalReach = windowTotals.reach;
  const totalImpressions = windowTotals.impressions;
  const totalEngagement = windowTotals.engagedUsers;

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
      {profileData && (
        <div
          className="rounded-lg p-6 border flex flex-col md:flex-row items-start md:items-center gap-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-4 flex-1">
            {profileData.profilePictureUrl ? (
              <img
                src={profileData.profilePictureUrl}
                alt={profileData.name}
                width={72}
                height={72}
                className="rounded-full shrink-0"
              />
            ) : (
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                style={{ background: "#1877F2", color: "#fff" }}
              >
                {conn.pageName[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {profileData.name}
              </h1>
              {profileData.about && (
                <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {profileData.about}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-6 text-center shrink-0">
            <Stat label="Followers" value={profileData.followerCount.toLocaleString()} />
            <Stat label="Page Fans" value={windowTotals.pageFans.toLocaleString()} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="30d Reach" value={totalReach.toLocaleString()} color="#1877F2" />
        <MetricCard label="30d Impressions" value={totalImpressions.toLocaleString()} color="#42B72A" />
        <MetricCard label="30d Engaged Users" value={totalEngagement.toLocaleString()} color="#EC4899" />
        <MetricCard label="Engagement" value={`${engagementRate}%`} color="#14b8a6" />
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
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Photos</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Videos</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Links</th>
                  <th className="text-right py-2 px-1 sticky top-0 text-xs" style={{ background: "var(--bg-card)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {insightsData.slice().reverse().map((day) => {
                  const totalPosts = day.photosPosted + day.videosPosted + day.linksPosted + day.statusesPosted;
                  return (
                    <tr key={day.date} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-1.5 px-1 text-xs" style={{ color: "var(--text-primary)" }}>
                        {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                        {(day.reach ?? 0).toLocaleString()}
                      </td>
                      <td className="py-1.5 px-1 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                        {(day.followers ?? 0).toLocaleString()}
                      </td>
                      <td className="py-1.5 px-1 text-right text-xs" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {day.photosPosted || "–"}
                      </td>
                      <td className="py-1.5 px-1 text-right text-xs" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {day.videosPosted || "–"}
                      </td>
                      <td className="py-1.5 px-1 text-right text-xs" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {day.linksPosted || "–"}
                      </td>
                      <td className="py-1.5 px-1 text-right text-xs" style={{ color: totalPosts > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {day.statusesPosted || "–"}
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

      {/* Recent Posts */}
      <div
        className="rounded-lg p-6 border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Posts
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {postsData.length} posts
          </span>
        </div>
        {postsData.length > 0 ? (
          <div className="space-y-3">
            {postsData.slice(0, 25).map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border p-4 transition-all hover:shadow-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm line-clamp-2" style={{ color: "var(--text-primary)" }}>
                      {post.message || <span style={{ color: "var(--text-muted)" }}>(no text)</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                        {post.type}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(post.createdTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                    <span title="Reactions">{post.reactions.toLocaleString()} reactions</span>
                    <span title="Comments">{post.comments.toLocaleString()} comments</span>
                    <span title="Shares">{post.shares.toLocaleString()} shares</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No posts found.</p>
        )}
      </div>

      {/* Footer info */}
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {conn.pageName} &middot; Page ID: {conn.fbPageId}
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
