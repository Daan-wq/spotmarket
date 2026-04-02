import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ userId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: targetUserId } = await params;

  const follower = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { creatorProfile: { select: { displayName: true, avatarUrl: true } } },
  });
  if (!follower) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (follower.id === targetUserId) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: follower.id, followingId: targetUserId } },
  });
  if (existing) return NextResponse.json({ ok: true, following: true });

  await prisma.follow.create({ data: { followerId: follower.id, followingId: targetUserId } });

  const followerName = follower.creatorProfile?.displayName ?? follower.email;
  await createNotification(targetUserId, "NEW_FOLLOWER", {
    followerId: follower.id,
    followerName,
    followerAvatarUrl: follower.creatorProfile?.avatarUrl ?? null,
  });

  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: targetUserId } = await params;

  const follower = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!follower) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.follow.deleteMany({
    where: { followerId: follower.id, followingId: targetUserId },
  });

  return NextResponse.json({ ok: true, following: false });
}
