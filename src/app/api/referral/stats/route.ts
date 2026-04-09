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
      select: { id: true, referralCode: true, referralEarnings: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [totalInvited, pendingResult, thisMonthResult] = await Promise.all([
      prisma.user.count({ where: { referredBy: user.id } }),
      prisma.referralPayout.aggregate({
        where: { referrerId: user.id, status: "pending" },
        _sum: { amount: true },
      }),
      prisma.referralPayout.aggregate({
        where: {
          referrerId: user.id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.clipprofit.com";

    return NextResponse.json({
      totalInvited,
      totalEarnings: parseFloat(user.referralEarnings.toString()),
      pendingEarnings: parseFloat(pendingResult._sum.amount?.toString() ?? "0"),
      thisMonthEarnings: parseFloat(thisMonthResult._sum.amount?.toString() ?? "0"),
      referralCode: user.referralCode,
      referralUrl: `${baseUrl}/sign-up?ref=${user.referralCode}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("[referral stats]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
