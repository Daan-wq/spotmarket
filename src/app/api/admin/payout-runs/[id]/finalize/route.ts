import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const run = await prisma.payoutRun.update({
      where: { id },
      data: { status: "FINALIZED", finalizedAt: new Date() },
      include: { items: true },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "payoutRun.finalize",
        entityType: "PayoutRun",
        entityId: id,
        metadata: { itemCount: run.items.length },
      },
    });
    return NextResponse.json(serialize(run));
  } catch (error) {
    return jsonError(error, "[POST /api/admin/payout-runs/[id]/finalize]");
  }
}
