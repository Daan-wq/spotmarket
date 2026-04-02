import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getR2DownloadUrl } from "@/lib/r2";

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
      select: { id: true, creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    // Verify account belongs to creator
    const account = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    const url = new URL(req.url);
    const contentType = url.searchParams.get("contentType");
    const status = url.searchParams.get("status") || "QUEUED";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

    const where: Record<string, unknown> = {
      igAccountId,
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

    // Coverage estimates per content type
    const coverageStats = await prisma.contentBuffer.groupBy({
      by: ["contentType"],
      where: { igAccountId, status: "QUEUED" },
      _count: true,
    });

    return NextResponse.json({
      items: itemsWithUrls,
      total,
      page,
      limit,
      coverage: coverageStats.map((s) => ({
        contentType: s.contentType,
        queued: s._count,
      })),
    });
  } catch (error) {
    console.error("GET /buffer/[igAccountId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
