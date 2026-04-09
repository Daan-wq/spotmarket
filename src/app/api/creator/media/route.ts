import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchRecentMedia } from "@/lib/instagram";

export async function GET() {
  try {
    const { userId } = await requireAuth("creator");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const connections = await prisma.creatorIgConnection.findMany({
      where: {
        creatorProfileId: user.creatorProfile.id,
        isVerified: true,
        accessToken: { not: null },
        igUserId: { not: null },
      },
      select: {
        id: true,
        igUsername: true,
        igUserId: true,
        accessToken: true,
        accessTokenIv: true,
      },
    });

    const results = await Promise.all(
      connections.map(async (conn) => {
        if (!conn.accessToken || !conn.accessTokenIv || !conn.igUserId) {
          return { id: conn.id, igUsername: conn.igUsername, media: [] };
        }
        try {
          const token = decrypt(conn.accessToken, conn.accessTokenIv);
          const media = await fetchRecentMedia(token, conn.igUserId, 24);
          return { id: conn.id, igUsername: conn.igUsername, media };
        } catch {
          return { id: conn.id, igUsername: conn.igUsername, media: [] };
        }
      })
    );

    return NextResponse.json({ connections: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[creator/media]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
