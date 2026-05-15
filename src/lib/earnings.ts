import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Projected per-submission earnings (forecast, regardless of status)
// ─────────────────────────────────────────────────────────────────────────────
//
// Single source of truth for the simple `views × creatorCpv` calculation that
// the submission detail card and the My Clips list use. This is a FORECAST —
// it does not subtract baselineViews and does not gate on APPROVED status.
// For realized/payable earnings see getCreatorTotalEarnings below.

type CpvLike = Prisma.Decimal | string | number | null | undefined;

function toNumber(value: CpvLike): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}

export function projectedEarnings(views: number, creatorCpv: CpvLike): number {
  if (!views || views <= 0) return 0;
  const cpv = toNumber(creatorCpv);
  if (!cpv) return 0;
  return views * cpv;
}

interface ViewableSubmission {
  viewCount?: number | null;
  claimedViews?: number | null;
}

export function submissionViews(s: ViewableSubmission): number {
  return s.viewCount ?? s.claimedViews ?? 0;
}

export interface ProjectedEarningsSubmission extends ViewableSubmission {
  campaign: { creatorCpv: CpvLike };
}

export function submissionProjectedEarnings(
  s: ProjectedEarningsSubmission,
): number {
  return projectedEarnings(submissionViews(s), s.campaign.creatorCpv);
}

export function totalProjectedEarnings(
  submissions: ReadonlyArray<ProjectedEarningsSubmission>,
): number {
  return submissions.reduce(
    (sum, s) => sum + submissionProjectedEarnings(s),
    0,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Realized creator earnings (settled + estimated for unsettled approvals)
// ─────────────────────────────────────────────────────────────────────────────

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
