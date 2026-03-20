import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "@/lib/realtime";

const FRAUD_SPIKE_MULTIPLIER = 3;

async function fetchInstagramInsights(
  accessToken: string,
  mediaId: string
): Promise<{ views: number; likes: number; comments: number; reach: number } | null> {
  try {
    const fields = "like_count,comments_count,insights.metric(impressions,reach,video_views)";
    const url = `https://graph.instagram.com/${mediaId}?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const insights: Record<string, number> = {};
    if (data.insights?.data) {
      for (const metric of data.insights.data as { name: string; values: { value: number }[] }[]) {
        insights[metric.name] = metric.values?.[0]?.value ?? 0;
      }
    }

    return {
      views: insights["video_views"] ?? insights["impressions"] ?? 0,
      likes: data.like_count ?? 0,
      comments: data.comments_count ?? 0,
      reach: insights["reach"] ?? 0,
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
  const intervals = recent.length - 1;
  return Math.max(0, totalDelta / intervals);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.campaignPost.findMany({
    where: {
      isFraudSuspect: false,
      application: {
        status: { in: ["active", "approved"] },
        campaign: {
          status: "active",
          deadline: { gt: new Date() },
        },
      },
    },
    include: {
      socialAccount: {
        select: {
          accessToken: true,
          accessTokenIv: true,
          platform: true,
        },
      },
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 8,
      },
    },
  });

  let snapshotsWritten = 0;
  let fraudFlagged = 0;

  for (const post of posts) {
    const { accessToken, accessTokenIv, platform } = post.socialAccount;
    if (!accessToken || !accessTokenIv) continue;

    let plainToken: string;
    try {
      plainToken = decrypt(accessToken, accessTokenIv);
    } catch {
      console.error(`Failed to decrypt token for post ${post.id}`);
      continue;
    }

    let metrics: { views: number; likes: number; comments: number; reach: number } | null = null;

    if (platform === "instagram") {
      metrics = await fetchInstagramInsights(plainToken, post.platformPostId);
    }

    if (!metrics) continue;

    await prisma.viewSnapshot.create({
      data: {
        postId: post.id,
        viewsCount: metrics.views,
        likesCount: metrics.likes,
        commentsCount: metrics.comments,
        reach: metrics.reach,
        capturedAt: new Date(),
      },
    });
    snapshotsWritten++;

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
      }
    }
  }

  return NextResponse.json({
    ok: true,
    postsProcessed: posts.length,
    snapshotsWritten,
    fraudFlagged,
  });
}
