import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") ?? "7d";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);
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
    take: limit,
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
      displayName: true,
      avatarUrl: true,
      userId: true,
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const leaderboard = grouped.map((g, i) => {
    const profile = g.creatorProfileId ? profileMap.get(g.creatorProfileId) : null;
    return {
      rank: i + 1,
      creatorProfileId: g.creatorProfileId,
      displayName: profile?.displayName ?? "Unknown",
      avatarUrl: profile?.avatarUrl ?? null,
      userId: profile?.userId ?? null,
      totalEarned: parseFloat(g._sum.amount?.toString() ?? "0"),
      payoutCount: g._count.id,
    };
  });

  // Also get platform-wide stats for context
  const totalPaidOut = await prisma.payout.aggregate({
    where: {
      status: { in: ["confirmed", "sent"] },
      ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      ...(campaignId ? { application: { campaignId } } : {}),
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const uniqueEarners = await prisma.payout.groupBy({
    by: ["creatorProfileId"],
    where: {
      status: { in: ["confirmed", "sent"] },
      creatorProfileId: { not: null },
      ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      ...(campaignId ? { application: { campaignId } } : {}),
    },
  });

  return NextResponse.json({
    leaderboard,
    period,
    stats: {
      totalPaidOut: parseFloat(totalPaidOut._sum.amount?.toString() ?? "0"),
      totalPayouts: totalPaidOut._count.id,
      uniqueEarners: uniqueEarners.length,
    },
  });
}
