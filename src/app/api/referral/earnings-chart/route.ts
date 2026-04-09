import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
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

    // Get payouts for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const payouts = await prisma.referralPayout.findMany({
      where: {
        referrerId: user.id,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by month
    const monthlyMap = new Map<string, number>();

    // Pre-fill all 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, 0);
    }

    for (const p of payouts) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + parseFloat(p.amount.toString()));
    }

    const months = Array.from(monthlyMap.entries()).map(([month, earnings]) => ({
      month,
      earnings: Math.round(earnings * 100) / 100,
    }));

    return NextResponse.json({ months });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("[referral earnings-chart]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
