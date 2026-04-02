import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
  contentType: z.enum(["REEL", "FEED_VIDEO", "FEED_PHOTO", "STORY_VIDEO", "STORY_PHOTO", "CAROUSEL"]).optional(),
  campaignId: z.string().nullable().optional(),
  overlayPosition: z.enum([
    "TOP_LEFT", "TOP_CENTER", "TOP_RIGHT",
    "MIDDLE_LEFT", "CENTER", "MIDDLE_RIGHT",
    "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT",
  ]).nullable().optional(),
  overlaySize: z.enum(["SMALL", "MEDIUM", "LARGE"]).nullable().optional(),
  captionTemplate: z.string().max(2200).nullable().optional(),
  enabled: z.boolean().optional(),
  maxPostsPerDay: z.number().int().min(0).max(50).optional(),
});

async function verifyOwnership(scheduleId: string, authUserId: string) {
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUserId },
    select: { id: true },
  });
  if (!user) return null;

  const schedule = await prisma.postSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, creatorId: true },
  });
  if (!schedule || schedule.creatorId !== user.id) return null;

  return schedule;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const schedule = await verifyOwnership(id, authUser.id);
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const updated = await prisma.postSchedule.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /schedules/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const schedule = await verifyOwnership(id, authUser.id);
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.postSchedule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /schedules/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
