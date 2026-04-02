import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  igAccountId: z.string().min(1),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  timezone: z.string().min(1),
  contentType: z.enum(["REEL", "FEED_VIDEO", "FEED_PHOTO", "STORY_VIDEO", "STORY_PHOTO", "CAROUSEL"]),
  campaignId: z.string().optional(),
  overlayPosition: z.enum([
    "TOP_LEFT", "TOP_CENTER", "TOP_RIGHT",
    "MIDDLE_LEFT", "CENTER", "MIDDLE_RIGHT",
    "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT",
  ]).optional(),
  overlaySize: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional(),
  captionTemplate: z.string().max(2200).optional(),
  maxPostsPerDay: z.number().int().min(0).max(50).default(0),
});

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;

    // Verify social account belongs to creator
    const account = await prisma.socialAccount.findUnique({
      where: { id: data.igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    // If campaign specified, verify it's active and creator has approved application
    if (data.campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: data.campaignId },
        select: { status: true },
      });
      if (!campaign || campaign.status !== "active") {
        return NextResponse.json({ error: "Campaign not active" }, { status: 400 });
      }

      const application = await prisma.campaignApplication.findFirst({
        where: {
          campaignId: data.campaignId,
          creatorProfileId: user.creatorProfile.id,
          status: "approved",
        },
      });
      if (!application) {
        return NextResponse.json({ error: "No approved application for this campaign" }, { status: 403 });
      }

      // Overlay is required for campaign posts
      if (!data.overlayPosition || !data.overlaySize) {
        return NextResponse.json({ error: "Overlay position and size required for campaign posts" }, { status: 400 });
      }
    }

    const schedule = await prisma.postSchedule.create({
      data: {
        igAccountId: data.igAccountId,
        creatorId: user.id,
        dayOfWeek: data.dayOfWeek,
        time: data.time,
        timezone: data.timezone,
        contentType: data.contentType,
        campaignId: data.campaignId || null,
        overlayPosition: data.overlayPosition || null,
        overlaySize: data.overlaySize || null,
        captionTemplate: data.captionTemplate || null,
        maxPostsPerDay: data.maxPostsPerDay,
      },
    });

    return NextResponse.json({ id: schedule.id });
  } catch (error) {
    console.error("POST /schedules error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
