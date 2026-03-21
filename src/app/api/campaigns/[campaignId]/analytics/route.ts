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
    include: {
      creatorProfile: { select: { id: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const isAdmin = user.role === "admin";

  let isApprovedCreator = false;
  if (user.role === "creator" && user.creatorProfile) {
    const app = await prisma.campaignApplication.findFirst({
      where: {
        campaignId,
        creatorProfileId: user.creatorProfile.id,
        status: { in: ["approved", "active", "completed"] },
      },
    });
    isApprovedCreator = !!app;
  }

  if (!isAdmin && !isApprovedCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshots = await prisma.viewSnapshot.findMany({
    where: {
      post: {
        application: { campaignId },
      },
    },
    orderBy: { capturedAt: "asc" },
    select: {
      capturedAt: true,
      viewsCount: true,
      reach: true,
    },
  });

  const byDay: Record<string, { views: number; reach: number }> = {};
  for (const s of snapshots) {
    const day = s.capturedAt.toISOString().substring(0, 10);
    if (!byDay[day]) byDay[day] = { views: 0, reach: 0 };
    byDay[day].views += s.viewsCount;
    byDay[day].reach += s.reach ?? 0;
  }

  const chartData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { views, reach }]) => ({ date, views, reach }));

  const totalViews = chartData.reduce((sum, d) => sum + d.views, 0);
  const totalReach = chartData.reduce((sum, d) => sum + d.reach, 0);

  return NextResponse.json({ chartData, totalViews, totalReach });
}
