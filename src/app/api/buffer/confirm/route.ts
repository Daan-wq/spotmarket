import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { thumbnailQueue } from "@/lib/queue-client";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  collectionId: z.string().min(1),
  contentType: z.enum(["REEL", "FEED_VIDEO", "FEED_PHOTO", "STORY_VIDEO", "STORY_PHOTO", "CAROUSEL"]),
  r2Key: z.string().min(1),
  filename: z.string().optional(),
  fileHash: z.string().optional(),
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
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const { collectionId, contentType, r2Key, filename, fileHash, caption, syncSource, localPath, carouselSetId, itemIndex } = parsed.data;

    // Verify collection belongs to user
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: "Collection not found" }, { status: 403 });
    }

    // Check for duplicate file hash
    if (fileHash) {
      const duplicate = await prisma.contentBuffer.findFirst({
        where: { userId: user.id, fileHash },
        select: { id: true, collection: { select: { name: true } } },
      });
      if (duplicate) {
        return NextResponse.json({
          warning: "duplicate",
          existingCollectionName: duplicate.collection.name,
          existingId: duplicate.id,
        });
      }
    }

    // Determine next sortOrder within collection
    const lastItem = await prisma.contentBuffer.findFirst({
      where: { collectionId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

    const buffer = await prisma.contentBuffer.create({
      data: {
        userId: user.id,
        collectionId,
        contentType,
        r2Key,
        filename,
        fileHash,
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
