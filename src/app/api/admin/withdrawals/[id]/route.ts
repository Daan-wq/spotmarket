import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PROCESSING", "SENT", "CONFIRMED", "REJECTED"]),
  txHash: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;

    const body = await req.json();
    const { status, txHash } = updateSchema.parse(body);

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const wr = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status,
          txHash: txHash ?? undefined,
          processedBy: userId,
          processedAt: status === "SENT" || status === "CONFIRMED" ? new Date() : undefined,
        },
      });

      // If rejected, refund the balance
      if (status === "REJECTED") {
        await tx.wallet.update({
          where: { id: withdrawal.walletId },
          data: { balance: { increment: Number(withdrawal.amount) } },
        });
      }

      // Notify creator
      if (status === "SENT" || status === "CONFIRMED") {
        await tx.notification.create({
          data: {
            userId: withdrawal.wallet.userId,
            type: "WITHDRAWAL_PROCESSED",
            data: {
              amount: Number(withdrawal.amount),
              status,
              txHash: txHash ?? null,
            },
          },
        });
      }

      return wr;
    });

    return NextResponse.json({ withdrawal: updated });
  } catch (err: any) {
    console.error("[admin withdrawal PATCH]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
