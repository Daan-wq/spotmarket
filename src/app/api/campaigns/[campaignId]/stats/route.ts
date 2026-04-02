import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      totalBudget: true,
      businessCpv: true,
      goalViews: true,
      status: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Aggregate views and earnings across all application pages
  const aggregate = await prisma.campaignApplicationPage.aggregate({
    where: { application: { campaignId } },
    _sum: { totalViews: true, earnedAmount: true },
  });

  const totalViews = aggregate._sum.totalViews ?? 0;
  const totalCreatorEarnings = aggregate._sum.earnedAmount ?? 0; // in cents

  const businessCpv = Number(campaign.businessCpv);
  const totalBudget = Number(campaign.totalBudget);
  const goalViews = campaign.goalViews ? Number(campaign.goalViews) : null;

  // Business spend = views * businessCpv (convert to dollars from cents equivalent)
  const totalSpend = totalViews * businessCpv;
  const remainingBudget = Math.max(0, totalBudget - totalSpend);
  const remainingViews = goalViews ? Math.max(0, goalViews - totalViews) : null;
  const percentComplete = goalViews && goalViews > 0
    ? Math.min(100, Math.round((totalViews / goalViews) * 100))
    : totalBudget > 0
      ? Math.min(100, Math.round((totalSpend / totalBudget) * 100))
      : 0;

  // Calculate daily view rate from last 7 days of snapshots
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSnapshots = await prisma.viewSnapshot.findMany({
    where: {
      post: { application: { campaignId } },
      capturedAt: { gte: sevenDaysAgo },
    },
    orderBy: { capturedAt: "asc" },
    select: { viewsCount: true, capturedAt: true },
  });

  let dailyViewRate = 0;
  if (recentSnapshots.length >= 2) {
    const first = recentSnapshots[0];
    const last = recentSnapshots[recentSnapshots.length - 1];
    const daysDiff = (last.capturedAt.getTime() - first.capturedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      dailyViewRate = Math.round((last.viewsCount - first.viewsCount) / daysDiff);
    }
  }

  const estimatedDaysRemaining = dailyViewRate > 0 && remainingViews !== null
    ? Math.ceil(remainingViews / dailyViewRate)
    : null;

  return NextResponse.json({
    campaignId,
    status: campaign.status,
    totalBudget,
    totalSpend: Math.round(totalSpend * 100) / 100,
    remainingBudget: Math.round(remainingBudget * 100) / 100,
    totalViews,
    goalViews,
    remainingViews,
    percentComplete,
    totalCreatorEarnings,
    dailyViewRate,
    estimatedDaysRemaining,
  });
}
