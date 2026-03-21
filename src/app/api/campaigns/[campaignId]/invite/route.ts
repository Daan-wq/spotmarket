import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteSchema = z.object({ creatorProfileId: z.string() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { id: parsed.data.creatorProfileId },
    include: { socialAccounts: { where: { isActive: true } } },
  });
  if (!creatorProfile) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

  const existing = await prisma.campaignApplication.findFirst({
    where: { campaignId, creatorProfileId: parsed.data.creatorProfileId },
  });

  if (existing && ["approved", "active", "completed"].includes(existing.status)) {
    return NextResponse.json({ error: "Creator already approved for this campaign" }, { status: 409 });
  }

  const igAccount = creatorProfile.socialAccounts[0];

  const application = existing
    ? await prisma.campaignApplication.update({
        where: { id: existing.id },
        data: { status: "approved", reviewedAt: new Date(), reviewNotes: "Invited by admin", followerSnapshot: igAccount?.followerCount ?? null, engagementSnapshot: igAccount?.engagementRate ?? null },
      })
    : await prisma.campaignApplication.create({
        data: { campaignId, creatorProfileId: parsed.data.creatorProfileId, status: "approved", reviewedAt: new Date(), reviewNotes: "Invited by admin", followerSnapshot: igAccount?.followerCount ?? null, engagementSnapshot: igAccount?.engagementRate ?? null },
      });

  return NextResponse.json(application, { status: 201 });
}
