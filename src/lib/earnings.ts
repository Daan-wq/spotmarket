import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { calculatePaidViews } from "@/lib/paid-views";

// ─────────────────────────────────────────────────────────────────────────────
// Projected per-submission earnings (forecast, regardless of status)
// ─────────────────────────────────────────────────────────────────────────────
//
// Single source of truth for the simple `views × creatorCpv` calculation that
// the submission detail card and the My Clips list use. This is a FORECAST —
// it does not subtract baselineViews and does not gate on APPROVED status.
// For creator-facing payable totals, use `creator-payment-summary`.

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
  baselineViews?: number | null;
}

export function submissionViews(s: ViewableSubmission): number {
  return s.viewCount ?? s.claimedViews ?? 0;
}

export interface ProjectedEarningsSubmission extends ViewableSubmission {
  campaign: {
    creatorCpv: CpvLike;
    minimumPaidViews?: number | null;
    maximumPaidViews?: number | null;
  };
}

export function submissionProjectedEarnings(
  s: ProjectedEarningsSubmission,
): number {
  const paidViews = calculatePaidViews({
    rawViews: submissionViews(s),
    baselineViews: s.baselineViews,
    minimumPaidViews: s.campaign.minimumPaidViews,
    maximumPaidViews: s.campaign.maximumPaidViews,
    creatorCpv: s.campaign.creatorCpv,
  });
  return paidViews.earnedAmount;
}

export function totalProjectedEarnings(
  submissions: ReadonlyArray<ProjectedEarningsSubmission>,
): number {
  return submissions.reduce(
    (sum, s) => sum + submissionProjectedEarnings(s),
    0,
  );
}

export function submissionNeedsPaidViewThreshold(
  s: ProjectedEarningsSubmission,
): boolean {
  const minimumPaidViews = Number(s.campaign.minimumPaidViews ?? 0);
  if (!Number.isFinite(minimumPaidViews) || minimumPaidViews <= 0) return false;

  const paidViews = calculatePaidViews({
    rawViews: submissionViews(s),
    baselineViews: s.baselineViews,
    minimumPaidViews,
    maximumPaidViews: s.campaign.maximumPaidViews,
    creatorCpv: s.campaign.creatorCpv,
  });
  return paidViews.trackedViews < minimumPaidViews;
}

export function submissionMinimumPaidViews(
  s: ProjectedEarningsSubmission,
): number {
  const minimumPaidViews = Number(s.campaign.minimumPaidViews ?? 0);
  if (!Number.isFinite(minimumPaidViews) || minimumPaidViews <= 0) return 0;
  return Math.trunc(minimumPaidViews);
}

// ─────────────────────────────────────────────────────────────────────────────
// Live creator earnings (settled + estimated for unsettled approvals)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatorTotalEarnings {
  total: number;
  settled: number;
  estimated: number;
  withdrawn: number;
}

/**
 * Live/estimated earnings helper for the dashboard ticker.
 *
 * Do not use this for creator-facing payable totals: it recalculates approved,
 * unsettled submissions from current campaign CPV, so campaign rate edits can
 * change historical-looking totals. Payable surfaces should use
 * `getCreatorPaymentSummary` from `creator-payment-summary`.
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
        campaign: {
          select: {
            creatorCpv: true,
            minimumPaidViews: true,
            maximumPaidViews: true,
          },
        },
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
    const paidViews = calculatePaidViews({
      rawViews,
      baselineViews: s.baselineViews,
      minimumPaidViews: s.campaign.minimumPaidViews,
      maximumPaidViews: s.campaign.maximumPaidViews,
      creatorCpv: s.campaign.creatorCpv,
    });
    estimated += paidViews.earnedAmount;
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
