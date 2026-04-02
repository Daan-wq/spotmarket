import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ igAccountId: string }> },
) {
  try {
    const { igAccountId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    // Verify account belongs to creator
    const account = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    const schedules = await prisma.postSchedule.findMany({
      where: { igAccountId },
      include: {
        campaign: {
          select: { id: true, name: true, status: true, bannerUrl: true },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
    });

    // Get recent executions for each schedule (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const executions = await prisma.scheduleExecution.findMany({
      where: {
        scheduleId: { in: schedules.map((s) => s.id) },
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Group executions by schedule
    const executionsBySchedule: Record<string, typeof executions> = {};
    for (const exec of executions) {
      if (!executionsBySchedule[exec.scheduleId]) {
        executionsBySchedule[exec.scheduleId] = [];
      }
      executionsBySchedule[exec.scheduleId].push(exec);
    }

    return NextResponse.json({
      schedules: schedules.map((s) => ({
        ...s,
        recentExecutions: executionsBySchedule[s.id] || [],
      })),
    });
  } catch (error) {
    console.error("GET /schedules/[igAccountId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
