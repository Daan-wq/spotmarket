import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getCreatorPaymentSummary } from "@/lib/creator-payment-summary";

export async function GET() {
  try {
    const { userId } = await requireAuth("creator");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: {
        id: true,
        creatorProfile: {
          select: {
            id: true,
            payoutIban: true,
            payoutAccountName: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [payouts, summary] = await Promise.all([
      user.creatorProfile
        ? prisma.payout.findMany({
          where: { creatorProfileId: user.creatorProfile.id },
          orderBy: { requestedAt: "desc" },
          take: 20,
          select: {
            id: true,
            amount: true,
            status: true,
            currency: true,
            paymentMethod: true,
            bankIbanSnapshot: true,
            bankAccountNameSnapshot: true,
            bankReference: true,
            requestedAt: true,
            createdAt: true,
          },
        })
        : Promise.resolve([]),
      user.creatorProfile
        ? getCreatorPaymentSummary(user.id, user.creatorProfile.id)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      balance: summary?.availableBalance ?? 0,
      availableBalance: summary?.availableBalance ?? 0,
      pendingBalance: summary?.pendingPayout ?? 0,
      profit: summary?.profit ?? 0,
      payoutIban: user.creatorProfile?.payoutIban ?? null,
      payoutAccountName: user.creatorProfile?.payoutAccountName ?? null,
      totalEarnings: summary?.totalEarned ?? 0,
      settledEarnings: summary?.totalEarned ?? 0,
      estimatedEarnings: 0,
      withdrawals: payouts.map((payout) => ({
        id: payout.id,
        amount: Number(payout.amount),
        status: payout.status,
        currency: payout.currency,
        paymentMethod: payout.paymentMethod,
        bankIban: payout.bankIbanSnapshot,
        bankAccountName: payout.bankAccountNameSnapshot,
        bankReference: payout.bankReference,
        createdAt: payout.requestedAt ?? payout.createdAt,
      })),
    });
  } catch (err: unknown) {
    console.error("[wallet GET]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
