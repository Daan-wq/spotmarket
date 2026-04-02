import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FollowButton } from "@/components/profile/follow-button";
import { ReviewForm } from "@/components/profile/review-form";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const viewer = authUser
    ? await prisma.user.findUnique({ where: { supabaseId: authUser.id }, select: { id: true } })
    : null;

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      profilePublic: true,
      createdAt: true,
      creatorProfile: {
        select: { displayName: true, avatarUrl: true, bio: true, totalFollowers: true, engagementRate: true },
      },
      _count: {
        select: { followers: true, following: true },
      },
    },
  });

  if (!profile) notFound();

  const isOwner = viewer?.id === userId;
  const isPrivate = !profile.profilePublic && !isOwner;

  // Check if viewer follows this user
  const isFollowing = viewer && !isOwner
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewer.id, followingId: userId } },
      }))
    : false;

  // Always load minimal data; load full data only if public or owner
  const displayName = profile.creatorProfile?.displayName ?? profile.email.split("@")[0];
  const avatarUrl = profile.creatorProfile?.avatarUrl ?? null;

  if (isPrivate) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4"
            style={{ background: "var(--text-primary)" }}
          >
            {displayName[0].toUpperCase()}
          </div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{displayName}</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>This profile is private.</p>
        </div>
      </div>
    );
  }

  // Load full profile data
  const [launchedCampaigns, creatorHistory, reviews, completedTogether] = await Promise.all([
    prisma.campaign.findMany({
      where: { createdByUserId: userId, status: { in: ["active", "completed", "pending_review", "pending_payment"] } },
      select: {
        id: true, name: true, description: true, status: true, totalBudget: true,
        creatorCpv: true, targetGeo: true, deadline: true, createdAt: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.campaignApplication.findMany({
      where: {
        creatorProfile: { userId },
        status: { in: ["completed", "active", "approved"] },
      },
      select: {
        id: true,
        status: true,
        campaign: { select: { id: true, name: true, createdByUserId: true } },
        posts: {
          select: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1, select: { viewsCount: true } } },
        },
      },
      orderBy: { appliedAt: "desc" },
      take: 12,
    }),
    prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: { id: true, creatorProfile: { select: { displayName: true, avatarUrl: true } } } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Check if viewer can leave a review (completed campaign together)
    viewer && !isOwner
      ? prisma.campaign.findFirst({
          where: {
            status: "completed",
            OR: [
              { createdByUserId: userId, applications: { some: { creatorProfile: { userId: viewer.id }, status: "completed" } } },
              { createdByUserId: viewer.id, applications: { some: { creatorProfile: { userId }, status: "completed" } } },
            ],
          },
          select: { id: true, name: true, createdByUserId: true },
        })
      : Promise.resolve(null),
  ]);

  // Check if viewer already left a review
  const alreadyReviewed = viewer && completedTogether
    ? !!(await prisma.review.findUnique({
        where: { reviewerId_revieweeId_campaignId: { reviewerId: viewer.id, revieweeId: userId, campaignId: completedTogether.id } },
      }))
    : false;

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const totalViews = creatorHistory.reduce((sum, app) => {
    return sum + app.posts.reduce((s, p) => s + (p.snapshots[0]?.viewsCount ?? 0), 0);
  }, 0);

  const joined = new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start gap-5 mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shrink-0"
            style={{ background: avatarUrl ? undefined : "var(--text-primary)" }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
              : displayName[0].toUpperCase()
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{displayName}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full capitalize font-medium" style={{ background: "var(--muted)", color: "var(--text-secondary)" }}>
                {profile.role}
              </span>
              {avgRating && (
                <span className="text-sm font-medium" style={{ color: "#f59e0b" }}>
                  {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
                  <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>{avgRating.toFixed(1)} ({reviews.length})</span>
                </span>
              )}
            </div>
            {profile.creatorProfile?.bio && (
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{profile.creatorProfile.bio}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>Joined {joined}</span>
              <span>{profile._count.followers} followers</span>
              <span>{profile._count.following} following</span>
            </div>
          </div>

          {viewer && !isOwner && (
            <FollowButton userId={userId} initialFollowing={isFollowing} initialCount={profile._count.followers} />
          )}
          {isOwner && (
            <Link
              href="/profile"
              className="px-4 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--muted)", color: "var(--text-primary)" }}
            >
              Edit Profile
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Campaigns Launched", value: launchedCampaigns.length },
            { label: "Creator Campaigns", value: creatorHistory.length },
            { label: "Total Views Generated", value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews) },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Review prompt */}
        {completedTogether && !alreadyReviewed && viewer && !isOwner && (
          <div className="mb-8">
            <ReviewForm
              revieweeId={userId}
              campaignId={completedTogether.id}
              campaignName={completedTogether.name}
            />
          </div>
        )}

        {/* Tabs */}
        <ProfileTabs
          launchedCampaigns={launchedCampaigns}
          creatorHistory={creatorHistory}
          reviews={reviews}
        />
      </div>
    </div>
  );
}

// ─── Inline tab component (client) ───────────────────────────────────────────

function ProfileTabs({ launchedCampaigns, creatorHistory, reviews }: {
  launchedCampaigns: Array<{ id: string; name: string; description: string | null; status: string; totalBudget: unknown; creatorCpv: unknown; targetGeo: string[]; deadline: Date; createdAt: Date; _count: { applications: number } }>;
  creatorHistory: Array<{ id: string; status: string; campaign: { id: string; name: string }; posts: Array<{ snapshots: Array<{ viewsCount: number }> }> }>;
  reviews: Array<{ id: string; rating: number; text: string | null; createdAt: Date; reviewer: { id: string; creatorProfile: { displayName: string; avatarUrl: string | null } | null }; campaign: { id: string; name: string } }>;
}) {
  return <ProfileTabsClient launchedCampaigns={launchedCampaigns} creatorHistory={creatorHistory} reviews={reviews} />;
}

import { ProfileTabsClient } from "./profile-tabs-client";
