import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { deleteR2Object } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function DELETE(
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

    if (buffer.status === "RESERVED") {
      return NextResponse.json({ error: "Cannot delete a reserved buffer item" }, { status: 400 });
    }

    // Delete R2 objects
    for (const key of buffer.r2Keys) {
      try {
        await deleteR2Object(key);
      } catch {
        // R2 deletion is best-effort
      }
    }
    if (buffer.thumbnailKey) {
      try {
        await deleteR2Object(buffer.thumbnailKey);
      } catch {
        // best-effort
      }
    }

    await prisma.contentBuffer.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /buffer/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
