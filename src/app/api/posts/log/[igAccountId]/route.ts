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
      select: { id: true, creatorProfile: { select: { id: true } } },
    });
    if (!user?.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    const account = await prisma.socialAccount.findUnique({
      where: { id: igAccountId },
      select: { creatorProfileId: true },
    });
    if (!account || account.creatorProfileId !== user.creatorProfile.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = {
      igAccountId,
      creatorId: user.id,
    };
    if (status) where.status = status;

    const [posts, total] = await Promise.all([
      prisma.scheduledPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          campaign: { select: { id: true, name: true } },
          submission: { select: { id: true, status: true, igPermalink: true } },
          sourceSchedule: { select: { id: true, dayOfWeek: true, time: true } },
        },
      }),
      prisma.scheduledPost.count({ where }),
    ]);

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        status: p.status,
        contentType: p.contentType,
        postType: p.postType,
        caption: p.caption.substring(0, 100),
        scheduledAt: p.scheduledAt,
        publishedAt: p.publishedAt,
        igMediaId: p.igMediaId,
        errorMessage: p.errorMessage,
        campaignName: p.campaign?.name || null,
        isOrganic: !p.campaignId,
        submissionStatus: p.submission?.status || null,
        permalink: p.submission?.igPermalink || null,
        sourceSchedule: p.sourceSchedule
          ? { dayOfWeek: p.sourceSchedule.dayOfWeek, time: p.sourceSchedule.time }
          : null,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /posts/log/[igAccountId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
