import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";

const patchSchema = z.object({
  status: z.enum(["processing", "sent", "confirmed", "failed", "disputed"]),
  txHash: z.string().trim().optional(),
  bankReference: z.string().trim().optional(),
  rejectionReason: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  const { userId } = await requireAuth("admin");
  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });

  const { payoutId } = await params;

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const now = new Date();
  const next = parsed.data;
  const bankReference = next.bankReference || payout.bankReference;
  const txHash = next.txHash || payout.txHash;
  const rejectionReason = next.rejectionReason;

  if (
    payout.paymentMethod === "BANK_TRANSFER" &&
    next.status === "confirmed" &&
    !bankReference
  ) {
    return NextResponse.json(
      { error: "Bank reference is required to mark this payout as paid." },
      { status: 400 },
    );
  }
  if (
    payout.paymentMethod === "CRYPTO" &&
    next.status === "confirmed" &&
    !txHash
  ) {
    return NextResponse.json(
      { error: "Transaction hash is required to mark this crypto payout as paid." },
      { status: 400 },
    );
  }
  if (next.status === "failed" && !rejectionReason) {
    return NextResponse.json(
      { error: "Internal rejection reason is required." },
      { status: 400 },
    );
  }

  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: next.status,
      ...(next.txHash && { txHash: next.txHash }),
      ...(next.bankReference && { bankReference: next.bankReference }),
      ...(next.status === "processing" && { initiatedAt: now }),
      ...(next.status === "sent" && { initiatedAt: now }),
      ...(next.status === "confirmed" && { confirmedAt: now, processedAt: now }),
      ...(next.status === "failed" && { processedAt: now, rejectionReason }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: `payout.${next.status}`,
      entityType: "Payout",
      entityId: payoutId,
      metadata: {
        txHash: next.txHash,
        bankReference: next.bankReference,
        rejectionReason,
        paymentMethod: payout.paymentMethod,
      },
    },
  });

  return NextResponse.json(updated);
}
