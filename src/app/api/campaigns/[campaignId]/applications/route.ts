import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId, role } = await requireAuth("admin", "advertiser");
    const { campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (role === "advertiser") {
      const user = await prisma.user.findUnique({
        where: { supabaseId: userId },
        include: { advertiserProfile: true },
      });
      if (campaign.advertiserId !== user?.advertiserProfile?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const applications = await prisma.campaignApplication.findMany({
      where: { campaignId },
      include: {
        creatorProfile: { select: { displayName: true, totalFollowers: true, igConnections: { select: { igUsername: true, isVerified: true }, take: 1, where: { isVerified: true } } } },
      },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (err: any) {
    console.error("[campaigns applications GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await requireAuth("creator");
    const { campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { creatorProfile: { include: { igConnections: true } } },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    if (!user.creatorProfile.igConnections?.some(c => c.isVerified)) {
      return NextResponse.json({ error: "Creator bio must be verified first" }, { status: 400 });
    }

    const existing = await prisma.campaignApplication.findFirst({
      where: {
        campaignId,
        creatorProfileId: user.creatorProfile.id,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already applied" }, { status: 409 });
    }

    const application = await prisma.campaignApplication.create({
      data: {
        campaignId,
        creatorProfileId: user.creatorProfile.id,
        followerSnapshot: user.creatorProfile.totalFollowers,
        engagementSnapshot: user.creatorProfile.engagementRate,
        status: "pending",
      },
      include: { creatorProfile: true },
    });

    await prisma.notification.create({
      data: {
        userId: campaign.createdByUserId || user.id,
        type: "APPLICATION_APPROVED",
        data: {
          campaignId: campaign.id,
          creatorName: user.creatorProfile.displayName,
        },
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (err: any) {
    console.error("[campaigns applications POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
