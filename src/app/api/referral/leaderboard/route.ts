import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { resolveCreatorLeaderboardName } from "@/lib/creator-leaderboard-name";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("creator");

    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const requestedLimit = parseInt(req.nextUrl.searchParams.get("limit") ?? "5", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 5)
      : 5;

    // Get top referrers by earnings
    const topReferrers = await prisma.user.findMany({
      where: {
        referralEarnings: { gt: 0 },
        role: "creator",
      },
      select: {
        id: true,
        email: true,
        discordUsername: true,
        referralEarnings: true,
        creatorProfile: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { referralEarnings: "desc" },
      take: limit,
    });

    // Get referral counts for these users
    const referrerIds = topReferrers.map((r) => r.id);
    const referralCounts = await prisma.user.groupBy({
      by: ["referredBy"],
      where: { referredBy: { in: referrerIds } },
      _count: { id: true },
    });
    const countMap = new Map(
      referralCounts.map((r) => [r.referredBy, r._count.id])
    );

    const leaderboard = topReferrers.map((r, i) => ({
      rank: i + 1,
      userId: r.id,
      displayName: resolveCreatorLeaderboardName(r) ?? r.email,
      avatarUrl: r.creatorProfile?.avatarUrl ?? null,
      totalEarnings: parseFloat(r.referralEarnings.toString()),
      referralCount: countMap.get(r.id) ?? 0,
      isCurrentUser: r.id === currentUser.id,
    }));

    // Find current user's rank if not in top list
    let currentUserRank: number | null = null;
    const inList = leaderboard.find((l) => l.isCurrentUser);
    if (!inList) {
      const higherCount = await prisma.user.count({
        where: {
          referralEarnings: { gt: 0 },
          role: "creator",
          OR: [
            {
              referralEarnings: {
                gt: (
                  await prisma.user.findUnique({
                    where: { id: currentUser.id },
                    select: { referralEarnings: true },
                  })
                )?.referralEarnings ?? 0,
              },
            },
          ],
        },
      });
      currentUserRank = higherCount + 1;
    }

    return NextResponse.json({ leaderboard, currentUserRank });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("[referral leaderboard]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
