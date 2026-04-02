import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

    const buffer = await prisma.contentBuffer.findUnique({
      where: { id },
      include: { igAccount: { select: { creatorProfileId: true } } },
    });
    if (!buffer || buffer.igAccount.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Move to back of queue: find max sortOrder and set to max+1
    const maxItem = await prisma.contentBuffer.findFirst({
      where: { igAccountId: buffer.igAccountId, contentType: buffer.contentType },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    await prisma.contentBuffer.update({
      where: { id },
      data: { sortOrder: (maxItem?.sortOrder ?? 0) + 1 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /buffer/[id]/skip error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
