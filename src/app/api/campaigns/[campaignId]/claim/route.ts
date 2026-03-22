import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });
  if (!dbUser?.creatorProfile) return NextResponse.json({ error: "No creator profile" }, { status: 403 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const pages = await prisma.socialAccount.findMany({
    where: { creatorProfileId: dbUser.creatorProfile.id, isActive: true },
  });

  return NextResponse.json({ campaign, pages });
}

export async function POST(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;

  let body: { selectedPageIds: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { selectedPageIds } = body;

  if (!selectedPageIds?.length) {
    return NextResponse.json({ error: "Select at least one page" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });
  if (!dbUser?.creatorProfile) return NextResponse.json({ error: "No creator profile" }, { status: 403 });

  const cp = dbUser.creatorProfile;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, status: "active" } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Verify pages belong to this creator and are active
  const pages = await prisma.socialAccount.findMany({
    where: { id: { in: selectedPageIds }, creatorProfileId: cp.id, isActive: true },
  });
  if (pages.length !== selectedPageIds.length) {
    return NextResponse.json({ error: "Invalid or inactive pages selected" }, { status: 400 });
  }

  // Check slots
  if (campaign.maxSlots != null && campaign.claimedSlots >= campaign.maxSlots) {
    return NextResponse.json({ error: "No slots available" }, { status: 409 });
  }

  // Check existing application
  const existing = await prisma.campaignApplication.findFirst({
    where: { campaignId, creatorProfileId: cp.id },
  });
  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 409 });

  // Create application with pages in a transaction
  const [application] = await prisma.$transaction([
    prisma.campaignApplication.create({
      data: {
        campaignId,
        creatorProfileId: cp.id,
        status: campaign.requiresApproval ? "pending" : "approved",
        claimType: campaign.requiresApproval ? "APPLICATION" : "INSTANT",
        followerSnapshot: pages.reduce((sum, p) => sum + p.followerCount, 0),
        engagementSnapshot: pages.length > 0
          ? pages.reduce((sum, p) => sum + Number(p.engagementRate), 0) / pages.length
          : 0,
        campaignApplicationPages: {
          createMany: {
            data: selectedPageIds.map(socialAccountId => ({ socialAccountId })),
          },
        },
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { claimedSlots: { increment: 1 } },
    }),
    prisma.socialAccount.updateMany({
      where: { id: { in: selectedPageIds } },
      data: { activeCampaigns: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ application }, { status: 201 });
}
