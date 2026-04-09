import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";
import { refreshInstagramToken } from "@/lib/instagram";
import { encrypt, decrypt } from "@/lib/crypto";

/**
 * Cron job: Refresh Instagram access tokens before they expire.
 * Tokens last ~60 days; this runs weekly to refresh any expiring within 14 days.
 * Schedule: 0 9 * * 1 (every Monday at 9 AM) — defined in vercel.json.
 */
export async function POST(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // Find connections with tokens expiring within 14 days
  const connections = await prisma.creatorIgConnection.findMany({
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

  const results = { refreshed: 0, failed: 0, total: connections.length };

  for (const conn of connections) {
    try {
      if (!conn.accessToken || !conn.accessTokenIv) continue;

      // Decrypt current token
      const currentToken = decrypt(conn.accessToken, conn.accessTokenIv);

      // Refresh via Instagram API
      const { accessToken: newToken, expiresIn } = await refreshInstagramToken(currentToken);

      // Encrypt new token
      const { ciphertext, iv } = encrypt(newToken);
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      await prisma.creatorIgConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: ciphertext,
          accessTokenIv: iv,
          tokenExpiresAt,
        },
      });

      results.refreshed++;
    } catch (err) {
      console.error(`[refresh-tokens] Failed for @${conn.igUsername}:`, err);
      results.failed++;
    }
  }

  return NextResponse.json({ success: true, ...results });
}
