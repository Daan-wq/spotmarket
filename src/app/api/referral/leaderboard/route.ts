import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { resolveCreatorLeaderboardName } from "@/lib/creator-leaderboard-name";
import {
  isExcludedFromLeaderboards,
  LEADERBOARD_OVERSCAN_LIMIT,
} from "@/lib/leaderboard-exclusions";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("creator");

    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: {
        id: true,
        email: true,
        discordUsername: true,
        referralEarnings: true,
        creatorProfile: { select: { username: true } },
      },
    });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const requestedLimit = parseInt(req.nextUrl.searchParams.get("limit") ?? "5", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 5)
      : 5;

    // Get top referrers by earnings
    const topReferrersRaw = await prisma.user.findMany({
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
      take: LEADERBOARD_OVERSCAN_LIMIT,
    });
    const topReferrers = topReferrersRaw
      .filter((referrer) => !isExcludedFromLeaderboards(referrer))
      .slice(0, limit);

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
    if (!inList && !isExcludedFromLeaderboards(currentUser)) {
      const rankedReferrers = await prisma.user.findMany({
        where: {
          referralEarnings: { gt: 0 },
          role: "creator",
        },
        select: {
          id: true,
          email: true,
          discordUsername: true,
          creatorProfile: { select: { username: true } },
        },
        orderBy: { referralEarnings: "desc" },
      });
      const visibleIndex = rankedReferrers
        .filter((referrer) => !isExcludedFromLeaderboards(referrer))
        .findIndex((referrer) => referrer.id === currentUser.id);
      currentUserRank = visibleIndex >= 0 ? visibleIndex + 1 : null;
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
