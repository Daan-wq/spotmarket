import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const withdrawSchema = z.object({
  walletAddress: z.string().min(1, "Wallet address is required"),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json();
    const { walletAddress } = withdrawSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { id: true, creatorProfile: { select: { tronsAddress: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || Number(wallet.balance) < 50) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is $50" },
        { status: 400 }
      );
    }

    // Check for pending withdrawal
    const pendingWithdrawal = await prisma.withdrawalRequest.findFirst({
      where: { walletId: wallet.id, status: "PENDING" },
    });

    if (pendingWithdrawal) {
      return NextResponse.json(
        { error: "You already have a pending withdrawal request" },
        { status: 400 }
      );
    }

    const amount = Number(wallet.balance);

    const withdrawal = await prisma.$transaction(async (tx) => {
      // Create withdrawal request for full balance
      const wr = await tx.withdrawalRequest.create({
        data: {
          walletId: wallet.id,
          amount,
          walletAddress,
          network: "TRC-20",
          currency: "USDT",
          status: "PENDING",
        },
      });

      // Deduct from wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      return wr;
    });

    return NextResponse.json({
      withdrawal: {
        id: withdrawal.id,
        amount: Number(withdrawal.amount),
        status: withdrawal.status,
        network: withdrawal.network,
        currency: withdrawal.currency,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("[wallet withdraw]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
