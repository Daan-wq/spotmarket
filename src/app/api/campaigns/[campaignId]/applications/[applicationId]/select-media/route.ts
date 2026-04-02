import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const selectMediaSchema = z.object({
  socialAccountId: z.string(),
  mediaId: z.string(),
  postUrl: z.string().url(),
  platformPostId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; applicationId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, applicationId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, creatorProfile: { select: { id: true } } },
  });
  if (!user?.creatorProfile) return NextResponse.json({ error: "Creator profile required" }, { status: 403 });

  const application = await prisma.campaignApplication.findUnique({
    where: { id: applicationId },
    select: { campaignId: true, creatorProfileId: true, status: true },
  });

  if (!application || application.campaignId !== campaignId) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.creatorProfileId !== user.creatorProfile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["approved", "active"].includes(application.status)) {
    return NextResponse.json({ error: "Application must be approved to submit posts" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = selectMediaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { socialAccountId, platformPostId, postUrl } = parsed.data;

  // Verify social account belongs to this creator
  const socialAccount = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: { id: true, creatorProfileId: true, platform: true },
  });

  if (!socialAccount || socialAccount.creatorProfileId !== user.creatorProfile.id) {
    return NextResponse.json({ error: "Social account not found" }, { status: 404 });
  }

  // Check if post was already submitted
  const existing = await prisma.campaignPost.findFirst({
    where: { applicationId, platformPostId },
  });
  if (existing) {
    return NextResponse.json({ error: "This post has already been submitted" }, { status: 409 });
  }

  // Find or create CampaignApplicationPage
  let appPage = await prisma.campaignApplicationPage.findUnique({
    where: { applicationId_socialAccountId: { applicationId, socialAccountId } },
  });
  if (!appPage) {
    appPage = await prisma.campaignApplicationPage.create({
      data: { applicationId, socialAccountId },
    });
  }

  const post = await prisma.campaignPost.create({
    data: {
      applicationId,
      socialAccountId,
      postUrl,
      platformPostId,
      platform: socialAccount.platform,
      sourceType: "CACHED_POST",
      status: "submitted",
      autoApproveAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      campaignAppPageId: appPage.id,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
