import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildConnectRequiredMessage,
  evaluateCampaignJoinEligibility,
} from "@/lib/campaign-eligibility";
import {
  CAMPAIGN_CLOSED_FOR_SUBMISSIONS_MESSAGE,
  isCampaignClosedForSubmissions,
} from "@/lib/campaign-submission-state";
import { getSocialAccountSummariesForProfile } from "@/lib/social-account-summary";

export async function GET(
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

    const applications = await prisma.campaignApplication.findMany({
      where: { campaignId },
      include: {
        creatorProfile: { select: { displayName: true, totalFollowers: true, igConnections: { select: { igUsername: true, isVerified: true }, take: 1, where: { isVerified: true } } } },
      },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (err: unknown) {
    console.error("[campaigns applications GET]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
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

    if (
      isCampaignClosedForSubmissions({
        status: campaign.status,
        deadline: campaign.deadline,
      })
    ) {
      return NextResponse.json(
        { error: CAMPAIGN_CLOSED_FOR_SUBMISSIONS_MESSAGE },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: {
        creatorProfile: {
          include: {
            igConnections: true,
            ttConnections: true,
            ytConnections: true,
            fbConnections: true,
          },
        },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const socialAccounts = await getSocialAccountSummariesForProfile(user.creatorProfile.id);
    const eligibility = evaluateCampaignJoinEligibility(campaign.platforms, {
      instagram: socialAccounts.ig.some((c) => c.isVerified),
      tiktok: socialAccounts.tt.some((c) => c.isVerified),
      youtube: socialAccounts.yt.some((c) => c.isVerified),
      facebook: socialAccounts.fb.some((c) => c.isVerified),
    });
    const followerSnapshot = Math.max(
      0,
      ...socialAccounts.ig.map((c) => c.audienceCount ?? 0),
      ...socialAccounts.fb.map((c) => c.audienceCount ?? 0),
      ...socialAccounts.yt.map((c) => c.audienceCount ?? 0),
      ...socialAccounts.tt.map((c) => c.audienceCount ?? 0),
    );

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          code: "CONNECT_REQUIRED",
          error: buildConnectRequiredMessage(eligibility.missingPlatformLabels),
          missingPlatforms: eligibility.missingPlatforms,
          requiredPlatformLabels: eligibility.missingPlatformLabels,
        },
        { status: 400 },
      );
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
        followerSnapshot,
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

    return NextResponse.json({ id: application.id, application }, { status: 201 });
  } catch (err: unknown) {
    console.error("[campaigns applications POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
