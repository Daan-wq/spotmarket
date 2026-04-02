import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "@/lib/realtime";
import { verifyCron } from "@/lib/cron-auth";
import type { IgMediaItem } from "@/types/instagram";

const FRAUD_SPIKE_MULTIPLIER = 3;

interface FullInsights {
  views: number;
  likes: number;
  comments: number;
  reach: number;
  savedCount: number | null;
  sharesCount: number | null;
  avgWatchTimeMs: number | null;
  totalWatchTimeMs: number | null;
  profileVisits: number | null;
  followsFromPost: number | null;
}

/**
 * Fetch per-media insights using v25.0 non-deprecated metrics.
 * isReel=true adds ig_reels_avg_watch_time and ig_reels_video_view_total_time.
 */
async function fetchInstagramInsights(
  accessToken: string,
  mediaId: string,
  isReel = false
): Promise<FullInsights | null> {
  try {
    const GRAPH = "https://graph.instagram.com/v25.0";

    // views = unified v25.0 metric (replaces deprecated video_views + impressions)
    const baseMetrics = "views,reach,saved,shares,profile_visits,follows";
    const metricList = isReel
      ? `${baseMetrics},ig_reels_avg_watch_time,ig_reels_video_view_total_time`
      : baseMetrics;

    const fields = `like_count,comments_count,insights.metric(${metricList})`;
    const url = `${GRAPH}/${mediaId}?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`;
    let res = await fetch(url);

    // Reel-specific metrics may fail for non-Reel posts — retry without them
    if (!res.ok && isReel) {
      const fallbackFields = `like_count,comments_count,insights.metric(${baseMetrics})`;
      res = await fetch(`${GRAPH}/${mediaId}?fields=${encodeURIComponent(fallbackFields)}&access_token=${accessToken}`);
    }

    if (!res.ok) return null;
    const data = await res.json();

    const insights: Record<string, number> = {};
    for (const metric of (data.insights?.data ?? []) as { name: string; values: { value: number }[] }[]) {
      insights[metric.name] = metric.values?.[0]?.value ?? 0;
    }

    return {
      views: insights["views"] ?? 0,
      likes: data.like_count ?? 0,
      comments: data.comments_count ?? 0,
      reach: insights["reach"] ?? 0,
      savedCount: "saved" in insights ? insights["saved"] : null,
      sharesCount: "shares" in insights ? insights["shares"] : null,
      avgWatchTimeMs: "ig_reels_avg_watch_time" in insights ? insights["ig_reels_avg_watch_time"] : null,
      totalWatchTimeMs: "ig_reels_video_view_total_time" in insights ? insights["ig_reels_video_view_total_time"] : null,
      profileVisits: "profile_visits" in insights ? insights["profile_visits"] : null,
      followsFromPost: "follows" in insights ? insights["follows"] : null,
    };
  } catch {
    return null;
  }
}

