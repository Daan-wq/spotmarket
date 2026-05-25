import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { buildAppUrl, getAppUrlFromRequest } from "@/lib/app-url";

export async function GET(req: Request) {
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

    const [totalInvited, earnedResult, pendingReviewResult, thisMonthResult] = await Promise.all([
      prisma.user.count({ where: { referredBy: user.id } }),
      prisma.referralPayout.aggregate({
        where: { referrerId: user.id, status: "pending" },
        _sum: { amount: true },
      }),
      prisma.referralPayout.aggregate({
        where: { referrerId: user.id, status: "pending_review" },
        _sum: { amount: true },
      }),
      prisma.referralPayout.aggregate({
        where: {
          referrerId: user.id,
          status: "pending",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      totalInvited,
      totalEarnings: parseFloat(earnedResult._sum.amount?.toString() ?? "0"),
      earnedCommission: parseFloat(earnedResult._sum.amount?.toString() ?? "0"),
      pendingEarnings: parseFloat(earnedResult._sum.amount?.toString() ?? "0"),
      pendingCommission: parseFloat(pendingReviewResult._sum.amount?.toString() ?? "0"),
      pendingReviewCommission: parseFloat(pendingReviewResult._sum.amount?.toString() ?? "0"),
      thisMonthEarnings: parseFloat(thisMonthResult._sum.amount?.toString() ?? "0"),
      referralCode: user.referralCode,
      referralUrl: buildAppUrl(`/sign-up?ref=${user.referralCode}`, getAppUrlFromRequest(req)),
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
