import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { autopostRenderQueue } from "@/lib/queue-client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, API_LIMIT, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  rawVideoKey: z.string().min(1),
  campaignId: z.string().min(1),
  igAccountId: z.string().min(1),
  overlayPosition: z.enum([
    "TOP_LEFT",
    "TOP_CENTER",
    "TOP_RIGHT",
    "MIDDLE_LEFT",
    "CENTER",
    "MIDDLE_RIGHT",
    "BOTTOM_LEFT",
    "BOTTOM_CENTER",
    "BOTTOM_RIGHT",
  ]),
  overlaySize: z.enum(["SMALL", "MEDIUM", "LARGE"]),
  caption: z.string().min(1).max(2200),
  postType: z.enum(["FEED", "REEL", "STORY"]),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success, headers: rlHeaders } = rateLimit(`autopost_submit_${ip}`, API_LIMIT);
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rlHeaders },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, role: true, creatorProfile: { select: { id: true } } },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const {
      rawVideoKey,
      campaignId,
      igAccountId,
      overlayPosition,
      overlaySize,
      caption,
      postType,
      scheduledAt,
    } = parsed.data;

    // Verify campaign is active
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        status: true,
        contentGuidelines: true,
      },
    });

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status !== "active") {
      return NextResponse.json({ error: "Campaign not active" }, { status: 400 });
    }

    // Verify application exists and is approved
    const application = await prisma.campaignApplication.findFirst({
      where: {
        campaignId,
        creatorProfileId: user.creatorProfile.id,
        status: "approved",
      },
      select: { id: true },
    });

    if (!application) {
      return NextResponse.json({ error: "No approved application for this campaign" }, { status: 403 });
    }

    // Verify social account belongs to creator
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });

    if (!socialAccount || socialAccount.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Social account not found" }, { status: 403 });
    }

    // Parse hashtags from contentGuidelines and append missing ones
    let finalCaption = caption;
    if (campaign.contentGuidelines) {
      const hashtagRegex = /#\w+/g;
      const requiredHashtags = campaign.contentGuidelines.match(hashtagRegex) || [];
      const captionHashtags = caption.match(hashtagRegex) || [];
      const captionHashtagSet = new Set(captionHashtags);

      const missingHashtags = requiredHashtags.filter((tag) => !captionHashtagSet.has(tag));
      if (missingHashtags.length > 0) {
        finalCaption = caption + " " + missingHashtags.join(" ");
      }
    }

    // Create scheduled post (using raw connection since model might be new)
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        creatorId: user.id,
        campaignId,
        igAccountId,
        rawVideoKey,
        overlayPosition,
        overlaySize,
        caption: finalCaption,
        postType,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: "PENDING",
      },
    });

    // If posting now (no scheduledAt), enqueue for rendering
    if (!scheduledAt) {
      await autopostRenderQueue.add("render", { scheduledPostId: scheduledPost.id });
    }

    return NextResponse.json({
      scheduledPostId: scheduledPost.id,
      status: "PENDING",
    });
  } catch (error) {
    console.error("POST /autopost/submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
