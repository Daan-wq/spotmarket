import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { verifyCron } from "@/lib/cron-auth";
import { fetchMediaInsights, type MediaInsightType } from "@/lib/instagram";
import type { IgMediaItem } from "@/types/instagram";

const MAX_ITEMS_PER_ACCOUNT = 25;

function detectMediaType(item: IgMediaItem): MediaInsightType | "SKIP" {
  // Skip child carousel items — they have no insights endpoint
  // Skip stories — captured via webhook instead
  if (item.media_product_type === "STORY" || item.media_type === "STORY") return "SKIP";
  if (item.media_product_type === "REELS" || item.media_type === "VIDEO") return "REEL";
  return "FEED";
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.socialAccount.findMany({
    where: {
      isActive: true,
      platform: "instagram",
      tokenExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      platformUserId: true,
      accessToken: true,
      accessTokenIv: true,
      igMediaCache: true,
    },
  });

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const account of accounts) {
    let plainToken: string | null = null;
    try {
      plainToken = decrypt(account.accessToken, account.accessTokenIv);
    } catch {
      console.error(`[sync-media-insights] Token decrypt failed for account ${account.id}`);
      errors++;
      continue;
    }

    const mediaCache = (account.igMediaCache as IgMediaItem[] | null) ?? [];
    const items = mediaCache.slice(0, MAX_ITEMS_PER_ACCOUNT);

    for (const item of items) {
      const mediaType = detectMediaType(item);
      if (mediaType === "SKIP") {
        skipped++;
        continue;
      }

      try {
        const insights = await fetchMediaInsights(item.id, plainToken, mediaType);

        await prisma.mediaInsightSnapshot.upsert({
          where: { igMediaId: item.id },
          create: {
            socialAccountId: account.id,
            igMediaId: item.id,
            mediaType,
            reach: insights.reach,
            views: insights.views,
            shares: insights.shares,
            totalInteractions: insights.totalInteractions,
            likes: insights.likes,
            comments: insights.comments,
            saved: insights.saved,
            follows: insights.follows,
            profileVisits: insights.profileVisits,
            profileActivityBioLink: insights.profileActivityBioLink,
            profileActivityCall: insights.profileActivityCall,
            profileActivityDirection: insights.profileActivityDirection,
            profileActivityEmail: insights.profileActivityEmail,
            profileActivityText: insights.profileActivityText,
            avgWatchTime: insights.avgWatchTime,
            totalWatchTime: insights.totalWatchTime,
            replies: insights.replies,
            navigationForward: insights.navigationForward,
            navigationBack: insights.navigationBack,
            navigationExit: insights.navigationExit,
            navigationNextStory: insights.navigationNextStory,
          },
          update: {
            mediaType,
            fetchedAt: new Date(),
            reach: insights.reach,
            views: insights.views,
            shares: insights.shares,
            totalInteractions: insights.totalInteractions,
            likes: insights.likes,
            comments: insights.comments,
            saved: insights.saved,
            follows: insights.follows,
            profileVisits: insights.profileVisits,
            profileActivityBioLink: insights.profileActivityBioLink,
            profileActivityCall: insights.profileActivityCall,
            profileActivityDirection: insights.profileActivityDirection,
            profileActivityEmail: insights.profileActivityEmail,
            profileActivityText: insights.profileActivityText,
            avgWatchTime: insights.avgWatchTime,
            totalWatchTime: insights.totalWatchTime,
            replies: insights.replies,
            navigationForward: insights.navigationForward,
            navigationBack: insights.navigationBack,
            navigationExit: insights.navigationExit,
            navigationNextStory: insights.navigationNextStory,
          },
        });
        synced++;
      } catch (err) {
        console.error(`[sync-media-insights] Failed for media ${item.id}:`, err);
        errors++;
      }
    }
  }

  return NextResponse.json({ ok: true, accountsProcessed: accounts.length, synced, skipped, errors });
}
