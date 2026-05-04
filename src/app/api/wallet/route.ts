import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getCreatorTotalEarnings } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [wallet, earnings] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId: user.id },
        include: {
          withdrawals: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
      getCreatorTotalEarnings(user.id),
    ]);

    return NextResponse.json({
      balance: wallet ? Number(wallet.balance) : 0,
      totalEarnings: earnings.total,
      settledEarnings: earnings.settled,
      estimatedEarnings: earnings.estimated,
      withdrawals: wallet?.withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        status: w.status,
        txHash: w.txHash,
        createdAt: w.createdAt,
      })) ?? [],
    });
  } catch (err: any) {
    console.error("[wallet GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
