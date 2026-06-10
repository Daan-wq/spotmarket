import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { invalidateAccountBanCache } from "@/lib/ban-evasion/store";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  liftReason: z.string().trim().min(3).max(1000),
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
  if (!ban) {
    return NextResponse.json({ error: "Ban not found." }, { status: 404 });
  }
  if (ban.liftedAt) {
    return NextResponse.json(
      { error: "This ban has already been lifted." },
      { status: 409 },
    );
  }

  const now = new Date();
  const lifted = await prisma.$transaction(async (tx) => {
    await tx.banIndicator.deleteMany({ where: { accountBanId: ban.id } });
    return tx.accountBan.update({
      where: { id: ban.id },
      data: {
        liftedAt: now,
        liftedByUserId: admin.id,
        liftReason: parsed.data.liftReason,
      },
      select: { id: true, liftedAt: true },
    });
  });

  const supabase = createSupabaseAdminClient();
  const { error: authError } = await supabase.auth.admin.updateUserById(
    ban.user.supabaseId,
    { ban_duration: "none" },
  );
  if (authError) {
    console.error("[admin unban] Supabase unban sync failed", {
      userId: ban.user.id,
      code: authError.code,
    });
  }

  await invalidateAccountBanCache(ban.user.supabaseId);
  await logAudit({
    userId: admin.id,
    action: "CREATOR_ACCOUNT_UNBANNED",
    entityType: "AccountBan",
    entityId: ban.id,
    metadata: {
      creatorUserId: ban.user.id,
      liftReason: parsed.data.liftReason,
      authSynced: !authError,
    },
  });

  return NextResponse.json({ ban: lifted, authSynced: !authError });
}
