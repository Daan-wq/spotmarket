import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const schema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum(["video/mp4", "video/quicktime"]),
  fileSize: z.number().max(500 * 1024 * 1024),
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
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const objectKey = `raw/${user.id}/${randomUUID()}.mp4`;
    const adminClient = createSupabaseAdminClient();

    const { data, error } = await adminClient.storage
      .from("campaign-videos")
      .createSignedUploadUrl(objectKey);

    if (error || !data) {
      console.error("Signed upload URL error:", error);
      return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      objectKey,
      token: data.token,
    });
  } catch (error) {
    console.error("POST /autopost/upload-url error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
