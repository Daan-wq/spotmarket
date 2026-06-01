import { calculatePaidViews } from "@/lib/paid-views";
import type { Prisma } from "@prisma/client";
import {
  getSubmissionFinancialState,
  isOpenPayoutStatus,
  isPaidPayoutStatus,
} from "@/lib/financial-eligibility";

type NumericLike = number | string | { toString(): string } | null | undefined;
type CreatorPaymentSummaryClient = Pick<
  Prisma.TransactionClient,
  "campaignSubmission" | "payout"
>;

export interface CreatorPaymentSubmission {
  campaignId: string;
  campaignName: string;
  earnedAmount: NumericLike;
  eligibleViews?: number | null;
  viewCount?: number | null;
  claimedViews?: number | null;
  baselineViews?: number | null;
  minimumPaidViews?: number | null;
  maximumPaidViews?: number | null;
  creatorCpv?: NumericLike;
  status?: string | null;
  settledAt?: Date | string | null;
  payoutRunItems?: Array<{
    id?: string;
    payout?: { status?: string | null } | null;
  }>;
  submissionSignals?: Array<{
    severity: string;
    resolvedAt?: Date | string | null;
  }>;
}

export interface CreatorPaymentPayout {
  amount: NumericLike;
  status: string;
}

export interface CreatorCampaignEarningsRow {
  campaignId: string;
  campaignName: string;
  totalViews: number;
  totalEarned: number;
  count: number;
}

export interface CreatorPaymentSummary {
  totalEarned: number;
  totalPaid: number;
  profit: number;
  pendingPayout: number;
  pendingReviewBalance: number;
  paidBalance: number;
  lockedPayoutBalance: number;
  availableBalance: number;
  earningsByCampaign: CreatorCampaignEarningsRow[];
}

function toNumber(value: NumericLike): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function campaignViews(submission: CreatorPaymentSubmission): number {
  return (
    submission.eligibleViews ??
    calculatePaidViews({
      rawViews: submission.viewCount ?? submission.claimedViews ?? 0,
      baselineViews: submission.baselineViews,
      minimumPaidViews: submission.minimumPaidViews,
      maximumPaidViews: submission.maximumPaidViews,
    }).payableViews
  );
}

export function buildCreatorPaymentSummary({
  submissions,
  payouts,
}: {
  submissions: ReadonlyArray<CreatorPaymentSubmission>;
  payouts: ReadonlyArray<CreatorPaymentPayout>;
}): CreatorPaymentSummary {
  const totalEarned = roundMoney(
    submissions.reduce((sum, submission) => sum + toNumber(submission.earnedAmount), 0),
  );
  const totalPaid = roundMoney(
    payouts
      .filter((payout) => isPaidPayoutStatus(payout.status))
      .reduce((sum, payout) => sum + toNumber(payout.amount), 0),
  );
  const requestedPayout = roundMoney(
    payouts
      .filter((payout) => isOpenPayoutStatus(payout.status))
      .reduce((sum, payout) => sum + toNumber(payout.amount), 0),
  );
  const pendingReviewBalance = roundMoney(sumSubmissionsByState(submissions, "pending_review"));
  const lockedPayoutBalance = roundMoney(sumSubmissionsByState(submissions, "pending_payout"));
  const settledSubmissionBalance = roundMoney(sumSubmissionsByState(submissions, "paid"));
  const pendingPayout = roundMoney(requestedPayout + lockedPayoutBalance);

  const byCampaign = new Map<string, CreatorCampaignEarningsRow>();
  for (const submission of submissions) {
    const current = byCampaign.get(submission.campaignId) ?? {
      campaignId: submission.campaignId,
      campaignName: submission.campaignName,
      totalViews: 0,
      totalEarned: 0,
      count: 0,
    };

    current.totalViews += campaignViews(submission);
    current.totalEarned = roundMoney(current.totalEarned + toNumber(submission.earnedAmount));
    current.count += 1;
    byCampaign.set(submission.campaignId, current);
  }

  return {
    totalEarned,
    totalPaid,
    profit: roundMoney(totalPaid + settledSubmissionBalance),
    pendingPayout,
    pendingReviewBalance,
    paidBalance: roundMoney(totalPaid + settledSubmissionBalance),
    lockedPayoutBalance,
    availableBalance: roundMoney(
      Math.max(
        totalEarned -
          totalPaid -
          requestedPayout -
          pendingReviewBalance -
          lockedPayoutBalance -
          settledSubmissionBalance,
        0,
      ),
    ),
    earningsByCampaign: Array.from(byCampaign.values()).sort(
      (a, b) => b.totalEarned - a.totalEarned,
    ),
  };
}

function sumSubmissionsByState(
  submissions: ReadonlyArray<CreatorPaymentSubmission>,
  state: ReturnType<typeof getSubmissionFinancialState>,
) {
  return submissions.reduce(
    (sum, submission) =>
      getSubmissionFinancialState(submission) === state
        ? sum + toNumber(submission.earnedAmount)
        : sum,
    0,
  );
}

export async function getCreatorPaymentSummary(
  userId: string,
  creatorProfileId: string,
  client?: CreatorPaymentSummaryClient,
): Promise<CreatorPaymentSummary> {
  const db = client ?? (await import("@/lib/prisma")).prisma;
  const [submissions, payouts] = await Promise.all([
    db.campaignSubmission.findMany({
      where: { creatorId: userId, status: "APPROVED" },
      select: {
        campaignId: true,
        earnedAmount: true,
        eligibleViews: true,
        viewCount: true,
        claimedViews: true,
        baselineViews: true,
        status: true,
        settledAt: true,
        payoutRunItems: {
          select: {
            id: true,
            payout: { select: { status: true } },
          },
        },
        submissionSignals: {
          where: {
            resolvedAt: null,
            severity: { in: ["WARN", "CRITICAL"] },
          },
          select: { severity: true, resolvedAt: true },
        },
        campaign: {
          select: {
            name: true,
            minimumPaidViews: true,
            maximumPaidViews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.payout.findMany({
      where: { creatorProfileId },
      select: { amount: true, status: true },
    }),
  ]);

  return buildCreatorPaymentSummary({
    submissions: submissions.map((submission) => ({
      campaignId: submission.campaignId,
      campaignName: submission.campaign.name,
      earnedAmount: submission.earnedAmount,
      eligibleViews: submission.eligibleViews,
      viewCount: submission.viewCount,
      claimedViews: submission.claimedViews,
      baselineViews: submission.baselineViews,
      status: submission.status,
      settledAt: submission.settledAt,
      payoutRunItems: submission.payoutRunItems,
      submissionSignals: submission.submissionSignals,
      minimumPaidViews: submission.campaign.minimumPaidViews,
      maximumPaidViews: submission.campaign.maximumPaidViews,
    })),
    payouts,
  });
}
