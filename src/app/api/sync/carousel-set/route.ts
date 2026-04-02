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
  collectionId: z.string().min(1),
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
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const { collectionId, files, syncSource, setLocalPath } = parsed.data;

    // Verify collection ownership
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: "Collection not found" }, { status: 403 });
    }

    const carouselSetId = randomUUID();
    const uploadUrls: Array<{ uploadUrl: string; objectKey: string; index: number }> = [];
    const bufferIds: string[] = [];

    // Get next sortOrder
    const lastItem = await prisma.contentBuffer.findFirst({
      where: { collectionId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const baseSortOrder = (lastItem?.sortOrder ?? -1) + 1;

    // Create one ContentBuffer per slide (singular r2Key)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.fileName.split(".").pop() || "jpg";
      const objectKey = `buffer/${user.id}/${randomUUID()}.${ext}`;
      const uploadUrl = await getR2UploadUrl(objectKey, file.fileMimeType, 3600);
      uploadUrls.push({ uploadUrl, objectKey, index: i });

      const buffer = await prisma.contentBuffer.create({
        data: {
          userId: user.id,
          collectionId,
          contentType: "CAROUSEL",
          r2Key: objectKey,
          filename: file.fileName,
          sortOrder: baseSortOrder,
          syncSource,
          localPath: file.localPath || setLocalPath,
          carouselSetId,
          itemIndex: i,
          status: "QUEUED",
        },
      });
      bufferIds.push(buffer.id);
    }

    return NextResponse.json({ carouselSetId, bufferIds, uploadUrls });
  } catch (error) {
    console.error("POST /sync/carousel-set error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
