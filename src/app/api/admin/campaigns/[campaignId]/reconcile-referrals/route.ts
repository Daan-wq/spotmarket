import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcileReferralPayoutsForCampaign } from "@/lib/referral-reconciliation";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  try {
    await requireAuth("admin");
    const { campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const summary = await prisma.$transaction((tx) =>
      reconcileReferralPayoutsForCampaign(tx, campaign.id),
    );

    return NextResponse.json({
      campaign,
      ...summary,
    });
  } catch (err: unknown) {
    console.error("[campaign referral reconcile]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
