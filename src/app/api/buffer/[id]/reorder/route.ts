import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  newSortOrder: z.number().int().min(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    // Verify buffer item belongs to creator
    const buffer = await prisma.contentBuffer.findUnique({
      where: { id },
      include: { igAccount: { select: { creatorProfileId: true } } },
    });
    if (!buffer || buffer.igAccount.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.contentBuffer.update({
      where: { id },
      data: { sortOrder: parsed.data.newSortOrder },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /buffer/[id]/reorder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
