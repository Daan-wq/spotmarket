import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";

const paidSchema = z.object({
  proofUrl: z.string().url().optional().nullable(),
  paymentMethod: z.enum(["CRYPTO", "STRIPE"]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const data = paidSchema.parse(await req.json().catch(() => ({})));
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.payoutRun.findUnique({
        where: { id },
        include: { items: { include: { payout: true } } },
      });
      if (!run) throw new Error("Payout run not found");

      for (const item of run.items) {
        if (!item.creatorProfileId || item.payout) continue;
        await tx.payout.create({
          data: {
            creatorProfileId: item.creatorProfileId,
            payoutRunId: run.id,
            payoutRunItemId: item.id,
            amount: item.total,
            currency: run.currency,
            status: "confirmed",
            type: "final",
            paymentMethod: data.paymentMethod,
            periodStart: run.periodStart,
            periodEnd: run.periodEnd,
            applicationIds: [],
            initiatedAt: now,
            processedAt: now,
            confirmedAt: now,
          },
        });
      }

      const updated = await tx.payoutRun.update({
        where: { id },
        data: { status: "CONFIRMED", paidAt: now, proofUrl: data.proofUrl },
        include: { items: { include: { payout: true } } },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "payoutRun.markPaid",
          entityType: "PayoutRun",
          entityId: id,
          metadata: { proofUrl: data.proofUrl },
        },
      });

      return updated;
    });

    return NextResponse.json(serialize(result));
  } catch (error) {
    if (error instanceof Error && error.message === "Payout run not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return jsonError(error, "[POST /api/admin/payout-runs/[id]/mark-paid]");
  }
}
