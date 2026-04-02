import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ igAccountId: string }> },
) {
  try {
    const { igAccountId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 403 });

    // igAccountId param is used as collectionId for backward compat
    const collectionId = igAccountId;
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: "Collection not found" }, { status: 403 });
    }

    // Return all synced local paths to avoid re-uploading
    const syncedItems = await prisma.contentBuffer.findMany({
      where: { collectionId, localPath: { not: null } },
      select: { localPath: true, contentType: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    // Queued count
    const queuedCount = await prisma.contentBuffer.count({
      where: { collectionId, status: "QUEUED" },
    });

    return NextResponse.json({
      syncedPaths: syncedItems.map((i) => i.localPath),
      syncedItems,
      queuedCount,
    });
  } catch (error) {
    console.error("GET /sync/status/[igAccountId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
