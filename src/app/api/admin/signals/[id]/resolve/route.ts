import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;

    const existing = await prisma.submissionSignal.findUnique({
      where: { id },
      select: { id: true, resolvedAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }
    if (existing.resolvedAt) {
      return NextResponse.json({ ok: true, alreadyResolved: true });
    }

    await prisma.submissionSignal.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedBy: userId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin signal resolve] error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
