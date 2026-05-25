import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCreatorLeaderboardName } from "@/lib/creator-leaderboard-name";
import {
  isExcludedFromLeaderboards,
  LEADERBOARD_OVERSCAN_LIMIT,
} from "@/lib/leaderboard-exclusions";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") ?? "7d";
  const requestedLimit = parseInt(searchParams.get("limit") ?? "5", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 5)
    : 5;
  const campaignId = searchParams.get("campaignId");

  // Calculate date range
  let dateFilter: Date | undefined;
  if (period === "7d") dateFilter = new Date(Date.now() - 7 * 86400000);
  else if (period === "30d") dateFilter = new Date(Date.now() - 30 * 86400000);
  // "all" = no date filter

  // Build where clause for payouts
  const where: Record<string, unknown> = {
    status: { in: ["confirmed", "sent"] },
    creatorProfileId: { not: null },
  };
  if (dateFilter) where.createdAt = { gte: dateFilter };
  if (campaignId) where.application = { campaignId };

  // Aggregate earnings by creator
  const grouped = await prisma.payout.groupBy({
    by: ["creatorProfileId"],
    where,
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
    take: LEADERBOARD_OVERSCAN_LIMIT,
  });

  if (grouped.length === 0) {
    return NextResponse.json({ leaderboard: [], period });
  }

  // Fetch creator profiles for the top earners
  const profileIds = grouped
    .map((g) => g.creatorProfileId)
    .filter((id): id is string => id !== null);

  const profiles = await prisma.creatorProfile.findMany({
    where: { id: { in: profileIds } },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      userId: true,
      user: { select: { email: true, discordUsername: true } },
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const leaderboard = grouped
    .map((g) => {
      const profile = g.creatorProfileId ? profileMap.get(g.creatorProfileId) : null;
      return { group: g, profile };
    })
    .flatMap(({ group, profile }) => {
      if (
        !profile ||
        isExcludedFromLeaderboards({
          email: profile.user.email,
          discordUsername: profile.user.discordUsername,
          creatorProfile: { username: profile.username },
        })
      ) {
        return [];
      }
      return [{ group, profile }];
    })
    .slice(0, limit)
    .map(({ group, profile }, i) => ({
      rank: i + 1,
      creatorProfileId: group.creatorProfileId,
      displayName:
        resolveCreatorLeaderboardName({
          email: profile.user.email,
          discordUsername: profile.user.discordUsername,
          creatorProfile: { username: profile.username },
        }) ?? profile.user.email,
      avatarUrl: profile.avatarUrl,
      userId: profile.userId,
      totalEarned: parseFloat(group._sum.amount?.toString() ?? "0"),
      payoutCount: group._count.id,
    }));

  // Also get platform-wide stats for context, excluding internal test accounts.
  const paidPayouts = await prisma.payout.findMany({
    where: {
      status: { in: ["confirmed", "sent"] },
      creatorProfileId: { not: null },
      ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      ...(campaignId ? { application: { campaignId } } : {}),
    },
    select: {
      amount: true,
      creatorProfileId: true,
      creatorProfile: {
        select: {
          username: true,
          user: { select: { email: true, discordUsername: true } },
        },
      },
    },
  });
  const visiblePaidPayouts = paidPayouts.filter(
    (payout) =>
      payout.creatorProfile &&
      !isExcludedFromLeaderboards({
        email: payout.creatorProfile.user.email,
        discordUsername: payout.creatorProfile.user.discordUsername,
        creatorProfile: { username: payout.creatorProfile.username },
      }),
  );
  const uniqueEarners = new Set(
    visiblePaidPayouts
      .map((payout) => payout.creatorProfileId)
      .filter((id): id is string => id !== null),
  );

  return NextResponse.json({
    leaderboard,
    period,
    stats: {
      totalPaidOut: visiblePaidPayouts.reduce(
        (sum, payout) => sum + parseFloat(payout.amount.toString()),
        0,
      ),
      totalPayouts: visiblePaidPayouts.length,
      uniqueEarners: uniqueEarners.size,
    },
  });
}
