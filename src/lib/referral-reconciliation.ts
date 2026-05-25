import type { Prisma } from "@prisma/client";
import {
  getSubmissionFinancialState,
  roundMoney,
} from "@/lib/financial-eligibility";

const REFERRAL_COMMISSION_RATE = 0.1;
const REFERRAL_CAP_PER_CREATOR = 100;
const EARNED_REFERRAL_STATUS = "pending";
const REVIEW_REFERRAL_STATUS = "pending_review";
const REVERSIBLE_REFERRAL_STATUSES = [
  EARNED_REFERRAL_STATUS,
  REVIEW_REFERRAL_STATUS,
] as const;

type ReferralStatus = typeof EARNED_REFERRAL_STATUS | typeof REVIEW_REFERRAL_STATUS;
type Tx = Prisma.TransactionClient;

export interface ReferralReconciliationResult {
  action: "created" | "updated" | "removed" | "unchanged" | "locked" | "skipped";
  amount: number;
  status: ReferralStatus | null;
}

export interface ReferralCampaignReconciliationSummary {
  campaignId: string;
  submissionsChecked: number;
  created: number;
  updated: number;
  removed: number;
  unchanged: number;
  locked: number;
  skipped: number;
  earnedCommission: number;
  pendingReviewCommission: number;
}

export async function reconcileReferralPayoutsForCampaign(
  tx: Tx,
  campaignId: string,
): Promise<ReferralCampaignReconciliationSummary> {
  const submissions = await tx.campaignSubmission.findMany({
    where: { campaignId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const summary: ReferralCampaignReconciliationSummary = {
    campaignId,
    submissionsChecked: submissions.length,
    created: 0,
    updated: 0,
    removed: 0,
    unchanged: 0,
    locked: 0,
    skipped: 0,
    earnedCommission: 0,
    pendingReviewCommission: 0,
  };

  for (const submission of submissions) {
    const result = await reconcileReferralPayoutForSubmission(tx, submission.id);
    summary[result.action] += 1;
    if (result.status === EARNED_REFERRAL_STATUS) {
      summary.earnedCommission = roundMoney(summary.earnedCommission + result.amount);
    }
    if (result.status === REVIEW_REFERRAL_STATUS) {
      summary.pendingReviewCommission = roundMoney(
        summary.pendingReviewCommission + result.amount,
      );
    }
  }

  return summary;
}

export async function reconcileReferralPayoutForSubmission(
  tx: Tx,
  submissionId: string,
): Promise<ReferralReconciliationResult> {
  const submission = await tx.campaignSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      status: true,
      creatorId: true,
      applicationId: true,
      earnedAmount: true,
      settledAt: true,
      campaign: { select: { name: true } },
      creator: { select: { referredBy: true, createdAt: true } },
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
    },
  });

  if (!submission?.creator.referredBy) {
    return { action: "skipped", amount: 0, status: null };
  }

  const referrerId = submission.creator.referredBy;
  const existing = await tx.referralPayout.findFirst({
    where: {
      referrerId,
      referredUserId: submission.creatorId,
      submissionId: submission.id,
    },
    select: {
      id: true,
      amount: true,
      status: true,
      referrerId: true,
    },
  });

  const financialState = getSubmissionFinancialState(submission);
  if (financialState === "paid" || financialState === "pending_payout") {
    return {
      action: "locked",
      amount: existing ? Number(existing.amount) : 0,
      status: isReferralStatus(existing?.status) ? existing.status : null,
    };
  }

  if (existing && !isReferralStatus(existing.status)) {
    return { action: "locked", amount: Number(existing.amount), status: null };
  }

  if (financialState === "ineligible") {
    return removeExistingReferral(tx, existing);
  }

  const targetStatus: ReferralStatus =
    financialState === "pending_review"
      ? REVIEW_REFERRAL_STATUS
      : EARNED_REFERRAL_STATUS;
  const targetAmount = await calculateTargetReferralAmount({
    tx,
    referrerId,
    referredUserId: submission.creatorId,
    submissionId: submission.id,
    earnedAmount: Number(submission.earnedAmount),
  });

  if (targetAmount <= 0) {
    return removeExistingReferral(tx, existing);
  }

  if (!existing) {
    await tx.referralPayout.create({
      data: {
        referrerId,
        referredUserId: submission.creatorId,
        campaignApplicationId: submission.applicationId,
        submissionId: submission.id,
        amount: targetAmount,
        status: targetStatus,
      },
    });
    await syncReferralEarningsDelta(tx, referrerId, 0, targetAmount, targetStatus);
    if (targetStatus === EARNED_REFERRAL_STATUS) {
      await createReferralEarnedNotification(tx, {
        referrerId,
        campaignName: submission.campaign.name,
        amount: targetAmount,
        referredUserId: submission.creatorId,
      });
    }
    return { action: "created", amount: targetAmount, status: targetStatus };
  }

  const previousAmount = Number(existing.amount);
  const previousStatus = isReferralStatus(existing.status) ? existing.status : null;
  if (roundMoney(previousAmount) === targetAmount && previousStatus === targetStatus) {
    return { action: "unchanged", amount: targetAmount, status: targetStatus };
  }

  await tx.referralPayout.update({
    where: { id: existing.id },
    data: {
      amount: targetAmount,
      status: targetStatus,
      campaignApplicationId: submission.applicationId,
    },
  });
  await syncReferralEarningsDelta(
    tx,
    referrerId,
    previousStatus === EARNED_REFERRAL_STATUS ? previousAmount : 0,
    targetAmount,
    targetStatus,
  );
  if (previousStatus !== EARNED_REFERRAL_STATUS && targetStatus === EARNED_REFERRAL_STATUS) {
    await createReferralEarnedNotification(tx, {
      referrerId,
      campaignName: submission.campaign.name,
      amount: targetAmount,
      referredUserId: submission.creatorId,
    });
  }

  return { action: "updated", amount: targetAmount, status: targetStatus };
}

