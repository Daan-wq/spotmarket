import { calculatePaidViews } from "@/lib/paid-views";

type NumericLike = number | string | { toString(): string } | null | undefined;

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
  availableBalance: number;
  earningsByCampaign: CreatorCampaignEarningsRow[];
}

const PAID_PAYOUT_STATUSES = new Set(["sent", "confirmed"]);
const PENDING_PAYOUT_STATUSES = new Set(["pending", "processing"]);

function toNumber(value: NumericLike): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizedStatus(status: string): string {
  return status.toLowerCase();
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
      .filter((payout) => PAID_PAYOUT_STATUSES.has(normalizedStatus(payout.status)))
      .reduce((sum, payout) => sum + toNumber(payout.amount), 0),
  );
  const pendingPayout = roundMoney(
    payouts
      .filter((payout) => PENDING_PAYOUT_STATUSES.has(normalizedStatus(payout.status)))
      .reduce((sum, payout) => sum + toNumber(payout.amount), 0),
  );

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
    profit: totalPaid,
    pendingPayout,
    availableBalance: roundMoney(Math.max(totalEarned - totalPaid - pendingPayout, 0)),
    earningsByCampaign: Array.from(byCampaign.values()).sort(
      (a, b) => b.totalEarned - a.totalEarned,
    ),
  };
}

export async function getCreatorPaymentSummary(
  userId: string,
  creatorProfileId: string,
): Promise<CreatorPaymentSummary> {
  const { prisma } = await import("@/lib/prisma");
  const [submissions, payouts] = await Promise.all([
    prisma.campaignSubmission.findMany({
      where: { creatorId: userId, status: "APPROVED" },
      select: {
        campaignId: true,
        earnedAmount: true,
        eligibleViews: true,
        viewCount: true,
        claimedViews: true,
        baselineViews: true,
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
    prisma.payout.findMany({
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
      minimumPaidViews: submission.campaign.minimumPaidViews,
      maximumPaidViews: submission.campaign.maximumPaidViews,
    })),
    payouts,
  });
}
