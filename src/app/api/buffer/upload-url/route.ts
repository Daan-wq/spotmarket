import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getR2UploadUrl } from "@/lib/r2";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const schema = z.object({
  collectionId: z.string().min(1),
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
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const { collectionId, fileName, fileMimeType } = parsed.data;

    // Verify collection belongs to user
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: "Collection not found" }, { status: 403 });
    }

    const ext = fileName.split(".").pop() || "mp4";
    const objectKey = `buffer/${user.id}/${randomUUID()}.${ext}`;

    const uploadUrl = await getR2UploadUrl(objectKey, fileMimeType, 3600);

    return NextResponse.json({ uploadUrl, objectKey });
  } catch (error) {
    console.error("POST /buffer/upload-url error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
