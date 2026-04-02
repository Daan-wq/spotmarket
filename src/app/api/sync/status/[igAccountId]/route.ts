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
      select: { creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    const account = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    // Return all synced local paths to avoid re-uploading
    const syncedItems = await prisma.contentBuffer.findMany({
      where: { igAccountId, localPath: { not: null } },
      select: { localPath: true, contentType: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    // Coverage stats
    const coverage = await prisma.contentBuffer.groupBy({
      by: ["contentType"],
      where: { igAccountId, status: "QUEUED" },
      _count: true,
    });

    return NextResponse.json({
      syncedPaths: syncedItems.map((i) => i.localPath),
      syncedItems,
      coverage: coverage.map((c) => ({
        contentType: c.contentType,
        queued: c._count,
      })),
    });
  } catch (error) {
    console.error("GET /sync/status/[igAccountId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
