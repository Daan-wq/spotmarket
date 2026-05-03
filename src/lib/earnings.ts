import { prisma } from "@/lib/prisma";

export interface CreatorTotalEarnings {
  total: number;
  settled: number;
  estimated: number;
  withdrawn: number;
}

/**
 * Single source of truth for a creator's total earnings.
 *
 * - settled: SUM(CampaignSubmission.earnedAmount) where settledAt IS NOT NULL.
 * - estimated: for APPROVED + unsettled submissions, eligibleViews × campaign.creatorCpv
 *   using the latest MetricSnapshot (mirrors /api/clipper/live-earnings).
 * - withdrawn: SUM(Withdrawal.amount) for SENT/CONFIRMED — diagnostic only, NOT
 *   included in `total` since `settled` already counts those amounts.
 * - total = settled + estimated.
 */
export async function getCreatorTotalEarnings(
  userId: string
): Promise<CreatorTotalEarnings> {
  const [settledAgg, unsettled, wallet] = await Promise.all([
    prisma.campaignSubmission.aggregate({
      where: { creatorId: userId, settledAt: { not: null } },
      _sum: { earnedAmount: true },
    }),
    prisma.campaignSubmission.findMany({
      where: {
        creatorId: userId,
        status: "APPROVED",
        settledAt: null,
      },
      select: {
        viewCount: true,
        claimedViews: true,
        eligibleViews: true,
        baselineViews: true,
        campaign: { select: { creatorCpv: true } },
        metricSnapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: { viewCount: true },
        },
      },
    }),
    prisma.wallet.findUnique({
      where: { userId },
      include: {
        withdrawals: {
          where: { status: { in: ["SENT", "CONFIRMED"] } },
          select: { amount: true },
        },
      },
    }),
  ]);

  const settled = Number(settledAgg._sum.earnedAmount ?? 0);

  let estimated = 0;
  for (const s of unsettled) {
    const latestSnap = s.metricSnapshots[0];
    const snapshotViews = latestSnap ? Number(latestSnap.viewCount) : null;
    const fallbackViews = s.viewCount ?? s.claimedViews ?? 0;
    const rawViews = snapshotViews ?? fallbackViews;
    const baseline = s.baselineViews ?? 0;
    const eligible = s.eligibleViews ?? Math.max(0, rawViews - baseline);
    const cpv = Number(s.campaign.creatorCpv);
    estimated += eligible * cpv;
  }

  const withdrawn =
    wallet?.withdrawals.reduce((sum, w) => sum + Number(w.amount), 0) ?? 0;

  return {
    settled,
    estimated,
    withdrawn,
    total: settled + estimated,
  };
}
