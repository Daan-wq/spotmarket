import type { Prisma } from "@prisma/client";
import { roundMoney } from "@/lib/financial-eligibility";

type NumericLike = number | string | { toString(): string } | null | undefined;

export interface BudgetCapSubmission {
  id: string;
  eligibleViews?: number | null;
  earnedAmount?: NumericLike;
  reviewedAt?: Date | string | null;
  createdAt?: Date | string | null;
  settledAt?: Date | string | null;
  payoutRunItems?: ReadonlyArray<unknown>;
}

export interface BudgetCapAllocation {
  id: string;
  earnedAmount: number;
  uncappedEarnedAmount: number;
  locked: boolean;
}

export interface BudgetCapResult {
  totalBudget: number;
  totalAllocated: number;
  allocations: BudgetCapAllocation[];
}

type Tx = Prisma.TransactionClient;

export function allocateCampaignBudget({
  totalBudget,
  creatorCpv,
  submissions,
}: {
  totalBudget: NumericLike;
  creatorCpv: NumericLike;
  submissions: ReadonlyArray<BudgetCapSubmission>;
}): BudgetCapResult {
  const budget = roundMoney(Math.max(0, toNumber(totalBudget)));
  let remaining = budget;
  const allocations: BudgetCapAllocation[] = [];

  for (const submission of [...submissions].sort(compareApprovalOrder)) {
    const locked = isLocked(submission);
    const uncappedEarnedAmount = locked
      ? roundMoney(Math.max(0, toNumber(submission.earnedAmount)))
      : calculateSubmissionBudgetAmount(submission.eligibleViews, creatorCpv);
    const earnedAmount = locked
      ? uncappedEarnedAmount
      : roundMoney(Math.min(uncappedEarnedAmount, Math.max(0, remaining)));

    remaining = roundMoney(Math.max(0, remaining - earnedAmount));
    allocations.push({
      id: submission.id,
      earnedAmount,
      uncappedEarnedAmount,
      locked,
    });
  }

  return {
    totalBudget: budget,
    totalAllocated: roundMoney(
      allocations.reduce((sum, allocation) => sum + allocation.earnedAmount, 0),
    ),
    allocations,
  };
}

export async function reconcileCampaignBudgetCap(tx: Tx, campaignId: string) {
  const campaign = await tx.campaign.findUnique({
    where: { id: campaignId },
    select: {
      totalBudget: true,
      creatorCpv: true,
      campaignSubmissions: {
        where: { status: "APPROVED" },
        select: {
          id: true,
          eligibleViews: true,
          earnedAmount: true,
          reviewedAt: true,
          createdAt: true,
          settledAt: true,
          payoutRunItems: { select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!campaign) {
    return {
      totalBudget: 0,
      totalAllocated: 0,
      allocations: [],
      changedSubmissionIds: [],
    };
  }

  const result = allocateCampaignBudget({
    totalBudget: campaign.totalBudget,
    creatorCpv: campaign.creatorCpv,
    submissions: campaign.campaignSubmissions,
  });
  const currentById = new Map(
    campaign.campaignSubmissions.map((submission) => [
      submission.id,
      submission,
    ]),
  );
  const changedSubmissionIds: string[] = [];

  for (const allocation of result.allocations) {
    if (allocation.locked) continue;

    const current = currentById.get(allocation.id);
    if (!current) continue;

    if (roundMoney(toNumber(current.earnedAmount)) === allocation.earnedAmount) {
      continue;
    }

    await tx.campaignSubmission.update({
      where: { id: allocation.id },
      data: { earnedAmount: allocation.earnedAmount },
    });
    changedSubmissionIds.push(allocation.id);
  }

  return {
    ...result,
    changedSubmissionIds,
  };
}

function calculateSubmissionBudgetAmount(
  eligibleViews: number | null | undefined,
  creatorCpv: NumericLike,
) {
  return roundMoney(Math.max(0, toNumber(eligibleViews)) * toNumber(creatorCpv));
}

function compareApprovalOrder(a: BudgetCapSubmission, b: BudgetCapSubmission) {
  const approvalDelta = approvalTime(a) - approvalTime(b);
  if (approvalDelta !== 0) return approvalDelta;

  const createdDelta = dateTime(a.createdAt) - dateTime(b.createdAt);
  if (createdDelta !== 0) return createdDelta;

  return a.id.localeCompare(b.id);
}

function approvalTime(submission: BudgetCapSubmission) {
  const reviewed = dateTime(submission.reviewedAt);
  return reviewed === Number.MAX_SAFE_INTEGER
    ? dateTime(submission.createdAt)
    : reviewed;
}

function dateTime(value: Date | string | null | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function isLocked(submission: BudgetCapSubmission) {
  return Boolean(submission.settledAt || (submission.payoutRunItems?.length ?? 0) > 0);
}

function toNumber(value: NumericLike): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}
