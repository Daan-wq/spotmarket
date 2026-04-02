import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const scheduledPost = await prisma.scheduledPost.findFirst({
      where: { id, creatorId: user.id },
      include: {
        submission: {
          select: { igPermalink: true },
        },
      },
    });

    if (!scheduledPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: scheduledPost.id,
      status: scheduledPost.status,
      errorMessage: scheduledPost.errorMessage,
      igPermalink: scheduledPost.submission?.igPermalink || null,
      publishedAt: scheduledPost.publishedAt,
      igMediaId: scheduledPost.igMediaId,
    });
  } catch (error) {
    console.error("GET /autopost/status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
