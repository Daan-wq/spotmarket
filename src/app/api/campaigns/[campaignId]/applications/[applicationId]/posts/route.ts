import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitPostSchema = z.object({
  postUrl: z.string().url("Must be a valid URL"),
  platformPostId: z.string().min(1, "Platform post ID is required"),
  platform: z.enum(["instagram", "tiktok"]),
  socialAccountId: z.string(),
});

function parseInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string; applicationId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await params;

  const posts = await prisma.campaignPost.findMany({
    where: { applicationId },
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(posts);
}

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
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const application = await prisma.campaignApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application || application.campaignId !== campaignId) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const isAdmin = user.role === "admin";
  const isOwner = application.creatorProfileId === user.creatorProfile?.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["approved", "active"].includes(application.status)) {
    return NextResponse.json(
      { error: "Can only submit posts for approved applications" },
      { status: 400 }
    );
  }

  const body = await req.json();

  let parsed = submitPostSchema.safeParse(body);
  if (!parsed.success && body.postUrl) {
    const igId = parseInstagramPostId(body.postUrl);
    if (igId && !body.platformPostId) {
      parsed = submitPostSchema.safeParse({ ...body, platformPostId: igId, platform: "instagram" });
    }
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const socialAccount = await prisma.socialAccount.findUnique({
    where: { id: parsed.data.socialAccountId },
  });

  if (!socialAccount) {
    return NextResponse.json({ error: "Social account not found" }, { status: 404 });
  }

  if (!isAdmin && socialAccount.creatorProfileId !== user.creatorProfile?.id) {
    return NextResponse.json({ error: "Social account does not belong to you" }, { status: 403 });
  }

  const existingPost = await prisma.campaignPost.findFirst({
    where: { applicationId, platformPostId: parsed.data.platformPostId },
  });
  if (existingPost) {
    return NextResponse.json({ error: "Post already submitted" }, { status: 409 });
  }

  const post = await prisma.campaignPost.create({
    data: {
      applicationId,
      socialAccountId: parsed.data.socialAccountId,
      postUrl: parsed.data.postUrl,
      platformPostId: parsed.data.platformPostId,
      platform: parsed.data.platform,
      isApproved: true,
    },
  });

  if (application.status === "approved") {
    await prisma.campaignApplication.update({
      where: { id: applicationId },
      data: { status: "active" },
    });
  }

  return NextResponse.json(post, { status: 201 });
}
