import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  accessSignalId: z.string().min(1),
  mode: z.enum(["LAYERED", "HARD"]).default("LAYERED"),
  acknowledgeSharedIpRisk: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id } = await params;
  const [admin, ban] = await Promise.all([
    prisma.user.findUnique({
      where: { supabaseId: auth.userId },
      select: { id: true },
    }),
    prisma.accountBan.findUnique({
      where: { id },
      select: {
        id: true,
        liftedAt: true,
        user: { select: { id: true, supabaseId: true } },
      },
    }),
  ]);
  if (!admin) {
    return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
  }
  if (!ban || ban.liftedAt) {
    return NextResponse.json({ error: "Active ban not found." }, { status: 404 });
  }

  const signal = await prisma.accessSignal.findFirst({
    where: {
      id: parsed.data.accessSignalId,
      expiresAt: { gt: new Date() },
      OR: [
        { userId: ban.user.id },
        { supabaseId: ban.user.supabaseId },
      ],
    },
    select: {
      id: true,
      type: true,
      valueHash: true,
      maskedValue: true,
    },
  });
  if (!signal) {
    return NextResponse.json({ error: "Signal not found." }, { status: 404 });
  }

  if (parsed.data.mode === "HARD") {
    const validOverride =
      signal.type === "IP" &&
      parsed.data.acknowledgeSharedIpRisk === true &&
      (parsed.data.reason?.length ?? 0) >= 10;
    if (!validOverride) {
      return NextResponse.json(
        {
          error:
            "A hard IP ban requires the shared-network warning and a motivation.",
        },
        { status: 400 },
      );
    }
  }

  const existing = await prisma.banIndicator.findFirst({
    where: {
      accountBanId: ban.id,
      type: signal.type,
      valueHash: signal.valueHash,
      deactivatedAt: null,
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This signal is already active." },
      { status: 409 },
    );
  }

  const indicator = await prisma.banIndicator.create({
    data: {
      accountBanId: ban.id,
      type: signal.type,
      valueHash: signal.valueHash,
      maskedValue: signal.maskedValue,
      strength: signal.type === "IP" ? "WEAK" : "STRONG",
      mode: parsed.data.mode,
      reason: parsed.data.reason || null,
      createdByUserId: admin.id,
    },
    select: {
      id: true,
      type: true,
      strength: true,
      mode: true,
      maskedValue: true,
      createdAt: true,
    },
  });

  await logAudit({
    userId: admin.id,
    action:
      parsed.data.mode === "HARD"
        ? "BAN_HARD_IP_INDICATOR_ADDED"
        : "BAN_INDICATOR_ADDED",
    entityType: "BanIndicator",
    entityId: indicator.id,
    metadata: {
      accountBanId: ban.id,
      type: signal.type,
      mode: parsed.data.mode,
    },
  });

  return NextResponse.json({ indicator }, { status: 201 });
}
