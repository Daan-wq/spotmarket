import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: { socialAccounts: { where: { isActive: true } } },
      },
    },
  });
  if (!dbUser?.creatorProfile) return NextResponse.json({ error: "No creator profile" }, { status: 403 });

  const cp = dbUser.creatorProfile;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, status: "active" } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  if (cp.totalFollowers < campaign.minFollowers) {
    return NextResponse.json({ error: `Minimum ${campaign.minFollowers} followers required` }, { status: 400 });
  }
  if (Number(cp.engagementRate) < Number(campaign.minEngagementRate)) {
    return NextResponse.json({ error: "Engagement rate too low" }, { status: 400 });
  }
  if (campaign.targetGeo.length > 0 && !campaign.targetGeo.includes(cp.primaryGeo)) {
    return NextResponse.json({ error: "Geo not matching campaign target" }, { status: 400 });
  }
  if (campaign.maxSlots != null && campaign.claimedSlots >= campaign.maxSlots) {
    return NextResponse.json({ error: "No slots available" }, { status: 409 });
  }

  const existing = await prisma.campaignApplication.findFirst({
    where: { campaignId, creatorProfileId: cp.id },
  });
  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 409 });

  const [application] = await prisma.$transaction([
    prisma.campaignApplication.create({
      data: {
        campaignId,
        creatorProfileId: cp.id,
        status: campaign.requiresApproval ? "pending" : "approved",
        claimType: campaign.requiresApproval ? "APPLICATION" : "INSTANT",
        followerSnapshot: cp.totalFollowers,
        engagementSnapshot: cp.engagementRate,
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { claimedSlots: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ application }, { status: 201 });
}
