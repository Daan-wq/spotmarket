import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getR2UploadUrl } from "@/lib/r2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const schema = z.object({
  collectionId: z.string().min(1),
  contentType: z.enum(["REEL", "FEED_VIDEO", "FEED_PHOTO", "STORY_VIDEO", "STORY_PHOTO"]),
  fileName: z.string().min(1),
  fileMimeType: z.string().min(1),
  localPath: z.string().optional(),
  syncSource: z.enum(["browser_fsa", "desktop_agent"]).default("browser_fsa"),
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
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { collectionId, contentType, fileName, fileMimeType, localPath, syncSource } = parsed.data;

    // Verify collection ownership
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: "Collection not found" }, { status: 403 });
    }

    // Check if already synced (by localPath)
    if (localPath) {
      const existing = await prisma.contentBuffer.findFirst({
        where: { collectionId, localPath },
      });
      if (existing) {
        return NextResponse.json({ alreadySynced: true, id: existing.id });
      }
    }

    const ext = fileName.split(".").pop() || "mp4";
    const objectKey = `buffer/${user.id}/${randomUUID()}.${ext}`;
    const uploadUrl = await getR2UploadUrl(objectKey, fileMimeType, 3600);

    // Get next sortOrder
    const lastItem = await prisma.contentBuffer.findFirst({
      where: { collectionId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    // Pre-create the buffer record
    const buffer = await prisma.contentBuffer.create({
      data: {
        userId: user.id,
        collectionId,
        contentType,
        r2Key: objectKey,
        filename: fileName,
        sortOrder: (lastItem?.sortOrder ?? -1) + 1,
        syncSource,
        localPath,
        status: "QUEUED",
      },
    });

    return NextResponse.json({ uploadUrl, objectKey, bufferId: buffer.id });
  } catch (error) {
    console.error("POST /sync/file error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
