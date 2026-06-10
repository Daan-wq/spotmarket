import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { invalidateAccountBanCache } from "@/lib/ban-evasion/store";
import { recordAccessSignals } from "@/lib/ban-evasion/store";
import { getIdentitySignalsForSupabaseUser } from "@/lib/ban-evasion/identity-signals";
import { collectIdentityObservations } from "@/lib/ban-evasion/enforcement";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  reason: z.string().trim().min(3).max(200),
  internalNote: z.string().trim().max(2000).optional(),
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
  const [admin, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { supabaseId: auth.userId },
      select: { id: true },
    }),
    prisma.creatorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            role: true,
            supabaseId: true,
          },
        },
      },
    }),
  ]);
  if (!admin) {
    return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
  }
  if (!profile || profile.user.role !== "creator") {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  const existing = await prisma.accountBan.findFirst({
    where: { userId: profile.user.id, liftedAt: null },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This creator already has an active ban." },
      { status: 409 },
    );
  }

  const ban = await prisma.accountBan.create({
    data: {
      userId: profile.user.id,
      reason: parsed.data.reason,
      internalNote: parsed.data.internalNote || null,
      bannedByUserId: admin.id,
    },
    select: {
      id: true,
      reason: true,
      internalNote: true,
      bannedAt: true,
    },
  });

  const supabase = createSupabaseAdminClient();
  const { error: authError } = await supabase.auth.admin.updateUserById(
    profile.user.supabaseId,
    { ban_duration: "876000h" },
  );
  if (authError) {
    console.error("[admin ban] Supabase ban sync failed", {
      userId: profile.user.id,
      code: authError.code,
    });
  }

  await invalidateAccountBanCache(profile.user.supabaseId);
  try {
    const identity = await getIdentitySignalsForSupabaseUser(
      profile.user.supabaseId,
    );
    const observations = collectIdentityObservations(identity.signals);
    if (observations.length > 0) {
      await recordAccessSignals({
        supabaseId: profile.user.supabaseId,
        userId: profile.user.id,
        source: "session",
        observations,
      });
    }
  } catch (signalError) {
    console.error("[admin ban] Failed to snapshot identity signals", signalError);
  }
  await logAudit({
    userId: admin.id,
    action: "CREATOR_ACCOUNT_BANNED",
    entityType: "AccountBan",
    entityId: ban.id,
    metadata: {
      creatorUserId: profile.user.id,
      reason: parsed.data.reason,
      authSynced: !authError,
    },
  });

  return NextResponse.json(
    { ban, authSynced: !authError },
    { status: 201 },
  );
}
