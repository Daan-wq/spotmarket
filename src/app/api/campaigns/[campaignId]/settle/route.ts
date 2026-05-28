import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { reconcileCampaignBudgetCap } from "@/lib/campaign-budget-cap";
import { isSubmissionPayoutEligible } from "@/lib/financial-eligibility";
import { reconcileReferralPayoutForSubmission } from "@/lib/referral-reconciliation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    await requireAuth("admin");
    const { campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await reconcileCampaignBudgetCap(tx, campaignId);

      // Find all approved, unsettled submissions for this campaign after the cap is applied.
      const submissions = await tx.campaignSubmission.findMany({
        where: {
          campaignId,
          status: "APPROVED",
          settledAt: null,
          earnedAmount: { gt: 0 },
          payoutRunItems: { none: {} },
          submissionSignals: {
            none: {
              resolvedAt: null,
              severity: { in: ["WARN", "CRITICAL"] },
            },
          },
        },
        include: {
          creator: true,
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

      const eligibleSubmissions = submissions.filter(isSubmissionPayoutEligible);
      if (eligibleSubmissions.length === 0) return null;

      let totalSettled = 0;
      const settledCreators: string[] = [];

      for (const sub of eligibleSubmissions) {
        const amount = Number(sub.earnedAmount);
        if (amount <= 0) continue;
        await reconcileReferralPayoutForSubmission(tx, sub.id);

        // Upsert wallet for creator
        const wallet = await tx.wallet.upsert({
          where: { userId: sub.creatorId },
          create: { userId: sub.creatorId, balance: amount },
          update: { balance: { increment: amount } },
        });

        // Mark submission as settled
        await tx.campaignSubmission.update({
          where: { id: sub.id },
          data: { settledAt: new Date() },
        });

        // Notify creator
        await tx.notification.create({
          data: {
            userId: sub.creatorId,
            type: "EARNINGS_CREDITED",
            data: {
              campaignName: campaign.name,
              amount,
              walletBalance: Number(wallet.balance),
            },
          },
        });

        totalSettled += amount;
        if (!settledCreators.includes(sub.creatorId)) {
          settledCreators.push(sub.creatorId);
        }
      }

      return {
        totalSettled,
        creatorsCount: settledCreators.length,
        submissionsCount: eligibleSubmissions.length,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!result) {
      return NextResponse.json({ error: "No unsettled approved submissions" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Campaign settled",
      ...result,
    });
  } catch (err: unknown) {
    console.error("[campaign settle]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
