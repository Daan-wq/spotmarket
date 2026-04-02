import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getR2UploadUrl } from "@/lib/r2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const fileSchema = z.object({
  fileName: z.string().min(1),
  fileMimeType: z.string().min(1),
  localPath: z.string().optional(),
});

const schema = z.object({
  igAccountId: z.string().min(1),
  files: z.array(fileSchema).min(2).max(10),
  syncSource: z.enum(["browser_fsa", "desktop_agent"]).default("browser_fsa"),
  setLocalPath: z.string().optional(),
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

    const { igAccountId, files, syncSource, setLocalPath } = parsed.data;

    // Verify account ownership
    const account = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    const carouselSetId = randomUUID();
    const r2Keys: string[] = [];
    const uploadUrls: Array<{ uploadUrl: string; objectKey: string; index: number }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.fileName.split(".").pop() || "jpg";
      const objectKey = `buffer/${igAccountId}/carousels/${carouselSetId}/slide_${String(i).padStart(2, "0")}.${ext}`;
      const uploadUrl = await getR2UploadUrl(objectKey, file.fileMimeType, 3600);
      r2Keys.push(objectKey);
      uploadUrls.push({ uploadUrl, objectKey, index: i });
    }

    // Get next sortOrder
    const lastItem = await prisma.contentBuffer.findFirst({
      where: { igAccountId, contentType: "CAROUSEL" },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    // Create single ContentBuffer entry for the carousel set
    const buffer = await prisma.contentBuffer.create({
      data: {
        igAccountId,
        contentType: "CAROUSEL",
        r2Keys,
        sortOrder: (lastItem?.sortOrder ?? -1) + 1,
        syncSource,
        localPath: setLocalPath,
        carouselSetId,
        status: "QUEUED",
      },
    });

    return NextResponse.json({ carouselSetId, bufferId: buffer.id, uploadUrls });
  } catch (error) {
    console.error("POST /sync/carousel-set error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
