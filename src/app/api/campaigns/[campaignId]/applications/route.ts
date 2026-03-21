import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const isAdmin = user.role === "admin";

  let where: object = { campaignId };
  if (!isAdmin) {
    if (!user.creatorProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    where = { campaignId, creatorProfileId: user.creatorProfile.id };
  }

  const applications = await prisma.campaignApplication.findMany({
    where,
    include: {
      creatorProfile: {
        include: {
          socialAccounts: {
            select: { platform: true, platformUsername: true, followerCount: true, engagementRate: true, audienceGeo: true, lastSyncedAt: true },
          },
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json(applications);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { include: { socialAccounts: { where: { isActive: true } } } } },
  });

  if (!user || user.role !== "creator") return NextResponse.json({ error: "Only creators can apply" }, { status: 403 });
  if (!user.creatorProfile) return NextResponse.json({ error: "Creator profile required" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "active") return NextResponse.json({ error: "Campaign is not accepting applications" }, { status: 400 });
  if (new Date() > campaign.deadline) return NextResponse.json({ error: "Campaign deadline has passed" }, { status: 400 });

  const existing = await prisma.campaignApplication.findFirst({
    where: { campaignId, creatorProfileId: user.creatorProfile.id },
  });
  if (existing) return NextResponse.json({ error: "Already applied to this campaign" }, { status: 409 });

  const application = await prisma.campaignApplication.create({
    data: {
      campaignId,
      creatorProfileId: user.creatorProfile.id,
      status: "pending",
      followerSnapshot: user.creatorProfile.totalFollowers,
      engagementSnapshot: user.creatorProfile.engagementRate,
    },
  });

  return NextResponse.json(application, { status: 201 });
}
