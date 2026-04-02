import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { thumbnailQueue } from "@/lib/queue-client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  igAccountId: z.string().min(1),
  contentType: z.enum(["REEL", "FEED_VIDEO", "FEED_PHOTO", "STORY_VIDEO", "STORY_PHOTO", "CAROUSEL"]),
  r2Keys: z.array(z.string().min(1)).min(1),
  caption: z.string().optional(),
  syncSource: z.enum(["browser_fsa", "desktop_agent", "manual_upload"]).optional(),
  localPath: z.string().optional(),
  carouselSetId: z.string().optional(),
  itemIndex: z.number().int().min(0).max(9).optional(),
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

    const { igAccountId, contentType, r2Keys, caption, syncSource, localPath, carouselSetId, itemIndex } = parsed.data;

    // Verify social account belongs to creator
    const account = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    // Determine next sortOrder
    const lastItem = await prisma.contentBuffer.findFirst({
      where: { igAccountId, contentType },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

    const buffer = await prisma.contentBuffer.create({
      data: {
        igAccountId,
        contentType,
        r2Keys,
        caption,
        sortOrder,
        syncSource: syncSource || "manual_upload",
        localPath,
        carouselSetId,
        itemIndex,
      },
    });

    // Enqueue thumbnail generation for video/image types
    await thumbnailQueue.add("generate-thumbnail", { contentBufferId: buffer.id });

    return NextResponse.json({ id: buffer.id, sortOrder: buffer.sortOrder });
  } catch (error) {
    console.error("POST /buffer/confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
