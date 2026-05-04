import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";
import { refreshInstagramToken } from "@/lib/instagram";
import { refreshYoutubeToken } from "@/lib/youtube";
import { encrypt, decrypt } from "@/lib/crypto";

/**
 * Cron job: Refresh Instagram + YouTube access tokens before they expire.
 * Instagram tokens last ~60 days; YouTube access tokens last ~1 hour but use refresh tokens.
 * Schedule: 0 9 * * 1 (every Monday at 9 AM) — defined in vercel.json.
 */
export async function POST(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ── Instagram: refresh tokens expiring within 14 days ──
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

  // ── YouTube: refresh all tokens (they expire every ~1 hour) ──
  // We refresh all YouTube connections that have a refresh token,
  // regardless of tokenExpiresAt, since access tokens are short-lived.
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

  return NextResponse.json({
    success: true,
    instagram: igResults,
    youtube: ytResults,
  });
}
