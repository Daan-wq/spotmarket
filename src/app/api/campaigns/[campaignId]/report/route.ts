import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { role: true },
  });
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      creatorCpv: true,
      adminMargin: true,
      businessCpv: true,
      totalBudget: true,
    },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const creatorCpv = parseFloat(campaign.creatorCpv.toString());
  const adminMarginCpv = parseFloat(campaign.adminMargin.toString());

  const posts = await prisma.campaignPost.findMany({
    where: {
      application: { campaignId },
      isFraudSuspect: false,
      isApproved: true,
    },
    include: {
      snapshots: { orderBy: { capturedAt: "asc" }, select: { viewsCount: true } },
      application: {
        include: {
          creatorProfile: {
            select: {
              id: true,
              walletAddress: true,
            },
          },
        },
      },
    },
  });

  const creatorMap: Record<
    string,
    { creatorProfileId: string; walletAddress: string | null; verifiedViews: number }
  > = {};

  for (const post of posts) {
    if (!post.application.creatorProfile || !post.application.creatorProfileId) continue;

    const creatorProfileId = post.application.creatorProfileId;
    const walletAddress = post.application.creatorProfile.walletAddress;
    const snaps = post.snapshots;
    if (snaps.length < 2) continue;

    const verifiedViews = Math.max(0, snaps[snaps.length - 1].viewsCount - snaps[0].viewsCount);

    if (!creatorMap[creatorProfileId]) {
      creatorMap[creatorProfileId] = { creatorProfileId, walletAddress, verifiedViews: 0 };
    }
    creatorMap[creatorProfileId].verifiedViews += verifiedViews;
  }

  const creatorEntries = Object.values(creatorMap);
  const totalVerifiedViews = creatorEntries.reduce((s, c) => s + c.verifiedViews, 0);
  const totalCreatorPayout = creatorEntries.reduce(
    (s, c) => s + c.verifiedViews * creatorCpv,
    0
  );
  const totalAdminRevenue = totalVerifiedViews * adminMarginCpv;

  const dataJson = {
    creators: creatorEntries.map((c) => ({
      creatorProfileId: c.creatorProfileId,
      verifiedViews: c.verifiedViews,
      earnings: c.verifiedViews * creatorCpv,
    })),
  };

  const report = await prisma.campaignReport.upsert({
    where: { campaignId },
    create: {
      campaignId,
      totalViews: BigInt(totalVerifiedViews),
      totalPayout: totalCreatorPayout,
      adminRevenue: totalAdminRevenue,
      creatorCount: creatorEntries.length,
      dataJson,
    },
    update: {
      totalViews: BigInt(totalVerifiedViews),
      totalPayout: totalCreatorPayout,
      adminRevenue: totalAdminRevenue,
      creatorCount: creatorEntries.length,
      dataJson,
    },
  });

  const payoutsCreated: string[] = [];
  for (const creator of creatorEntries) {
    if (!creator.walletAddress || creator.verifiedViews === 0) continue;

    const totalCreatorEarnings = creator.verifiedViews * creatorCpv;
    const finalAmount = totalCreatorEarnings * 0.8;

    const existingFinal = await prisma.payout.findFirst({
      where: {
        creatorProfileId: creator.creatorProfileId,
        type: "final",
        application: { campaignId },
      },
    });

    if (!existingFinal) {
      const application = await prisma.campaignApplication.findFirst({
        where: { campaignId, creatorProfileId: creator.creatorProfileId },
      });

      if (application) {
        const payout = await prisma.payout.create({
          data: {
            applicationId: application.id,
            creatorProfileId: creator.creatorProfileId,
            amount: finalAmount,
            walletAddress: creator.walletAddress,
            type: "final",
            status: "pending",
            verifiedViews: creator.verifiedViews,
          },
        });
        payoutsCreated.push(payout.id);
      }
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "completed" },
  });

  return NextResponse.json({
    report,
    payoutsCreated: payoutsCreated.length,
    totalVerifiedViews,
    totalCreatorPayout,
    totalAdminRevenue,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { report: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(campaign.report ?? null);
}