function compute24hRollingAvg(snapshots: { viewsCount: number; capturedAt: Date }[]): number {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const recent = snapshots
    .filter((s) => s.capturedAt.getTime() >= cutoff)
    .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  if (recent.length < 2) return 0;
  const totalDelta = recent[recent.length - 1].viewsCount - recent[0].viewsCount;
  return Math.max(0, totalDelta / (recent.length - 1));
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.campaignPost.findMany({
    where: {
      isFraudSuspect: false,
      status: "approved",
      application: {
        status: { in: ["active", "approved"] },
        campaign: { status: "active", deadline: { gt: new Date() } },
      },
    },
    include: {
      socialAccount: {
        select: { accessToken: true, accessTokenIv: true, platform: true, id: true, igMediaCache: true },
      },
      networkMember: {
        select: { igAccessToken: true, igAccessTokenIv: true },
      },
      application: {
        include: {
          campaign: { select: { creatorCpv: true, id: true, name: true } },
        },
      },
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 8,
      },
      campaignAppPage: true,
    },
  });

  let snapshotsWritten = 0;
  let fraudFlagged = 0;
  const updatedAccountIds = new Set<string>();

  for (const post of posts) {
    // Resolve token — from SocialAccount (creator) or NetworkMember
    let plainToken: string | null = null;
    const platform = post.socialAccount?.platform ?? "instagram";

    if (post.socialAccount?.accessToken && post.socialAccount.accessTokenIv) {
      try {
        plainToken = decrypt(post.socialAccount.accessToken, post.socialAccount.accessTokenIv);
      } catch {
        console.error(`Failed to decrypt token for post ${post.id}`);
      }
    } else if (post.networkMember?.igAccessToken && post.networkMember.igAccessTokenIv) {
      try {
        plainToken = decrypt(post.networkMember.igAccessToken, post.networkMember.igAccessTokenIv);
      } catch {
        console.error(`Failed to decrypt network member token for post ${post.id}`);
      }
    }

    if (!plainToken) continue;

    // Detect if post is a Reel via igMediaCache for correct metric set
    const mediaCache = (post.socialAccount?.igMediaCache as IgMediaItem[] | null) ?? [];
    const cacheItem = mediaCache.find((m) => m.id === post.platformPostId);
    const isReel = cacheItem?.media_product_type === "REELS" || cacheItem?.media_type === "VIDEO";

    let metrics: FullInsights | null = null;
    if (platform === "instagram") {
      metrics = await fetchInstagramInsights(plainToken, post.platformPostId, isReel);
    }
    if (!metrics) continue;

    await prisma.viewSnapshot.create({
      data: {
        postId: post.id,
        viewsCount: metrics.views,
        likesCount: metrics.likes,
        commentsCount: metrics.comments,
        reach: metrics.reach,
        savedCount: metrics.savedCount,
        sharesCount: metrics.sharesCount,
        avgWatchTimeMs: metrics.avgWatchTimeMs,
        totalWatchTimeMs: metrics.totalWatchTimeMs,
        profileVisits: metrics.profileVisits,
        followsFromPost: metrics.followsFromPost,
        capturedAt: new Date(),
      },
    });
    snapshotsWritten++;

    // Update verified views on post
    await prisma.campaignPost.update({
      where: { id: post.id },
      data: { verifiedViews: metrics.views },
    });

    // Track delta views and update CampaignApplicationPage
    const prevViews = post.snapshots[0]?.viewsCount ?? 0;
    const deltaViews = Math.max(0, metrics.views - prevViews);

    if (deltaViews > 0 && post.socialAccountId) {
      let appPage = post.campaignAppPage;

      // Option B: Legacy posts without campaignAppPageId — look up via unique constraint
      if (!appPage && post.applicationId) {
        appPage = await prisma.campaignApplicationPage.findUnique({
          where: {
            applicationId_socialAccountId: {
              applicationId: post.applicationId,
              socialAccountId: post.socialAccountId,
            },
          },
        });
      }

      if (!appPage) {
        console.warn(`[poll-views] No CampaignApplicationPage found for post ${post.id} (applicationId=${post.applicationId}, socialAccountId=${post.socialAccountId})`);
      }
      if (appPage) {
        const cpv = Number(post.application.campaign.creatorCpv);
        const deltaEarned = Math.floor(deltaViews * cpv * 100); // cents

        await prisma.campaignApplicationPage.update({
          where: { id: appPage.id },
          data: {
            totalViews: { increment: deltaViews },
            totalReach: { increment: 0 },
            earnedAmount: { increment: deltaEarned },
          },
        });

        updatedAccountIds.add(post.socialAccountId);
      }
    }

    // Fraud detection
    const sortedSnapshots = [...post.snapshots].sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime()
    );
    const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    if (latestSnapshot) {
      const currentDelta = Math.max(0, metrics.views - latestSnapshot.viewsCount);
      const rollingAvg = compute24hRollingAvg(sortedSnapshots);
      if (rollingAvg > 0 && currentDelta > FRAUD_SPIKE_MULTIPLIER * rollingAvg) {
        const fraudFlags = {
          detectedAt: new Date().toISOString(),
          currentDelta,
          rollingAvg,
          multiplier: currentDelta / rollingAvg,
          previousViews: latestSnapshot.viewsCount,
          currentViews: metrics.views,
        };
        await prisma.campaignPost.update({
          where: { id: post.id },
          data: { isFraudSuspect: true, fraudFlags },
        });
        try {
          await broadcast(
            realtimeChannel.adminAlerts(),
            REALTIME_EVENTS.FRAUD_ALERT,
            { postId: post.id, applicationId: post.applicationId, ...fraudFlags }
          );
        } catch (err) {
          console.error("Realtime fraud alert failed:", err);
        }
        fraudFlagged++;
        continue;
      }
    }
  }

  // Recalculate earnings per application
  const applicationIds = [...new Set(posts.map((p) => p.applicationId))];

  for (const applicationId of applicationIds) {
    const app = await prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: {
        posts: {
          where: { status: "approved", isFraudSuspect: false },
          select: { verifiedViews: true },
        },
        campaign: { select: { creatorCpv: true } },
      },
    });
    if (!app) continue;

    const totalViews = app.posts.reduce((s, p) => s + p.verifiedViews, 0);
    // earnedAmount stored in cents: (views / 1000) * cpv * 100
    const earnedAmount = Math.floor((totalViews / 1000) * Number(app.campaign.creatorCpv) * 100);

    await prisma.campaignApplication.update({
      where: { id: applicationId },
      data: { earnedAmount, lastEarningsCalcAt: new Date() },
    });
  }

  // Recompute SocialAccount.totalEarnings for each affected account
  for (const accountId of updatedAccountIds) {
    const result = await prisma.campaignApplicationPage.aggregate({
      where: { socialAccountId: accountId },
      _sum: { earnedAmount: true },
    });
    await prisma.socialAccount.update({
      where: { id: accountId },
      data: { totalEarnings: result._sum.earnedAmount ?? 0 },
    });
  }

  // Budget exhaustion check — auto-pause campaigns that exceeded budget or goal views
  const campaignIds = [...new Set(posts.map((p) => p.application.campaign.id))];
  let campaignsPaused = 0;

  for (const campaignId of campaignIds) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true, totalBudget: true, businessCpv: true, goalViews: true, name: true },
    });
    if (!campaign || campaign.status !== "active") continue;

    const agg = await prisma.campaignApplicationPage.aggregate({
      where: { application: { campaignId } },
      _sum: { totalViews: true },
    });
    const totalViews = agg._sum.totalViews ?? 0;
    const totalSpend = totalViews * Number(campaign.businessCpv);
    const totalBudget = Number(campaign.totalBudget);
    const goalViews = campaign.goalViews ? Number(campaign.goalViews) : null;

    // 2% buffer to avoid race condition pausing
    const budgetExhausted = totalBudget > 0 && totalSpend >= totalBudget * 0.98;
    const viewsExhausted = goalViews !== null && goalViews > 0 && totalViews >= goalViews;

    if (budgetExhausted || viewsExhausted) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "paused" },
      });
      campaignsPaused++;

      try {
        await broadcast(
          realtimeChannel.campaign(campaignId),
          REALTIME_EVENTS.CAMPAIGN_BUDGET_EXHAUSTED,
          {
            campaignId,
            campaignName: campaign.name,
            totalSpend: Math.round(totalSpend * 100) / 100,
            totalBudget,
            totalViews,
            goalViews,
            reason: budgetExhausted ? "budget" : "views",
          }
        );
      } catch (err) {
        console.error("Realtime budget exhaustion broadcast failed:", err);
      }
    } else {
      // Broadcast live view update for active campaigns
      const percentUsed = goalViews && goalViews > 0
        ? Math.round((totalViews / goalViews) * 100)
        : totalBudget > 0
          ? Math.round((totalSpend / totalBudget) * 100)
          : 0;

      try {
        await broadcast(
          realtimeChannel.campaign(campaignId),
          REALTIME_EVENTS.CAMPAIGN_VIEWS_UPDATED,
          { campaignId, totalViews, totalSpend: Math.round(totalSpend * 100) / 100, percentUsed }
        );
      } catch {
        // Non-critical — view updates are best-effort
      }
    }
  }

  return NextResponse.json({
    ok: true,
    postsProcessed: posts.length,
    snapshotsWritten,
    fraudFlagged,
    campaignsPaused,
  });
}
