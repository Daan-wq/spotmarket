import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getR2UploadUrl } from "@/lib/r2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const schema = z.object({
  igAccountId: z.string().min(1),
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
      select: { id: true, creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { igAccountId, contentType, fileName, fileMimeType, localPath, syncSource } = parsed.data;

    // Verify account ownership
    const account = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    // Check if already synced (by localPath)
    if (localPath) {
      const existing = await prisma.contentBuffer.findFirst({
        where: { igAccountId, localPath },
      });
      if (existing) {
        return NextResponse.json({ alreadySynced: true, id: existing.id });
      }
    }

    const ext = fileName.split(".").pop() || "mp4";
    const objectKey = `buffer/${igAccountId}/${contentType.toLowerCase()}/${randomUUID()}.${ext}`;
    const uploadUrl = await getR2UploadUrl(objectKey, fileMimeType, 3600);

    // Get next sortOrder
    const lastItem = await prisma.contentBuffer.findFirst({
      where: { igAccountId, contentType },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    // Pre-create the buffer record
    const buffer = await prisma.contentBuffer.create({
      data: {
        igAccountId,
        contentType,
        r2Keys: [objectKey],
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
