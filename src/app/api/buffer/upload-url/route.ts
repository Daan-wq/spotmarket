import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getR2UploadUrl } from "@/lib/r2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const schema = z.object({
  igAccountId: z.string().min(1),
  contentType: z.enum(["REEL", "FEED_VIDEO", "FEED_PHOTO", "STORY_VIDEO", "STORY_PHOTO", "CAROUSEL"]),
  fileName: z.string().min(1),
  fileMimeType: z.string().min(1),
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

    const { igAccountId, contentType, fileName, fileMimeType } = parsed.data;

    // Verify social account belongs to creator
    const account = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    const ext = fileName.split(".").pop() || "mp4";
    const objectKey = `buffer/${igAccountId}/${contentType.toLowerCase()}/${randomUUID()}.${ext}`;

    const uploadUrl = await getR2UploadUrl(objectKey, fileMimeType, 3600);

    return NextResponse.json({ uploadUrl, objectKey });
  } catch (error) {
    console.error("POST /buffer/upload-url error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
