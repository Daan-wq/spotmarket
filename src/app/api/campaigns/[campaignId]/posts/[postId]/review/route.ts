import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "@/lib/realtime";

const reviewSchema = z.object({
  action: z.enum(["approve", "decline"]),
  reason: z.string().max(2000).optional(),
  comment: z.string().max(2000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; postId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, postId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, role: true, advertiserProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  const isAdvertiser = user.role === "advertiser" && !!user.advertiserProfile;

  if (!isAdmin && !isAdvertiser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { action, reason, comment } = parsed.data;

  // Validate decline requires reason
  if (action === "decline" && !reason) {
    return NextResponse.json({ error: "Decline reason is required" }, { status: 400 });
  }

  const post = await prisma.campaignPost.findUnique({
    where: { id: postId },
    include: {
      application: {
        include: { campaign: { select: { id: true, advertiserId: true, name: true } } },
      },
    },
  });

  if (!post || post.application.campaign.id !== campaignId) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Advertiser can only review their own campaigns
  if (isAdvertiser && post.application.campaign.advertiserId !== user.advertiserProfile!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Determine new status based on role and action
  let newStatus: string;
  const updateData: Record<string, unknown> = {};

  if (isAdvertiser) {
    if (action === "approve") {
      newStatus = "brand_approved";
      updateData.brandReviewedBy = user.id;
      updateData.brandReviewedAt = new Date();
    } else {
      newStatus = "brand_rejected";
      updateData.brandReviewedBy = user.id;
      updateData.brandReviewedAt = new Date();
      updateData.brandDeclineReason = reason;
    }
  } else {
    // Admin
    if (action === "approve") {
      newStatus = "approved";
      updateData.adminReviewedBy = user.id;
      updateData.approvedAt = new Date();
      updateData.isApproved = true;
    } else {
      newStatus = "rejected";
      updateData.adminReviewedBy = user.id;
      updateData.adminDeclineReason = reason;
    }
  }

  const updated = await prisma.campaignPost.update({
    where: { id: postId },
    data: { status: newStatus as "submitted" | "brand_approved" | "brand_rejected" | "approved" | "rejected", ...updateData },
  });

  // Add comment if provided
  if (comment) {
    await prisma.postComment.create({
      data: { postId, authorId: user.id, content: comment },
    });
  }

  // Auto-create decline notice message
  if (action === "decline") {
    // Find the creator's user ID through the application
    const creatorUser = post.application.creatorProfileId
      ? await prisma.creatorProfile.findUnique({
          where: { id: post.application.creatorProfileId },
          select: { userId: true },
        })
      : null;

    if (creatorUser) {
      await prisma.message.create({
        data: {
          campaignId,
          senderId: user.id,
          recipientId: creatorUser.userId,
          content: `Your post submission was declined. Reason: ${reason}`,
          type: "DECLINE_NOTICE",
          postId,
        },
      });
    }
  }

  // Broadcast review event
  try {
    await broadcast(
      realtimeChannel.campaign(campaignId),
      REALTIME_EVENTS.POST_REVIEWED,
      { postId, campaignId, action, newStatus, reviewerRole: isAdmin ? "admin" : "advertiser" }
    );
  } catch {
    // Non-critical
  }

  return NextResponse.json({
    post: { ...updated, status: newStatus },
    message: action === "approve" ? "Post approved" : "Post declined",
  });
}
