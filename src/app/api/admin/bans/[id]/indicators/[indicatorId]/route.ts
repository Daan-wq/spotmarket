import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; indicatorId: string }>;
  },
) {
  let auth: Awaited<ReturnType<typeof requireAuth>>;
  try {
    auth = await requireAuth("admin");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 403 },
    );
  }

  const { id, indicatorId } = await params;
  const [admin, indicator] = await Promise.all([
    prisma.user.findUnique({
      where: { supabaseId: auth.userId },
      select: { id: true },
    }),
    prisma.banIndicator.findFirst({
      where: {
        id: indicatorId,
        accountBanId: id,
        deactivatedAt: null,
        accountBan: { liftedAt: null },
      },
      select: { id: true, type: true },
    }),
  ]);
  if (!admin) {
    return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
  }
  if (!indicator) {
    return NextResponse.json({ error: "Indicator not found." }, { status: 404 });
  }

  await prisma.banIndicator.delete({ where: { id: indicator.id } });
  await logAudit({
    userId: admin.id,
    action: "BAN_INDICATOR_REMOVED",
    entityType: "AccountBan",
    entityId: id,
    metadata: { indicatorId: indicator.id, type: indicator.type },
  });

  return NextResponse.json({ success: true });
}
