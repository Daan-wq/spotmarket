import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address").or(z.literal("")).optional(),
  tronsAddress: z.string().regex(/^T[1-9A-HJ-NP-Z]{33}$/, "Invalid Tron address").or(z.literal("")).optional(),
  primaryGeo: z.string().length(2).toUpperCase().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    include: { socialAccounts: { select: { platform: true, platformUsername: true, followerCount: true, engagementRate: true, audienceGeo: true, lastSyncedAt: true, isActive: true } } },
  });
  if (!profile) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id }, select: { role: true } });
  return NextResponse.json({ ...profile, walletAddress: user?.role === "admin" ? profile.walletAddress : undefined });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  const isOwner = user.creatorProfile?.id === creatorId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { walletAddress, tronsAddress, ...rest } = parsed.data;
  const updated = await prisma.creatorProfile.update({
    where: { id: creatorId },
    data: {
      ...rest,
      ...(walletAddress !== undefined && { walletAddress: walletAddress === "" ? null : walletAddress }),
      ...(tronsAddress !== undefined && { tronsAddress: tronsAddress === "" ? null : tronsAddress }),
    },
  });
  return NextResponse.json(updated);
}
