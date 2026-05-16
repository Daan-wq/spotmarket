import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getCreatorPaymentSummary } from "@/lib/creator-payment-summary";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: {
        id: true,
        creatorProfile: { select: { id: true, tronsAddress: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [wallet, summary] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId: user.id },
        include: {
          withdrawals: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      user.creatorProfile
        ? getCreatorPaymentSummary(user.id, user.creatorProfile.id)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      balance: summary?.availableBalance ?? 0,
      availableBalance: summary?.availableBalance ?? 0,
      tronsAddress: user.creatorProfile?.tronsAddress ?? null,
      totalEarnings: summary?.totalEarned ?? 0,
      settledEarnings: summary?.totalEarned ?? 0,
      estimatedEarnings: 0,
      withdrawals: wallet?.withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        status: w.status,
        txHash: w.txHash,
        createdAt: w.createdAt,
      })) ?? [],
    });
  } catch (err: unknown) {
    console.error("[wallet GET]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
