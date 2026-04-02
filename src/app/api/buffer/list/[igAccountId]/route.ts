import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getR2DownloadUrl } from "@/lib/r2";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ igAccountId: string }> },
) {
  try {
    // Route param is still called igAccountId for URL compat — treated as collectionId
    const { igAccountId: collectionId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 403 });

    // Verify collection belongs to user
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: "Collection not found" }, { status: 403 });
    }

    const url = new URL(req.url);
    const contentType = url.searchParams.get("contentType");
    const status = url.searchParams.get("status") || "QUEUED";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

    const where: Record<string, unknown> = {
      collectionId,
      status,
    };
    if (contentType) where.contentType = contentType;

    const [items, total] = await Promise.all([
      prisma.contentBuffer.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contentBuffer.count({ where }),
    ]);

    // Generate signed thumbnail URLs
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => ({
        ...item,
        thumbnailUrl: item.thumbnailKey
          ? await getR2DownloadUrl(item.thumbnailKey, 3600)
          : null,
      })),
    );

    // Total queued items in this collection
    const queuedCount = await prisma.contentBuffer.count({
      where: { collectionId, status: "QUEUED" },
    });

    return NextResponse.json({
      items: itemsWithUrls,
      total,
      page,
      limit,
      queuedCount,
    });
  } catch (error) {
    console.error("GET /buffer/list/[collectionId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
