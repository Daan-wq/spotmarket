import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";
import { refreshInstagramToken } from "@/lib/instagram";
import { refreshYoutubeToken } from "@/lib/youtube";
import { encrypt, decrypt } from "@/lib/crypto";
import { forceRefreshTikTokAccessToken } from "@/lib/token-refresh";
import { recordAccountRefreshFailure } from "@/lib/social-account-refresh";

/**
 * Cron job: refresh social access tokens before they expire.
 * Schedule: hourly, defined in vercel.json.
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
    },
    take: 50,
  });

  const igResults = { refreshed: 0, failed: 0, total: igConnections.length };

  for (const conn of igConnections) {
    try {
      if (!conn.accessToken || !conn.accessTokenIv) continue;

      const currentToken = decrypt(conn.accessToken, conn.accessTokenIv);
      const { accessToken: newToken, expiresIn } = await refreshInstagramToken(currentToken);
      const { ciphertext, iv } = encrypt(newToken);
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      await prisma.creatorIgConnection.update({
        where: { id: conn.id },
        data: { accessToken: ciphertext, accessTokenIv: iv, tokenExpiresAt },
      });

      igResults.refreshed++;
    } catch (err) {
      console.error(`[refresh-tokens] IG failed for @${conn.igUsername}:`, err);
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
      refreshToken: true,
      refreshTokenIv: true,
    },
    take: 50,
  });

  const ytResults = { refreshed: 0, failed: 0, total: ytConnections.length };

  for (const conn of ytConnections) {
    try {
      if (!conn.refreshToken || !conn.refreshTokenIv) continue;

      const currentRefresh = decrypt(conn.refreshToken, conn.refreshTokenIv);
      const { accessToken: newToken, expiresIn } = await refreshYoutubeToken(currentRefresh);
      const { ciphertext, iv } = encrypt(newToken);
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      await prisma.creatorYtConnection.update({
        where: { id: conn.id },
        data: { accessToken: ciphertext, accessTokenIv: iv, tokenExpiresAt },
      });

      ytResults.refreshed++;
    } catch (err) {
      console.error(`[refresh-tokens] YT failed for ${conn.channelName}:`, err);
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
