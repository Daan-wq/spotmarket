import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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

    // Find all approved, unsettled submissions for this campaign
    const submissions = await prisma.campaignSubmission.findMany({
      where: {
        campaignId,
        status: "APPROVED",
        settledAt: null,
      },
      include: { creator: true },
    });

    if (submissions.length === 0) {
      return NextResponse.json({ error: "No unsettled approved submissions" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let totalSettled = 0;
      const settledCreators: string[] = [];

      for (const sub of submissions) {
        const amount = Number(sub.earnedAmount);
        if (amount <= 0) continue;

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

      return { totalSettled, creatorsCount: settledCreators.length, submissionsCount: submissions.length };
    });

    return NextResponse.json({
      message: "Campaign settled",
      ...result,
    });
  } catch (err: any) {
    console.error("[campaign settle]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
