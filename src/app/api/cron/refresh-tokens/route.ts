import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshInstagramToken } from "@/lib/instagram";

/**
 * Weekly cron: refresh Instagram long-lived tokens expiring within 7 days.
 * Triggered by Vercel Cron every Monday at 09:00.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const expiringAccounts = await prisma.socialAccount.findMany({
    where: {
      platform: "instagram",
      isActive: true,
      tokenExpiresAt: { lt: sevenDaysFromNow },
    },
    select: {
      id: true,
      accessToken: true,
      accessTokenIv: true,
    },
  });

  const results = { refreshed: 0, failed: 0, errors: [] as string[] };

  for (const account of expiringAccounts) {
    try {
      const currentToken = decrypt(account.accessToken, account.accessTokenIv);
      const { accessToken: newToken, expiresIn } = await refreshInstagramToken(currentToken);
      const { ciphertext, iv } = encrypt(newToken);

      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: ciphertext,
          accessTokenIv: iv,
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        },
      });

      results.refreshed++;
    } catch (err) {
      results.failed++;
      results.errors.push(
        `Account ${account.id}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  console.log("[cron/refresh-tokens]", results);
  return NextResponse.json(results);
}