async function calculateTargetReferralAmount({
  tx,
  referrerId,
  referredUserId,
  submissionId,
  earnedAmount,
}: {
  tx: Tx;
  referrerId: string;
  referredUserId: string;
  submissionId: string;
  earnedAmount: number;
}) {
  const alreadyAttributed = await tx.referralPayout.aggregate({
    where: {
      referrerId,
      referredUserId,
      NOT: { submissionId },
    },
    _sum: { amount: true },
  });
  const remainingCap = Math.max(
    0,
    REFERRAL_CAP_PER_CREATOR - Number(alreadyAttributed._sum.amount ?? 0),
  );
  const uncapped = roundMoney(Math.max(0, earnedAmount) * REFERRAL_COMMISSION_RATE);
  return roundMoney(Math.min(uncapped, remainingCap));
}

async function removeExistingReferral(
  tx: Tx,
  existing: {
    id: string;
    amount: Prisma.Decimal | number | string;
    status: string;
    referrerId: string;
  } | null,
): Promise<ReferralReconciliationResult> {
  if (!existing) return { action: "unchanged", amount: 0, status: null };

  await tx.referralPayout.deleteMany({
    where: { id: existing.id, status: { in: [...REVERSIBLE_REFERRAL_STATUSES] } },
  });
  if (existing.status === EARNED_REFERRAL_STATUS) {
    await tx.user.update({
      where: { id: existing.referrerId },
      data: { referralEarnings: { decrement: Number(existing.amount) } },
    });
  }
  return { action: "removed", amount: 0, status: null };
}

async function syncReferralEarningsDelta(
  tx: Tx,
  referrerId: string,
  previousEarnedAmount: number,
  targetAmount: number,
  targetStatus: ReferralStatus,
) {
  const nextEarnedAmount = targetStatus === EARNED_REFERRAL_STATUS ? targetAmount : 0;
  const delta = roundMoney(nextEarnedAmount - previousEarnedAmount);
  if (delta === 0) return;
  await tx.user.update({
    where: { id: referrerId },
    data: {
      referralEarnings:
        delta > 0 ? { increment: delta } : { decrement: Math.abs(delta) },
    },
  });
}

async function createReferralEarnedNotification(
  tx: Tx,
  data: {
    referrerId: string;
    campaignName: string;
    amount: number;
    referredUserId: string;
  },
) {
  await tx.notification.create({
    data: {
      userId: data.referrerId,
      type: "REFERRAL_EARNED",
      data: {
        campaignName: data.campaignName,
        amount: data.amount,
        referredUserId: data.referredUserId,
      },
    },
  });
}

function isReferralStatus(value: string | null | undefined): value is ReferralStatus {
  return value === EARNED_REFERRAL_STATUS || value === REVIEW_REFERRAL_STATUS;
}
