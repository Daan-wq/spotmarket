import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { verifyCron } from "@/lib/cron-auth";
import { fetchAccountDailyInsights } from "@/lib/instagram";

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
    },
  });

  // yesterday 00:00 UTC → today 00:00 UTC (one day window)
  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayMidnight = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);
  const sinceUnix = Math.floor(yesterdayMidnight.getTime() / 1000);
  const untilUnix = Math.floor(todayMidnight.getTime() / 1000);

  let synced = 0;
  let errors = 0;

  for (const account of accounts) {
    let plainToken: string | null = null;
    try {
      plainToken = decrypt(account.accessToken, account.accessTokenIv);
    } catch {
      console.error(`[sync-account-insights] Failed to decrypt token for account ${account.id}`);
      errors++;
      continue;
    }

    try {
      const insights = await fetchAccountDailyInsights(
        account.platformUserId,
        plainToken,
        sinceUnix,
        untilUnix
      );

      for (const insight of insights) {
        const date = new Date(`${insight.date}T00:00:00Z`);
        await prisma.accountInsightSnapshot.upsert({
          where: { socialAccountId_date: { socialAccountId: account.id, date } },
          create: {
            socialAccountId: account.id,
            date,
            reach: insight.reach,
            views: insight.views,
            accountsEngaged: insight.accountsEngaged,
            totalInteractions: insight.totalInteractions,
            likes: insight.likes,
            comments: insight.comments,
            saves: insight.saves,
            shares: insight.shares,
            reposts: insight.reposts,
            replies: insight.replies,
            follows: insight.follows,
            unfollows: insight.unfollows,
            profileLinksTaps: insight.profileLinksTaps,
            tapCall: insight.tapCall,
            tapEmail: insight.tapEmail,
            tapDirection: insight.tapDirection,
            tapBookNow: insight.tapBookNow,
            tapText: insight.tapText,
            followerCount: insight.followerCount,
          },
          update: {
            reach: insight.reach,
            views: insight.views,
            accountsEngaged: insight.accountsEngaged,
            totalInteractions: insight.totalInteractions,
            likes: insight.likes,
            comments: insight.comments,
            saves: insight.saves,
            shares: insight.shares,
            reposts: insight.reposts,
            replies: insight.replies,
            follows: insight.follows,
            unfollows: insight.unfollows,
            profileLinksTaps: insight.profileLinksTaps,
            tapCall: insight.tapCall,
            tapEmail: insight.tapEmail,
            tapDirection: insight.tapDirection,
            tapBookNow: insight.tapBookNow,
            tapText: insight.tapText,
            followerCount: insight.followerCount,
          },
        });
        synced++;
      }
    } catch (err) {
      console.error(`[sync-account-insights] Failed for account ${account.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ ok: true, accountsProcessed: accounts.length, synced, errors });
}
