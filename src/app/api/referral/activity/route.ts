import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("creator");

    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = req.nextUrl;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    // Fetch signups and earnings in parallel
    const [signups, payouts] = await Promise.all([
      prisma.user.findMany({
        where: { referredBy: user.id },
        select: {
          id: true,
          email: true,
          createdAt: true,
          creatorProfile: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.referralPayout.findMany({
        where: { referrerId: user.id },
        select: {
          id: true,
          referredUserId: true,
          amount: true,
          status: true,
          createdAt: true,
          campaignApplicationId: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Build referred user display name map
    const referredUserMap = new Map(
      signups.map((s) => [s.id, s.creatorProfile?.displayName ?? s.email.split("@")[0]])
    );

    // Merge into unified timeline
    type Activity = {
      type: "signup" | "earning";
      timestamp: Date;
      referredUserName: string;
      amount?: number;
      status?: string;
    };

    const activities: Activity[] = [
      ...signups.map((s) => ({
        type: "signup" as const,
        timestamp: s.createdAt,
        referredUserName: s.creatorProfile?.displayName ?? s.email.split("@")[0],
      })),
      ...payouts.map((p) => ({
        type: "earning" as const,
        timestamp: p.createdAt,
        referredUserName: referredUserMap.get(p.referredUserId) ?? "Unknown",
        amount: parseFloat(p.amount.toString()),
        status: p.status,
      })),
    ];

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const paginated = activities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: paginated,
      total: activities.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("[referral activity]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
