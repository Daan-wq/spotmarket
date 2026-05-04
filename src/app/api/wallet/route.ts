import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      include: {
        withdrawals: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return NextResponse.json({
      balance: wallet ? Number(wallet.balance) : 0,
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
