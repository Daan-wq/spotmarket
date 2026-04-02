import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  objectKey: z.string().min(1),
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

    const { objectKey } = parsed.data;
    const adminClient = createSupabaseAdminClient();

    const { data, error } = await adminClient.storage
      .from("campaign-videos")
      .list("raw", { search: objectKey });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      objectKey,
    });
  } catch (error) {
    console.error("POST /autopost/validate-video error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
