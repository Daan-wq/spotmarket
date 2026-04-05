import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { creatorProfile: { select: { id: true } } },
  });
  if (!user?.creatorProfile) return NextResponse.json({ error: "No creator profile" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") ?? "7d";

  let dateFilter: Date | undefined;
  if (period === "7d") dateFilter = new Date(Date.now() - 7 * 86400000);
  else if (period === "30d") dateFilter = new Date(Date.now() - 30 * 86400000);

  const creatorProfileId = user.creatorProfile.id;

  // Get all confirmed/sent payouts for this creator in the period
  const payouts = await prisma.payout.findMany({
    where: {
      creatorProfileId,
      status: { in: ["confirmed", "sent"] },
      ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
    },
    select: {
      amount: true,
      createdAt: true,
      verifiedViews: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Calculate total earnings
  const totalEarnings = payouts.reduce(
    (sum, p) => sum + parseFloat(p.amount.toString()),
    0
  );

  // Calculate total views
  const totalViews = payouts.reduce((sum, p) => sum + (p.verifiedViews ?? 0), 0);

  // Group by day to find best day and daily average
  const dailyEarnings = new Map<string, number>();
  for (const p of payouts) {
    const day = p.createdAt.toISOString().slice(0, 10);
    dailyEarnings.set(day, (dailyEarnings.get(day) ?? 0) + parseFloat(p.amount.toString()));
  }

  let bestDay: { date: string; amount: number } | null = null;
  for (const [date, amount] of dailyEarnings) {
    if (!bestDay || amount > bestDay.amount) {
      bestDay = { date, amount };
    }
  }

  // Days in period for daily average
  const daysInPeriod = period === "7d" ? 7 : period === "30d" ? 30 : dailyEarnings.size || 1;
  const dailyAverage = totalEarnings / daysInPeriod;

  return NextResponse.json({
    period,
    totalEarnings,
    totalViews,
    bestDay,
    dailyAverage,
    daysWithEarnings: dailyEarnings.size,
  });
}
