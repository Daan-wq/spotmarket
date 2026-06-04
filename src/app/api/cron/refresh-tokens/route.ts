import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";
import {
  forceRefreshInstagramAccessToken,
  forceRefreshTikTokAccessToken,
  forceRefreshYoutubeAccessToken,
} from "@/lib/token-refresh";
import { recordAccountRefreshFailure } from "@/lib/social-account-refresh";

/**
 * Cron job: refresh social access tokens before they expire.
 * Schedule: hourly via Supabase pg_cron.
 */
export async function POST(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const igConnections = await prisma.creatorIgConnection.findMany({
    where: {
      accessToken: { not: null },
      accessTokenIv: { not: null },
      tokenExpiresAt: { lt: fourteenDaysFromNow },
    },
    select: {
      id: true,
      igUsername: true,
      accessToken: true,
      accessTokenIv: true,
      tokenExpiresAt: true,
    },
    take: 50,
  });

  const igResults = { refreshed: 0, failed: 0, total: igConnections.length };

  for (const conn of igConnections) {
    try {
      if (!conn.accessToken || !conn.accessTokenIv) continue;

      await forceRefreshInstagramAccessToken(conn);

      igResults.refreshed++;
    } catch (err) {
      console.error(`[refresh-tokens] IG failed for @${conn.igUsername}:`, err);
      await recordAccountRefreshFailure({
        connectionType: "IG",
        connectionId: conn.id,
        error: err,
        code: "TOKEN_REFRESH_FAILED",
      }).catch(() => undefined);
      igResults.failed++;
    }
  }

  const ytConnections = await prisma.creatorYtConnection.findMany({
    where: {
      refreshToken: { not: null },
      refreshTokenIv: { not: null },
    },
    select: {
      id: true,
      channelName: true,
      accessToken: true,
      accessTokenIv: true,
      refreshToken: true,
      refreshTokenIv: true,
      tokenExpiresAt: true,
    },
    take: 50,
  });

  const ytResults = { refreshed: 0, failed: 0, total: ytConnections.length };

  for (const conn of ytConnections) {
    try {
      if (!conn.refreshToken || !conn.refreshTokenIv) continue;

      await forceRefreshYoutubeAccessToken(conn);

      ytResults.refreshed++;
    } catch (err) {
      console.error(`[refresh-tokens] YT failed for ${conn.channelName}:`, err);
      await recordAccountRefreshFailure({
        connectionType: "YT",
        connectionId: conn.id,
        error: err,
        code: "TOKEN_REFRESH_FAILED",
      }).catch(() => undefined);
      ytResults.failed++;
    }
  }

  const ttConnections = await prisma.creatorTikTokConnection.findMany({
    where: {
      refreshToken: { not: null },
      refreshTokenIv: { not: null },
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lt: twoHoursFromNow } }],
    },
    select: {
      id: true,
      username: true,
      accessToken: true,
      accessTokenIv: true,
      refreshToken: true,
      refreshTokenIv: true,
      tokenExpiresAt: true,
    },
    orderBy: { tokenExpiresAt: "asc" },
    take: 50,
  });

  const ttResults = { refreshed: 0, failed: 0, total: ttConnections.length };

  for (const conn of ttConnections) {
    try {
      const token = await forceRefreshTikTokAccessToken(conn);
      if (!token) {
        throw new Error("TikTok refresh token is missing");
      }
      ttResults.refreshed++;
    } catch (err) {
      console.error(`[refresh-tokens] TT failed for @${conn.username}:`, err);
      await recordAccountRefreshFailure({
        connectionType: "TT",
        connectionId: conn.id,
        error: err,
        code: "TOKEN_REFRESH_FAILED",
      }).catch(() => undefined);
      ttResults.failed++;
    }
  }

  return NextResponse.json({
    success: true,
    instagram: igResults,
    youtube: ytResults,
    tiktok: ttResults,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
