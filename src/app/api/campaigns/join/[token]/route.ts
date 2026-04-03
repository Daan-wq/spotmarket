import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Please sign in first" }, { status: 401 });

  const { token } = await params;

  const inviteLink = await prisma.campaignInviteLink.findUnique({
    where: { token },
    include: { campaign: true },
  });

  if (!inviteLink) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });

  if (inviteLink.expiresAt && new Date(inviteLink.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  if (inviteLink.maxUses !== null && inviteLink.usesCount >= inviteLink.maxUses) {
    return NextResponse.json({ error: "This invite link has reached its maximum uses" }, { status: 410 });
  }

  if (inviteLink.campaign.status !== "active") {
    return NextResponse.json({ error: "This campaign is not currently active" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });

  if (!user || !user.creatorProfile) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }

  const existing = await prisma.campaignApplication.findFirst({
    where: {
      campaignId: inviteLink.campaignId,
      creatorProfileId: user.creatorProfile.id,
    },
  });

  if (existing) {
    return NextResponse.json({ error: "You have already applied to this campaign" }, { status: 409 });
  }

  const [application] = await prisma.$transaction([
    prisma.campaignApplication.create({
      data: {
        campaignId: inviteLink.campaignId,
        creatorProfileId: user.creatorProfile.id,
        status: "pending",
        claimType: "APPLICATION",
      },
    }),
    prisma.campaignInviteLink.update({
      where: { id: inviteLink.id },
      data: { usesCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ success: true, applicationId: application.id });
}
