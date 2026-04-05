import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("admin");

    const [tc, ta, ac, sc, rev, earn, spend] = await Promise.all([
      prisma.creatorProfile.count(),
      prisma.advertiserProfile.count(),
      prisma.campaign.count({ where: { status: "active" } }),
      prisma.campaignSubmission.count({ where: { status: "PENDING" } }),
      prisma.campaign.aggregate({ _sum: { adminMargin: true } }),
      prisma.campaignSubmission.aggregate({ _sum: { earnedAmount: true }, where: { status: "APPROVED" } }),
      prisma.campaign.aggregate({ _sum: { totalBudget: true } }),
    ]);

    return NextResponse.json({
      totalCreators: tc,
      totalAdvertisers: ta,
      activeCampaigns: ac,
      submissionsPending: sc,
      platformRevenue: rev._sum.adminMargin || 0,
      creatorEarnings: earn._sum.earnedAmount || 0,
      brandSpend: spend._sum.totalBudget || 0,
    });
  } catch (err: any) {
    console.error("[admin stats]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
